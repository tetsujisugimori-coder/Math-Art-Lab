from fractions import Fraction as F
import json, math, random
from pathlib import Path
out=Path(__file__).parent
cases=[]
def add(label, ps, point):
    if not all(0 <= v <= 1 for v in point): return
    x,y=map(F.from_float,point)
    exact=[(s['id'],(x-F.from_float(s['x']))**2+(y-F.from_float(s['y']))**2) for s in ps]
    minimum=min(v for _,v in exact)
    cases.append(dict(label=label,sites=ps,point=dict(x=point[0],y=point[1]),mathematicalOwners=sorted(i for i,v in exact if v==minimum)))
def sites(points,ids=None): return [dict(id=(ids or list(range(1,len(points)+1)))[i],x=x,y=y) for i,(x,y) in enumerate(points)]
two=sites([(.25,.5),(.75,.5)])
for dx in [0.,1e-13,-1e-13,4.9e-13,-4.9e-13,5.1e-13,-5.1e-13,1e-8,-1e-8]: add(f'boundary offset {dx}',two,(.5+dx,.5))
for x in [math.nextafter(.5,0),math.nextafter(.5,1)]: add('one ULP at horizontal bisector',two,(x,.5))
for ids in [[29,3],[3,29]]:
    ps=sites([(.25,.5),(.75,.5)],ids)
    for x in [.5,.5+1e-13,.5-1e-13]: add('ID permutation',list(reversed(ps)),(x,.5))
add('three-way exact vertex',sites([(.25,.5),(.75,.5),(.5,.75)]),(.5,.5))
corners=sites([(0.,0.),(1.,0.),(1.,1.),(0.,1.)],[13,7,29,2])
for x in [.5,math.nextafter(.5,0),math.nextafter(.5,1),0.,1.]:
    for y in [.5,0.,1.]: add('four corners and range edges',corners,(x,y))
eps=1.1e-6
for x in [eps/2,math.nextafter(eps/2,0),math.nextafter(eps/2,1)]: add('near sites, rounded norm equality',sites([(0.,0.),(eps,0.)]),(x,1.))
for x,y in [(0.,0.),(math.ulp(0.),0.),(0.,math.ulp(0.)),(-0.,0.)]: add('subnormal exact distance gap',sites([(0.,eps),(eps,0.)]),(x,y))
rng=random.Random(5755523261)
for k in range(180):
    points=[(rng.randrange(2**20+1)/2**20,rng.randrange(2**20+1)/2**20) for _ in range(2)]
    if math.dist(*points)<1e-6: continue
    ps=sites(points,[71,5]);(a,b),(c,d)=points;x,y=(a+c)/2,(b+d)/2
    for px,py in [(x,y),(x-(d-b)/16,y+(c-a)/16)]:
        add('dyadic midpoint/perpendicular exact boundary',ps,(px,py));add('adjacent representable x below',list(reversed(ps)),(math.nextafter(px,0),py));add('adjacent representable x above',ps,(math.nextafter(px,1),py))
for k in range(400): add('seeded independent random query',sites([(rng.random(),rng.random()) for _ in range(2+k%7)],rng.sample(range(1,200),2+k%7)),(rng.random(),rng.random()))
(out/'oracle-cases.json').write_text(json.dumps(dict(method='Python Fraction.from_float exact rational squared distances, no product imports',cases=cases),indent=2)+'\n',encoding='utf8')
print(json.dumps(dict(cases=len(cases))))
