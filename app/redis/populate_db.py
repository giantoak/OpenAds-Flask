import os, sys
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from config import dburl
import sqlalchemy
from sqlalchemy.orm import scoped_session, sessionmaker
import logging

if __name__ == '__main__':
    logging.basicConfig(filename='log.log', level='DEBUG')
    engine = sqlalchemy.create_engine(dburl)
    Session = scoped_session(sessionmaker(bind=engine))

    s = Session()

    s.execute('''UPDATE locationtimepop lp
                LEFT JOIN location_data ld
                ON lp.location=ld.location
                SET lp.pop=ld.pop''')

    s.commit()

