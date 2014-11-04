import os, sys
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from getloc import GetLoc
from config import dburl
import sqlalchemy
from sqlalchemy.orm import scoped_session, sessionmaker
import address
import logging

if __name__ == '__main__':
    logging.basicConfig(level='INFO')
    engine = sqlalchemy.create_engine(dburl)
    Session = scoped_session(sessionmaker(bind=engine))

    s = Session()
    parser = address.AddressParser()
    
    g = GetLoc()
    # grab all locations from database

    r = s.execute('SELECT DISTINCT(location) FROM locationtime')
    locs = []
    for loc in r:
        
        # TODO: check raw strings as well.
        # obvious place for improvement.

        a = parser.parse_address(loc[0])

        if not a.city or not a.state:
            continue

        city_state = '{}, {}'.format(a.city, a.state)
        
        locs.append(city_state)
    
    g.retrieve_all(locs, num_workers=1)
