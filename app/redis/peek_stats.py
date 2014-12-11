import redis
import random
from pprint import pformat
import ast

r = redis.Redis('localhost')

successes = r.get('success')
errors = r.get('error')
misses = r.get('miss')
sm = r.hkeys('_misses')
hm = r.hkeys('_hits')

sm_sample = random.sample(sm, 5)
hm_sample = random.sample(hm, 5)

sms = map(ast.literal_eval, r.hmget('_misses', sm_sample))
hms = map(ast.literal_eval, r.hmget('_hits', hm_sample))

print "Successes:", successes
print "Errors:", errors
print "Misses:", misses
print "Total: ", int(successes) + int(errors) + int(misses)
print "Missed locations:", len(sm), sm_sample
print "Missed locations (content):", pformat(sms)
print "Hit locations:", len(hm), hm_sample
print "Hit locations (content):", pformat(hms)


