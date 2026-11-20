"""One fixed short/deep control per invocation. Preserve native errors, never retry."""
import json,pathlib,sys,zipfile
archive,destination=sys.argv[1:];root=pathlib.Path(destination)
if root.exists():raise RuntimeError('COLLISION')
with zipfile.ZipFile(archive) as z:
    for i in z.infolist():
        target=root/i.filename;target.parent.mkdir(parents=True,exist_ok=True)
        print(json.dumps({'target':str(target),'absoluteLength':len(str(target.absolute())),'parentExists':target.parent.exists()}),flush=True)
        with target.open('xb') as f:f.write(z.read(i))
