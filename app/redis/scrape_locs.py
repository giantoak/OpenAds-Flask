import os, sys
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from getloc import GetLoc
from config import dburl
import sqlalchemy
from sqlalchemy.orm import scoped_session, sessionmaker
import logging

if __name__ == '__main__':
    logging.basicConfig(filename='log.log', level='DEBUG')
    engine = sqlalchemy.create_engine(dburl)
    Session = scoped_session(sessionmaker(bind=engine))

    s = Session()
    
    g = GetLoc(reset_stats=True)
    # grab all locations from database

    r = s.execute('''SELECT location, SUM(count) 
                        FROM locationtime 
                        GROUP BY location''')

    locs = []
    raws = []
    for (loc, count) in r:
        raws.append(loc)
        # TODO: check raw strings as well.
        # obvious place for improvement.

        a = g.parse(loc)

        if not a['place'] or not a['state']:
            continue

        city_state = u'{} {}'.format(a['place'], a['state'])
        
        locs.append((city_state, int(count)))

    #import pdb; pdb.set_trace()
    g.retrieve_all(locs, num_workers=1)



