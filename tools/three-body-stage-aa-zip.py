"""Read-only ZIP CRC and exact extracted file set/size/SHA verification."""
import hashlib, json, pathlib, stat, sys, zipfile
archive, destination = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
rows=[]
with zipfile.ZipFile(archive) as z:
    if z.testzip(): raise RuntimeError('CRC')
    entries=[i for i in z.infolist() if not i.is_dir()]
    if len({i.filename for i in entries}) != len(entries): raise RuntimeError('DUPLICATE_ENTRY')
    for i in entries:
        p=pathlib.PurePosixPath(i.filename)
        if p.is_absolute() or '..' in p.parts or '\\' in i.filename or stat.S_ISLNK(i.external_attr>>16): raise RuntimeError('ZIP_PATH')
        actual=destination.joinpath(*p.parts)
        if actual.is_symlink() or not actual.is_file(): raise RuntimeError('MISSING_FILE')
        b=z.read(i.filename); c=actual.read_bytes()
        if len(b)!=len(c) or hashlib.sha256(b).digest()!=hashlib.sha256(c).digest(): raise RuntimeError('FILE_BYTES')
        rows.append(i.filename)
actual=[]
for p in destination.rglob('*'):
    if p.is_symlink(): raise RuntimeError('SYMLINK')
    if p.is_file(): actual.append(p.relative_to(destination).as_posix())
if sorted(rows)!=sorted(actual): raise RuntimeError('FILE_SET')
print(json.dumps({'status':'PASS','files':len(rows),'zipSha256':hashlib.sha256(archive.read_bytes()).hexdigest()}))
