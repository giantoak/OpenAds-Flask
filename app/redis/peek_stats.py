import redis

r = redis.Redis('localhost')

successes = r.get('success')
errors = r.get('error')
misses = r.get('miss')

print "Successes:", successes
print "Errors:", errors
print "Misses:", misses

print "Total: ", int(successes) + int(errors) + int(misses) 
