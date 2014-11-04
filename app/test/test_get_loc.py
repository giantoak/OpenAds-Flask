import nose
import sys, os
sys.path.append(os.path.dirname(
    os.path.dirname(__file__)))

from getloc import GetLoc

def test_init():
    getloc = GetLoc()

def test_retrieve():
    getloc = GetLoc()
    getloc.retrieve_all(['Miami', 'Stanford, CA', '142 Oak Ridge Rd, Bluesville KY'], num_workers=3)
    
    assert getloc.r.get('Miami')
    assert getloc.r.get('Stanford, CA')
    assert getloc.r.get('142 Oak Ridge Rd, Bluesville KY')
