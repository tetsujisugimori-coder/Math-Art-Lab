import hashlib,json,os,pathlib,platform,sys,zipfile
p=pathlib.Path('.three-body-evidence/stage-aa/formal-scope-final/14043851393.zip')
with zipfile.ZipFile(p) as z:
    names=[i.filename for i in z.infolist() if not i.is_dir()]
    failed='development/ripple-review-DPR2-width-1-4ee40-d-live-theta-legend-updates-chromium/attachments/review-observations-a18b71e293da5e0a22e7ded360f04b357c9a79a7.json'
    old=pathlib.Path('.three-body-evidence/stage-aa/formal-scope-final/downloaded')/failed
    print(json.dumps({'os':platform.platform(),'python':sys.version,'zipLibrary':'stdlib zipfile','zipBytes':p.stat().st_size,'zipSHA':hashlib.sha256(p.read_bytes()).hexdigest(),'zipFiles':len(names),'maxRelativeLength':max(map(len,names)),'newRoot':str(pathlib.Path('.ab/x').absolute()),'newMaxAbsoluteLength':max(len(str((pathlib.Path('.ab/x')/n).absolute())) for n in names),'oldFailure':{'file':failed,'absoluteLength':len(str(old.absolute())),'parentExists':old.parent.exists(),'fileExists':old.exists()},'cim':'NOT_OBTAINED_ACCESS_DENIED'},indent=2))
