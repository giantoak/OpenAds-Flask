import os, sys
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from getloc import GetLoc

g = GetLoc()
g.reset_redis_stats()

# reset locationtime cache
g.r.delete('locationtime')
