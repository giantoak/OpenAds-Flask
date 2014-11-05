import os, sys
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from getloc import GetLoc

g = GetLoc()
g.reset_redis_stats()

# reset locationtime cache
print 'THIS COMMAND WILL RESET THE QUEUE. ARE YOU SURE? [y/n]'

c = sys.stdin.read(1)

if c == 'y':
    g.r.flushall()
