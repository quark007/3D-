"""Generate authored hand and uniform UV atlas maps, including microrelief."""
import sys
from pathlib import Path
import numpy as np
from PIL import Image
out=Path(sys.argv[1]);out.mkdir(parents=True,exist_ok=True)
rng=np.random.default_rng(1935)
N=1024
y,x=np.mgrid[:N,:N];u=(x+.5)/N;v=1-(y+.5)/N
def noise(n):
    grid=Image.fromarray(rng.integers(0,256,(n,n),dtype=np.uint8)).resize((N,N),Image.Resampling.BICUBIC)
    return np.asarray(grid)/255-.5
coarse=noise(12);middle=noise(49);fine=noise(460)
cloth=u>.57
# Hand-space coordinates in metres, with the dorsal and palm charts vertically stacked.
X=u/.565*.17-.085
Y=(v%0.5)/.5*.34+.095
dorsal=v>.5
color=np.zeros((N,N,3))
knuckles=np.exp(-((Y-.319)/.019)**2)*(0.5+.5*np.cos((X+.005)*270))
tips=np.clip((Y-.34)*10,0,1)
tan=np.clip((Y-.235)*25,0,1)
pores=np.maximum(fine-.13,0)**2
vein=np.zeros_like(u)
for offset,rate in [(-.019,19),(.012,27),(.027,31)]:
    path=offset+(.31-Y)*.16+.0035*np.sin(Y*rate*2.8)
    vein+=np.exp(-((X-path)/.00135)**2)*np.exp(-((Y-.263)/.053)**4)
creases=np.zeros_like(u)
for cy,slope in [(.286,.42),(.307,-.21),(.261,-.63),(.221,.12),(.217,.08)]:
    creases+=np.exp(-((Y-cy-slope*X-1.7*X*X)/.00086)**2)
for i,val in enumerate([175,125,98]):
    color[:,:,i]=val+coarse*11+middle*6+fine*4-pores*50+tan*[-2,-5,-6][i]+(knuckles+tips*.32)*[9,-6,-7][i] + vein*dorsal*[-8,-1,1][i]-creases*np.where(dorsal,1,9)
# Diagonal 2-over-1 twill with intermittent raised weft and washed cuff edge.
s=(u-.57)/.43;t=v
warp=np.cos(s*2*np.pi*89);weft=np.cos(t*2*np.pi*134)
over=np.cos(2*np.pi*(s*89-t*134)/3)>.12
weave=np.where(over,warp,weft)
edge=np.clip((t-.72)*3.3,0,1)
dust=np.maximum(0,middle+.15)*edge
for i,val in enumerate([76,81,76]):
    color[:,:,i]=np.where(cloth,val+weave*6+middle*10+coarse*13+edge*13+dust*13,color[:,:,i])
rough=np.where(cloth,.908+.029*weave+.018*fine,.62-.18*knuckles+.024*middle)
ao=np.where(cloth,.90+.08*weave,1-.12*creases*~dorsal-.035*pores)
height=np.where(cloth,weave*.93+fine*.28,-pores*8+fine*.10+vein*.15-creases*.36)
dy,dx=np.gradient(height);normal=np.stack((-dx,dy,np.ones_like(dx)*2.1),axis=-1);normal/=np.linalg.norm(normal,axis=-1,keepdims=True)
for name,data in [('color',color),('normal',(normal*.5+.5)*255),('orm',np.stack((ao,rough,np.zeros_like(ao)),axis=-1)*255)]:
    Image.fromarray(np.uint8(np.clip(data,0,255))).save(out/(name+'.png'))
