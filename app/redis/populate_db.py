import os, sys
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from getloc import GetLoc
from config import dburl
import sqlalchemy
from sqlalchemy.orm import scoped_session, sessionmaker
import logging
import redis
import ast
from collections import defaultdict

if __name__ == '__main__':
    logging.basicConfig(filename='log.log', level='DEBUG')
    engine = sqlalchemy.create_engine(dburl)
    Session = scoped_session(sessionmaker(bind=engine))

    s = Session()
    r = redis.Redis()

    g = GetLoc(reset_stats=True)
    # grab all locations from database

    res = s.execute('''SELECT location, SUM(count) 
                        FROM locationtime 
                        GROUP BY location''')

    locs = []
    for (loc, count) in res:
        # TODO: check raw strings as well.
        # obvious place for improvement.

        a = g.parse(loc)

        if not a['place'] or not a['state']:
            continue

        city_state = u'{} {}'.format(a['place'], a['state'])
        
        try:
            loc_struct = ast.literal_eval(r.hget('_hits', city_state))
        except ValueError:
            loc_struct = defaultdict(lambda: None)
        
        try:
            lon, lat = loc_struct['location']
        except TypeError:
            lon, lat = None, None

        s.execute('''UPDATE location_data SET pop=:pop, 
                                              geo_id=:gid, 
                                              geo_name=:name,
                                              lat=:lat,
                                              lon=:lon
                      WHERE location=:loc''',
                      dict(pop=loc_struct['population'],
                           gid=loc_struct['full_geoid'], 
                           name=loc_struct['display_name'],
                           lat=lat,
                           lon=lon,
                           loc=loc))
        
        s.commit()

