from app import app, gl
from database import db, rds
import json
from flask import jsonify
from flask import render_template
from flask import url_for
from flask import redirect
from flask import Response
import requests

import flask
import ast

@app.route('/geotag')
def geotagger():
    """
    interactive geotagging
    """

    # return list of untagged places
    
    ut = rds.smembers('_misses')
    return render_template('geotag.html', untagged=ut)

@app.route('/')
def overview():
    """
    serve overview page of openads
    """
    
    return render_template('overview.html')

@app.route('/rest/overview/suggest/<q>')
def autocomplete_name(q):
    endpoint = 'http://api.censusreporter.org/1.0/geo/elasticsearch?q={query}'
    r = requests.get(endpoint.format(query=q))
    results = []
    try:
        d = r.json()['results']
        for row in d:
            results.append(
                    {
                        'name': row['display_name'],
                        'full_geoid': row['full_geoid']
                    })
    except KeyError, IndexError:
        pass

    return jsonify({'results': results})

@app.route('/rest/overview/timeseries/')
def time_series():
    """
    return time series data
    """
    q = db.session.execute('SELECT * FROM temporal ORDER BY day')

    result = []
    for row in q:
        rd = {k:v for k,v in row.items()}
        r = {
                'day': rd['day']*1000,
                'count': rd['count']
                }
        result.append(r)
    
    obj = {'results': result}
    return jsonify(obj)

# TODO: move all the rest functions into a blueprint
@app.route('/rest/overview/locationtime/')
def location_time():
    """
    return locationtime data
    """

    resp = rds.get('locationtime')
    if resp:
        return Response(resp, status=200, mimetype='application/json')


    q = db.session.execute('SELECT * FROM locationtime')
    
    result = []
    timeseries = []
    current_location = 'unset'
    r = {}
    for row in q:
        rd = {k:v for k,v in row.items()}
        
        # construct the data structure
        # it consists of a location, lat, lon,
        # and a list of timeseries. Same locations
        # are always adjacent in the database.

        if current_location != rd['location']:
            current_location = rd['location']
            a = gl.parse(current_location)
            city, state = a['place'] or '', a['state'] or ''
            
            city_state = u'{} {}'.format(city, state)

            place_data_str = rds.get(city_state)
            place_data = {}
            if place_data_str:
                place_data = ast.literal_eval(place_data_str)

            if r:
                r['timeseries'] = timeseries[:]
                result.append(r.copy())

            timeseries = []
            r = {
                'lat': str(rd['lat']),
                'lon': str(rd['lon']),
                'location': rd['location'],
                'timeseries' : [],
                'pop': place_data.get('population', None),
                'display_name': place_data.get('display_name', None)
                }
        else:
            timeseries.append({
                'count': str(rd['count']),
                'day': str(rd['day']*1000)
                })

    obj = json.dumps({'results': result})
    
    rds.set('locationtime', obj)
    return Response(obj, status=200, mimetype='application/json')

@app.route('/<path:path>')
def map(path):
    return app.send_static_file(path)



