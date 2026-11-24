"""Return projection failures and overlapping faces for isolated chart placement."""
import sys,numpy as np,shapely
data=np.load(sys.argv[1])
polys=shapely.polygons(data["tri"])
faces=data["face"]
small=shapely.area(polys)*1024**2<.16
a,b=shapely.STRtree(polys).query(polys,predicate="intersects")
pairs=(a<b)&~small[a]&~small[b]
a,b=a[pairs],b[pairs]
overlap=shapely.area(shapely.intersection(polys[a],polys[b]))>1e-16
np.save(sys.argv[2],np.unique(np.r_[faces[small],faces[a[overlap]],faces[b[overlap]]]))
