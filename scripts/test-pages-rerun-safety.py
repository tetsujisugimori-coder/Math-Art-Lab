#!/usr/bin/env python3
"""Run the Pages workflow's shell steps with fixtures and no network credentials."""

import copy
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import zipfile

import yaml


SHA = "a" * 40
OTHER_SHA = "b" * 40
RUN = "456"
REPO = "example/isolated"
API = "https://api.invalid"
PAGE_URL = "https://example.invalid/site/"
CONTENTS = b"<!doctype html><title>Pages test</title>\n"


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def archive(path, additional_file=False, changed_bytes=False):
    with zipfile.ZipFile(path, "w") as output:
        output.writestr("index.html", CONTENTS)
        if additional_file:
            output.writestr("extra.txt", b"different file set")
        if changed_bytes:
            output.comment = b"different ZIP bytes with the same file set"
    return sha256(path.read_bytes())


def paginated(key, *pages):
    count = sum(map(len, pages))
    return [{"total_count": count, key: page} for page in pages]


def artifact(name, artifact_id, digest, **overrides):
    return {"name": name, "id": artifact_id, "digest": "sha256:" + digest,
            "expired": False, "workflow_run": {"id": int(RUN), "head_sha": SHA},
            **overrides}


def previous_job(attempt, **overrides):
    return {"name": "Deploy to GitHub Pages", "id": 50 + attempt,
            "run_id": int(RUN), "run_attempt": attempt,
            "status": "completed", "conclusion": "failure",
            "steps": [{"name": "Deploy Pages", "status": "completed", "conclusion": "skipped"}],
            **overrides}


def handle_fixture_command(command, args):
    fixture = json.loads(Path("fixture.json").read_text())
    if command == "gh":
        if args == ["api", f"repos/{REPO}/git/ref/heads/main", "--jq", ".object.sha"]:
            if fixture["main"] is None:
                sys.exit(22)
            print(fixture["main"])
            return
        assert args[:3] == ["api", "--paginate", "--slurp"], args
        assert len(args) == 4 and args[3].endswith("?per_page=100"), args
        endpoint = args[3].split("?")[0]
        prefix = f"repos/{REPO}/actions/runs/{RUN}/"
        assert endpoint.startswith(prefix), endpoint
        if endpoint == prefix + "artifacts":
            pages = fixture["artifacts"]
        else:
            resource, attempt, kind = endpoint.removeprefix(prefix).split("/")
            assert (resource, kind) == ("attempts", "jobs"), endpoint
            pages = fixture["jobs"][attempt]
        if pages is None:
            sys.exit(22)
        print(json.dumps(pages))
        return

    endpoint = f"{API}/repos/{REPO}/pages/deployments"
    if args[-1] == "https://oidc.invalid/token":
        print(json.dumps({"value": fixture.get("oidc", "fixture-token")}))
    elif args[-1] == endpoint:
        assert "--retry" not in args and "--location" not in args, args
        assert "--data-binary" in args, args
        payload = json.load(sys.stdin)
        with Path("submissions.jsonl").open("a") as submissions:
            print(json.dumps(payload), file=submissions)
        if fixture.get("lost_reply"):
            sys.exit(28)
        print(json.dumps(fixture.get("response", {"id": "deploy-1", "page_url": PAGE_URL})))
    elif args[-1] == f"{endpoint}/deploy-1":
        print(json.dumps({"status": fixture.get("status", "succeed")}))
    else:
        raise AssertionError(args)


def read_workflow(path):
    workflow = yaml.load(path.read_text(), Loader=yaml.BaseLoader)
    deploy = workflow["jobs"]["deploy"]
    assert deploy["if"] == (
        "github.ref == 'refs/heads/main' && "
        "(github.event_name == 'push' || github.event_name == 'workflow_dispatch')"
    )
    assert deploy["needs"] == "validate"
    assert deploy["permissions"] == {"contents": "read", "actions": "read",
                                       "pages": "write", "id-token": "write"}
    assert deploy["environment"]["name"] == "github-pages"
    assert deploy["concurrency"] == {"group": "github-pages", "cancel-in-progress": "false"}
    assert deploy["env"]["PAGES_NAME"] == "github-pages-${{ github.run_id }}-${{ github.run_attempt }}"
    steps = {step["name"]: step for step in deploy["steps"]}
    download = steps["Download validated build"]["with"]
    assert download["artifact-ids"] == "${{ needs.validate.outputs.build-id }}"
    return deploy, steps


