import redis
import random

r = redis.Redis('localhost')

successes = r.get('success')
errors = r.get('error')
misses = r.get('miss')
sm = r.smembers('_misses')
print "Successes:", successes
print "Errors:", errors
print "Misses:", misses
print "Total: ", int(successes) + int(errors) + int(misses) 
print "Missed locations:", len(sm), random.sample(sm, 10)
