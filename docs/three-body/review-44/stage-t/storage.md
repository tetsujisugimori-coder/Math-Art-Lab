# Stage T storage

Actual Windows local archive: source/backup file sets, sizes and SHA-256 were independently reread after exclusive, non-destructive copying. Approved location and complete per-file manifests are private; no personal absolute paths are published here.

| Stage | Files | Bytes | Status |
|---|---:|---:|---|
| P | 1088 | 524843503 | LOCAL_BACKUP_VERIFIED |
| Q | 1990 | 870072549 | LOCAL_BACKUP_VERIFIED |
| R | 3182 | 1977346404 | LOCAL_BACKUP_VERIFIED |
| S | 3922 | 2321020132 | LOCAL_BACKUP_VERIFIED |
| Total | 10182 | 5693282588 | LOCAL_BACKUP_VERIFIED |

Collection SHA-256 (canonical ordered identity rows): `1967f1b9bbea6de64509dc42b9bdbe35dabaebbd0e0b6115a9455ace2055763b`.

Scope: P is the canonical tracked Stage P tree, including compressed original data. Q/R include their isolated stage trees, CI acquisitions, submission records and tracked stage documents; S includes its isolated tree (submission nested there), CI acquisitions and tracked stage documents. Hierarchy is preserved within each stage. This is the set of available files, not a claim to recover previously unavailable artifacts. No old evidence was overwritten, moved or deleted. Git preservation remains.

`REMOTE_BACKUP_NOT_UPLOADED`: local duplication is not an independent remote copy. Actions artifacts have finite API expiry; requested retention is not permanent preservation. New Stage T raw/trace data stays in isolated local/CI storage. Small anonymous summaries, source versions and indices are preferred in Git. Artifact IDs, actual expires_at, digest and acquisition status will be read back from the final CI and recorded in the PR submission. A missing acquisition remains NOT_DOWNLOADED/NOT_UPLOADED.

## Independent archive readback

A separate Node process freshly enumerated both file sets and streamed both sides' SHA-256. At2026-11-11T11:02:05.353Z it verified10182 files /5693282588 bytes, mismatch0. Private manifest SHA-256: `b3ef716f164847f58fd274ffd654257b1011f8453fc86baadbd9faaa2a5af11c`. Anonymous result is included under raw-results. Original source paths remain private. New Stage T acquisitions will receive a separately scoped local archive checkpoint after final CI acquisition; old stage folders/manifests are not overwritten.

New Stage T raw-results/sources/screenshots use narrowly scoped Git `-text` attributes so checkout EOL conversion cannot change their SHA-256. No existing stage, history or LFS setting is altered. Review copies total84 indexed files /4152899 bytes; known credential patterns and personal-path candidates0. This is not a general DLP guarantee. Exact raw evidence remains private; anonymous transformed logs identify the original SHA separately.

Exact source snapshots retain their original CR/EOF bytes. `git diff --check` consequently reports whitespace in those evidence copies; they are deliberately not normalized because their names and index cover exact SHA-256. Editable product/diagnostic files are checked separately. The source snapshot warning is distinct from test, acquisition and integrity failures.