def exercise(path):
    deploy, steps = read_workflow(path)
    fixed = "run" in steps["Deploy Pages"]
    stamp = "Verify Pages artifact identity" if fixed else "Verify Pages artifact and current main"
    with tempfile.TemporaryDirectory(prefix="pages-tests-", dir=Path.cwd()) as area:
        root = Path(area)
        binaries = root / "bin"
        binaries.mkdir()
        script = Path(__file__).resolve()
        # Only the workflow's local tools are reachable via PATH. Network-facing tools
        # resolve to this test process, and the subprocess receives a clean environment.
        for command in ("jq", "find", "sort", "xargs", "sha256sum", "cut", "mkdir", "unzip", "sleep"):
            (binaries / command).symlink_to(shutil.which(command))
        for command in ("gh", "curl"):
            wrapper = binaries / command
            wrapper.write_text(f'#!/bin/bash\nexec "{sys.executable}" "{script}" --fixture {command} "$@"\n')
            wrapper.chmod(0o700)

        cases = []

        def run(name, stop=None, *, attempt=1, build_attempt=1, build_id=101,
                pages_id=201, modified_archive=False, altered_tree=False,
                submitted=False, page_url=PAGE_URL, mutator=None):
            work = root / str(len(cases))
            work.mkdir()
            raw = work / "validated.zip"
            digest = archive(raw, altered_tree, modified_archive)
            build_digest = archive(work / "original.zip") if modified_archive else digest
            tree_digest = sha256(f"{sha256(CONTENTS)}  ./index.html\n".encode())
            build_name = f"validated-dist-{RUN}-{build_attempt}"
            pages_name = f"github-pages-{RUN}-{attempt}"
            fixture = {"main": SHA, "jobs": {}, "artifacts": []}
            for old in range(1, attempt):
                fixture["jobs"][str(old)] = paginated("jobs", [previous_job(old)])
            build = artifact(build_name, build_id, build_digest)
            pages = artifact(pages_name, pages_id, "f" * 64)
            fixture["artifacts"] = paginated("artifacts", [build, pages])
            env = {"PATH": str(binaries), "LANG": "C.UTF-8", "GH_TOKEN": "fixture",
                   "GITHUB_REPOSITORY": REPO, "GITHUB_RUN_ID": RUN, "GITHUB_SHA": SHA,
                   "GITHUB_API_URL": API, "GITHUB_RUN_ATTEMPT": str(attempt),
                   "GITHUB_OUTPUT": str(work / "output"), "BUILD_ID": str(build_id),
                   "BUILD_ATTEMPT": str(build_attempt), "BUILD_DIGEST": build_digest,
                   "BUILD_TREE_DIGEST": tree_digest, "PAGES_NAME": pages_name,
                   "PAGES_ID": str(pages_id), "ACTIONS_ID_TOKEN_REQUEST_TOKEN": "fixture",
                   "ACTIONS_ID_TOKEN_REQUEST_URL": "https://oidc.invalid/token",
                   "CHECK_PAGINATION": deploy["env"].get("CHECK_PAGINATION", "")}
            if mutator:
                mutator(fixture, env, build, pages)
            (work / "fixture.json").write_text(json.dumps(fixture))
            if fixed:
                (work / "validated-archive").mkdir()
                shutil.move(raw, work / "validated-archive/archive.zip")
            else:
                with zipfile.ZipFile(raw) as data:
                    data.extractall(work / "dist")
            checks = ["Verify retry eligibility", "Verify validated artifact identity",
                      "Verify downloaded build tree", stamp]
            if fixed:
                checks.append("Deploy Pages")
            stopped = None
            detail = ""
            for check in checks:
                proc = subprocess.run(["/bin/bash", "--noprofile", "--norc", "-eo", "pipefail",
                                       "-c", steps[check]["run"]], cwd=work, env=env,
                                      text=True, capture_output=True, timeout=8)
                if proc.returncode:
                    stopped = check
                    detail = (proc.stdout + proc.stderr).strip()
                    break
            log = work / "submissions.jsonl"
            payloads = [json.loads(line) for line in log.read_text().splitlines()] if log.exists() else []
            expect_post = fixed and (submitted or stop is None)
            payload = {"artifact_id": pages_id, "pages_build_version": SHA, "oidc_token": "fixture-token"}
            okay = stopped == stop and payloads == ([payload] if expect_post else [])
            if stop is None and fixed:
                output = work / "output"
                expected_output = f"page_url={page_url}\n" if page_url else ""
                actual_output = output.read_text() if output.exists() else ""
                okay &= actual_output == expected_output
            cases.append(okay)
            print(f"{'PASS' if okay else 'FAIL'} {name} | stop={stopped} | submissions={len(payloads)}")
            if not okay:
                print(f"  expected stop={stop}; expected submission={expect_post}; {detail}")

        retry = "Verify retry eligibility"
        validated = "Verify validated artifact identity"
        tree = "Verify downloaded build tree"
        main = "Deploy Pages" if fixed else stamp
        run("initial attempt")
        run("deploy-only rerun reuses Validate attempt 1", attempt=2)
        run("all-jobs rerun uses Validate attempt 2", attempt=2, build_attempt=2, build_id=102)
        run("previous attempts' names coexist on separate pages", attempt=3, build_attempt=3, build_id=103,
            pages_id=203, mutator=lambda f, e, b, p: f.update(artifacts=paginated("artifacts", [
                artifact(f"validated-dist-{RUN}-1", 101, "a" * 64),
                artifact(f"github-pages-{RUN}-2", 202, "b" * 64)], [b], [p])))
        run("skipped prior job is safe to rerun", attempt=2,
            mutator=lambda f, e, b, p: f["jobs"].update({"1": paginated("jobs", [
                previous_job(1, conclusion="skipped", steps=[])])}))
        run("prior job from later API page", attempt=2,
            mutator=lambda f, e, b, p: f["jobs"].update({"1": paginated("jobs",
                [{"id": 998, "name": "Validate"}], [previous_job(1)])}))
        run("validated artifact absent", validated,
            mutator=lambda f, e, b, p: f.update(artifacts=paginated("artifacts", [p])))
        for target, check in (("validated", validated), ("Pages", stamp)):
            def unset(field):
                return lambda f, e, b, p: (b if target == "validated" else p).pop(field)

            def set_field(field, value):
                return lambda f, e, b, p: (b if target == "validated" else p).update({field: value})

            def duplicate(f, e, b, p):
                conflicting = copy.deepcopy(b if target == "validated" else p)
                conflicting["id"] += 1000
                f["artifacts"] = paginated("artifacts", [b, p], [conflicting])

            run(f"{target} duplicate on later API page", check, mutator=duplicate)
            run(f"{target} artifact ID mismatch", check, mutator=set_field("id", 991))
            run(f"{target} wrong Run ID", check, mutator=set_field("workflow_run", {"id": 9, "head_sha": SHA}))
            run(f"{target} wrong commit", check, mutator=set_field("workflow_run", {"id": int(RUN), "head_sha": OTHER_SHA}))
            run(f"{target} expired artifact", check, mutator=set_field("expired", True))
            run(f"{target} missing digest", check, mutator=unset("digest"))
        run("Pages artifact absent", stamp,
            mutator=lambda f, e, b, p: f.update(artifacts=paginated("artifacts", [b])))
        run("validated REST digest mismatch", validated,
            mutator=lambda f, e, b, p: b.update(digest="sha256:" + "f" * 64))
        run("validated output missing SHA-256", validated,
            mutator=lambda f, e, b, p: e.update(BUILD_DIGEST=""))
        run("validated raw ZIP digest mismatch", tree, modified_archive=True)
        run("different unpacked file set with valid ZIP digest", tree, altered_tree=True)
        run("validation from a future attempt", validated, build_attempt=2)
        run("artifact REST request fails", validated,
            mutator=lambda f, e, b, p: f.update(artifacts=None))
        run("artifact API silently loses a later page", validated,
            mutator=lambda f, e, b, p: f["artifacts"][0].update(total_count=3))
        run("job API silently loses a later page", retry, attempt=2,
            mutator=lambda f, e, b, p: f["jobs"]["1"][0].update(total_count=2))
        run("job API returns duplicate ID instead of a later job", retry, attempt=2,
            mutator=lambda f, e, b, p: f["jobs"].update({"1": paginated("jobs", [previous_job(1)],
                [{"name": "Validate", "id": 51}])}))
        run("previous job API fails", retry, attempt=2,
            mutator=lambda f, e, b, p: f["jobs"].update({"1": None}))
        run("prior deploy job missing", retry, attempt=2,
            mutator=lambda f, e, b, p: f["jobs"].update({"1": paginated("jobs", [])}))
        run("prior deploy step missing", retry, attempt=2,
            mutator=lambda f, e, b, p: f["jobs"]["1"][0]["jobs"][0].update(steps=[]))
        run("prior job marked skipped but deployment ran", retry, attempt=2,
            mutator=lambda f, e, b, p: f["jobs"]["1"][0]["jobs"][0].update(conclusion="skipped", steps=[
                {"name": "Deploy Pages", "status": "completed", "conclusion": "success"}]))
        run("prior skipped job has malformed step history", retry, attempt=2,
            mutator=lambda f, e, b, p: f["jobs"]["1"][0]["jobs"][0].update(conclusion="skipped", steps=False))
        run("prior deploy job belongs to another attempt", retry, attempt=2,
            mutator=lambda f, e, b, p: f["jobs"]["1"][0]["jobs"][0].update(run_attempt=2))
        for conclusion in ("failure", "cancelled", "success"):
            run(f"prior deployment entered, step was {conclusion}", retry, attempt=2,
                mutator=lambda f, e, b, p: f["jobs"]["1"][0]["jobs"][0]["steps"][0].update(conclusion=conclusion))
        run("main advanced before submission", main,
            mutator=lambda f, e, b, p: f.update(main=OTHER_SHA))
        run("main reference API fails", main,
            mutator=lambda f, e, b, p: f.update(main=None))
        if fixed:
            run("confirmed success without display URL", page_url=None,
                mutator=lambda f, e, b, p: f.update(response={"id": "deploy-1"}))
            run("confirmed success with a bare hostname display URL", page_url=None,
                mutator=lambda f, e, b, p: f.update(response={"id": "deploy-1", "page_url": "example.invalid"}))
            run("OIDC response missing token", main, mutator=lambda f, e, b, p: f.update(oidc=None))
            run("response lost after submission, no resend", main, submitted=True,
                mutator=lambda f, e, b, p: f.update(lost_reply=True))
            run("acknowledgement missing deployment ID, no resend", main, submitted=True,
                mutator=lambda f, e, b, p: f.update(response={"page_url": PAGE_URL}))
            run("terminal Pages failure, no resend", main, submitted=True,
                mutator=lambda f, e, b, p: f.update(status="deployment_failed"))
        print(f"{sum(cases)}/{len(cases)} executed workflow cases passed. Deployment job scope/permissions statically matched.")
        return all(cases)


if __name__ == "__main__":
    if sys.argv[1:2] == ["--fixture"]:
        handle_fixture_command(sys.argv[2], sys.argv[3:])
    else:
        workflow_path = Path(sys.argv[1] if len(sys.argv) > 1 else ".github/workflows/deploy-pages.yml")
        sys.exit(not exercise(workflow_path))
