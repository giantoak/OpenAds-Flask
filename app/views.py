from app import app, parser
from database import db, rds

from flask import jsonify
from flask import render_template
from flask import url_for
from flask import redirect

import flask
import ast

@app.route('/')
def overview():
    """
    serve overview page of openads
    """
    
    return render_template('overview.html')


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
            a = parser.parse_address(current_location)
            city, state = a.city or '', a.state or ''
            
            city_state = '{}, {}'.format(city, state)

            place_data = rds.get(city_state)
            if place_data:
                pop = str(ast.literal_eval(place_data)['population'])
            else:
                pop = None

            if r:
                r['timeseries'] = timeseries[:]

                result.append(r.copy())

            timeseries = []
            r = {
                'lat': str(rd['lat']),
                'lon': str(rd['lon']),
                'location': rd['location'],
                'timeseries' : [],
                'pop': pop
                }
        else:
            timeseries.append({
                'count': str(rd['count']),
                'day': str(rd['day']*1000)
                })


    obj = {'results': result}

    return jsonify(obj)

@app.route('/<path:path>')
def map(path):
    return app.send_static_file(path)
