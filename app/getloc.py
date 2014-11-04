from __future__ import print_function
from hotqueue import HotQueue
import redis
import multiprocessing
import requests
import logging
import urllib

class GetLoc(object):
    census_reporter = 'http://api.censusreporter.org/1.0/geo/elasticsearch?'
    
    def __init__(self, queue_name='loc_queue', connection='localhost', reset_stats=False):
        self.q, self.r = self.get_redis(queue_name, connection)
        if reset_stats:
            self.reset_redis_stats()
    
    def get_redis(self, name, connection):
        return HotQueue(name), redis.Redis(connection)
    
    def retrieve(self, name, timeout=2):
        params = {'q': name, 'size': 1}
        url = self.census_reporter + urllib.urlencode(params)
        req = requests.get(url)
        if req.status_code != requests.codes.ok:
            logging.error('Error requesting {}: {}'.format(name, req.status_code))
            return 'error'
        else:
            try:
                res = req.json()['results']
            except:
                logging.error('Error parsing request for {}'.format(name))
                return 'error'
            
            try:
                resobj = res[0]
                logging.debug('Successfully geocoded {}'.format(name))
                return resobj
            except IndexError:
                logging.warning('No geocode found for {}'.format(name))
                return 'miss'
        
        return

    def retriever(self, worker_id, q, r, timeout=2):
        """Continuously grab geoids from Census Reporter"""

        
        for name in q.consume():
            if not name:
                logging.info('Received sentinel at {}'.format(worker_id))
                break
            logging.debug('Sending request for {} from worker {}'
                    .format(name, worker_id))
            resobj = self.retrieve(name, timeout)
            if isinstance(resobj, dict):
                r.set(name, resobj)
                r.incr('success')
            elif resobj:
                # returned error
                r.incr(resobj)
                    
        return

    def retrieve_all(self, locs, num_workers=1, timeout=2):
        workers = []
        logging.info('Putting locs into queue...')
        for loc in locs:
            self.q.put(loc)

        for i in range(num_workers):
            p = multiprocessing.Process(target=self.retriever, args=(i, self.q, self.r, timeout))
            p.start()
            logging.info('Starting worker {}'.format(i))
            workers.append(p)

        for w in workers:
            w.join()
    
    def reset_redis_stats(self):
            self.r.set('success', 0)
            self.r.set('miss', 0)
            self.r.set('error', 0)
