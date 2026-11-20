// Private Windows archive. Config/manifests remain outside public evidence exports.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const inside = (root, candidate) => {
  const a = path.resolve(root).toLowerCase(), b = path.resolve(candidate).toLowerCase();
  return b === a || b.startsWith(a + path.sep);
};
export function filesBelow(root) {
  if (fs.lstatSync(root).isSymbolicLink()) throw Error('REPARSE_POINT');
  return fs.readdirSync(root, { withFileTypes: true }).flatMap(e => {
    const file = path.join(root, e.name);
    if (e.isSymbolicLink()) throw Error('REPARSE_POINT');
    return e.isDirectory() ? filesBelow(file) : e.isFile() ? [file] : (() => { throw Error('UNSUPPORTED_FILE_TYPE'); })();
  });
}
export async function fileIdentity(file) {
  const hash = createHash('sha256'); let size = 0;
  for await (const bytes of fs.createReadStream(file)) { hash.update(bytes); size += bytes.length; }
  return { size, sha256: hash.digest('hex') };
}
const stamp = () => { const utc = new Date(); return { utc: utc.toISOString(), jst: new Date(utc.valueOf() + 9 * 3600000).toISOString().replace('Z', '+09:00') }; };
const same = (a, b) => a.size === b.size && a.sha256 === b.sha256;
const sha = value => createHash('sha256').update(value).digest('hex');

