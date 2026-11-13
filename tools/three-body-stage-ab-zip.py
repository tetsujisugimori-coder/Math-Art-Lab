"""Bounded, no-overwrite ZIP extraction and separate-process byte verification."""
import hashlib,json,os,pathlib,re,stat,sys,unicodedata,zipfile
def digest(b): return hashlib.sha256(b).hexdigest()
def entries(z):
    rows=[]; seen={}
    for i in z.infolist():
        name=i.orig_filename; p=pathlib.PurePosixPath(name)
        if not name or '\\' in name or p.is_absolute() or ':' in name or any(s in ('','..','.') for s in name.rstrip('/').split('/')): raise ValueError('ZIP_PATH')
        for s in p.parts:
            if s.endswith((' ','.')) or re.match(r'^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)',s,re.I) or any(ord(c)<32 or c in '<>"|?*' for c in s): raise ValueError('WINDOWS_NAME')
        mode=i.external_attr>>16
        if stat.S_ISLNK(mode) or stat.S_IFMT(mode) not in (0,stat.S_IFREG,stat.S_IFDIR): raise ValueError('ZIP_LINK_OR_TYPE')
        key=unicodedata.normalize('NFC',str(p)).casefold()
        if key in seen: raise ValueError('DUPLICATE_OR_WINDOWS_COLLISION')
        seen[key]=i.is_dir()
        rows.append((i,p,key))
    for i,p,key in rows:
        if any(seen.get('/'.join(key.split('/')[:n])) is False for n in range(1,len(p.parts))): raise ValueError('FILE_DIRECTORY_COLLISION')
    if sum(i.file_size for i,_,_ in rows)>1024**3: raise ValueError('SIZE_BUDGET')
    if z.testzip(): raise ValueError('CRC')
    return rows
def inventory(z): return [{'file':str(p),'bytes':i.file_size,'sha256':digest(z.read(i))} for i,p,_ in entries(z) if not i.is_dir()]
def extract(archive,destination,allowed):
    dest=pathlib.Path(destination).resolve(); allowed=pathlib.Path(allowed).resolve()
    if dest==allowed or not dest.is_relative_to(allowed) or dest.exists(): raise ValueError('DESTINATION_OR_COLLISION')
    if any(p.is_symlink() for p in [dest,*dest.parents]): raise ValueError('DESTINATION_LINK')
    with zipfile.ZipFile(archive) as z:
        rows=entries(z)
        for i,p,_ in rows:
            target=dest.joinpath(*p.parts)
            if not target.resolve().is_relative_to(dest): raise ValueError('ESCAPE')
            if os.name=='nt' and len(str(target))>=260: raise ValueError('SHORT_DESTINATION_REQUIRED')
        dest.mkdir(parents=True)
        for i,p,_ in rows:
            target=dest.joinpath(*p.parts)
            if i.is_dir(): target.mkdir(parents=True,exist_ok=True);continue
            target.parent.mkdir(parents=True,exist_ok=True)
            with target.open('xb') as f:f.write(z.read(i))
    return verify(archive,dest)
def verify(archive,destination):
    dest=pathlib.Path(destination)
    with zipfile.ZipFile(archive) as z: expected=inventory(z)
    actual=[]
    for p in dest.rglob('*'):
        if p.is_symlink():raise ValueError('EXTRACTED_LINK')
        if p.is_file():
            b=p.read_bytes();actual.append({'file':p.relative_to(dest).as_posix(),'bytes':len(b),'sha256':digest(b)})
    if sorted(expected,key=lambda r:r['file'])!=sorted(actual,key=lambda r:r['file']):raise ValueError('SET_SIZE_SHA')
    return {'status':'PASS','files':len(expected),'zipSha256':digest(pathlib.Path(archive).read_bytes()),'entries':expected}
if __name__=='__main__':
    mode,archive,destination,*rest=sys.argv[1:]
    result=extract(archive,destination,rest[0]) if mode=='extract' else verify(archive,destination) if mode=='verify' else None
    if result is None:raise ValueError('MODE')
    print(json.dumps(result))