export async function archiveEvidence(config, { inventoryOnly = false, freeBytes = null } = {}) {
  if (process.platform !== 'win32') throw Error('BACKUP_BLOCKED_NOT_WINDOWS');
  return copyAndVerify(config, { inventoryOnly, freeBytes });
}
// Portable core for temporary-fixture negative controls. The archive CLI above
// requires Windows, so a Linux directory cannot masquerade as the approved path.
export async function copyAndVerify(config, { inventoryOnly = false, freeBytes = null } = {}) {
  const repo = fs.realpathSync(config.repositoryRoot), approved = fs.realpathSync(config.approvedRoot);
  const archive = path.resolve(approved, config.archiveRelative);
  if (!inside(approved, archive) || inside(repo, archive) || inside(archive, repo)) throw Error('UNSAFE_ARCHIVE_ROOT');
  if (fs.existsSync(archive) && !inside(approved, fs.realpathSync(archive))) throw Error('REPARSE_ARCHIVE_ROOT');
  const stages = config.stageNames ?? ['stage-p', 'stage-q', 'stage-r', 'stage-s'];
  if (!Array.isArray(stages) || !stages.length || new Set(stages).size !== stages.length || stages.some(s => !/^stage-[a-z]+$/.test(s))) throw Error('INVALID_STAGE_NAMES');
  const rows = [], scopes = [];
  for (const stage of stages) {
    const roots = config.stages[stage];
    if (!Array.isArray(roots) || !roots.length) throw Error('MISSING_STAGE_SCOPE');
    for (const relative of roots) {
      const source = path.resolve(repo, relative);
      if (!inside(repo, source) || !fs.existsSync(source)) throw Error('MISSING_OR_UNSAFE_SOURCE');
      const real = fs.realpathSync(source);
      if (!inside(repo, real)) throw Error('REPARSE_SOURCE_ROOT');
      const files = filesBelow(source);
      if (!files.length) throw Error('EMPTY_SOURCE_SCOPE');
      scopes.push({ stage, relative, files: files.length });
      for (const file of files) {
        const sourceRelative = path.relative(repo, file).replaceAll('\\', '/');
        rows.push({ stage, sourceRelative, archiveRelative: stage + '/' + sourceRelative, status: 'PLANNED', ...(await fileIdentity(file)) });
      }
    }
  }
  if (new Set(rows.map(r => r.archiveRelative.toLowerCase())).size !== rows.length) throw Error('DUPLICATE_SCOPE');
  const sourceBytes = rows.reduce((sum, r) => sum + r.size, 0);
  const disk = fs.statfsSync(approved, { bigint: true }), available = freeBytes ?? disk.bavail * disk.bsize;
  if (available < BigInt(sourceBytes) + BigInt(config.reserveBytes ?? 2147483648)) throw Error('INSUFFICIENT_CAPACITY');
  const result = { repository: config.repository, pr: config.pr, head: config.head, created: stamp(),
    sourceBytes, availableBytes: String(available), scopes, rows, status: 'INVENTORIED', remote: 'REMOTE_BACKUP_NOT_UPLOADED' };
  if (inventoryOnly) return result;
  fs.mkdirSync(archive, { recursive: true });
  if (!inside(approved, fs.realpathSync(archive))) throw Error('REPARSE_ARCHIVE_ROOT');
  const expected = new Set(rows.map(r => r.archiveRelative.toLowerCase()));
  for (const stage of stages) {
    const dir = path.join(archive, stage);
    if (fs.existsSync(dir)) for (const file of filesBelow(dir)) {
      if (!expected.has(path.relative(archive, file).replaceAll('\\', '/').toLowerCase())) throw Error('EXTRA_DESTINATION_FILE');
    }
  }
  // Preflight every collision before making any evidence copy.
  for (const row of rows) {
    const target = path.join(archive, row.archiveRelative);
    if (fs.existsSync(target)) {
      if (!inside(archive, fs.realpathSync(target)) || !same(row, await fileIdentity(target))) throw Error('DESTINATION_COLLISION');
      row.disposition = 'REUSED_IDENTICAL';
    }
  }
  const manifests = path.join(archive, 'manifests'); fs.mkdirSync(manifests, { recursive: true });
  const run = result.created.utc.replaceAll(/[-:.]/g, '') + '-' + config.head.slice(0, 12);
  const journal = path.join(manifests, run + '-journal.jsonl'); fs.writeFileSync(journal, '', { flag: 'wx' });
  try {
    for (const row of rows) {
      const source = path.join(repo, row.sourceRelative), target = path.join(archive, row.archiveRelative);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      if (!inside(archive, fs.realpathSync(path.dirname(target)))) throw Error('REPARSE_DESTINATION_PARENT');
      if (!row.disposition) { fs.copyFileSync(source, target, fs.constants.COPYFILE_EXCL); row.disposition = 'COPIED_EXCLUSIVE'; row.copied = stamp(); }
      row.status = 'COPIED_NOT_VERIFIED';
      fs.appendFileSync(journal, JSON.stringify(row) + '\n');
    }
    const actual = stages.flatMap(stage => filesBelow(path.join(archive, stage)).map(file => path.relative(archive, file).replaceAll('\\', '/').toLowerCase()));
    if (actual.length !== expected.size || actual.some(file => !expected.has(file))) throw Error('DESTINATION_FILE_SET');
    for (const scope of scopes) {
      const current = filesBelow(path.join(repo, scope.relative)).map(file => path.relative(repo, file).replaceAll('\\', '/'));
      const planned = rows.filter(row => row.stage === scope.stage && inside(path.join(repo, scope.relative), path.join(repo, row.sourceRelative))).map(row => row.sourceRelative);
      if (current.length !== planned.length || current.some(file => !planned.includes(file))) throw Error('SOURCE_FILE_SET_CHANGED');
    }
    for (const row of rows) {
      const freshSource = await fileIdentity(path.join(repo, row.sourceRelative));
      const backup = await fileIdentity(path.join(archive, row.archiveRelative));
      row.verified = stamp(); row.status = same(row, freshSource) && same(row, backup) ? 'VERIFIED' : 'HASH_OR_SIZE_MISMATCH';
      fs.appendFileSync(journal, JSON.stringify(row) + '\n');
      if (row.status !== 'VERIFIED') throw Error('HASH_OR_SIZE_MISMATCH');
    }
    result.status = 'LOCAL_BACKUP_VERIFIED';
  } catch (error) { result.status = 'BACKUP_NOT_VERIFIED'; result.error = String(error); }
  result.finished = stamp();
  result.stages = stages.map(stage => {
    const files = rows.filter(row => row.stage === stage);
    return { stage, files: files.length, bytes: files.reduce((s, r) => s + r.size, 0), status: files.every(r => r.status === 'VERIFIED') ? 'LOCAL_BACKUP_VERIFIED' : 'BACKUP_NOT_VERIFIED' };
  });
  result.collectionSha256 = sha(JSON.stringify(rows.map(({ stage, sourceRelative, size, sha256 }) => ({ stage, sourceRelative, size, sha256 })).sort((a,b) => a.sourceRelative.localeCompare(b.sourceRelative))));
  fs.writeFileSync(path.join(manifests, run + '-manifest.json'), JSON.stringify(result, null, 2), { flag: 'wx' });
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const config = JSON.parse(fs.readFileSync(process.argv[2], 'utf8').replace(/^\uFEFF/, ''));
  let result;
  try { result = await archiveEvidence(config, { inventoryOnly: process.argv.includes('--inventory') }); }
  catch (error) {
    // Preflight failures are retained privately too. Never expose a filesystem
    // exception (which may contain a personal path) in the public summary.
    result = { repository: config.repository, pr: config.pr, head: config.head,
      status: 'BACKUP_NOT_VERIFIED', created: stamp(), rows: [], remote: 'REMOTE_BACKUP_NOT_UPLOADED' };
    fs.writeFileSync(config.summaryFile + '.private-error.json', JSON.stringify({ ...result, error: String(error), config }, null, 2));
  }
  // Public summary deliberately excludes absolute/relative source and archive paths.
  const summary = { repository: result.repository, pr: result.pr, head: result.head, status: result.status,
    files: result.rows.length, bytes: result.sourceBytes, availableBytes: result.availableBytes, stages: result.stages,
    collectionSha256: result.collectionSha256, created: result.created, finished: result.finished, remote: result.remote };
  fs.writeFileSync(config.summaryFile, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary));
  if (!['LOCAL_BACKUP_VERIFIED','INVENTORIED'].includes(result.status)) process.exitCode = 1;
}
