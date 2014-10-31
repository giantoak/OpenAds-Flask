from app import app
from database import db

from flask import jsonify
from flask import render_template
from flask import url_for
from flask import redirect

import flask

@app.route('/')
def overview():
    """
    serve overview page of openads
    """
    
    return app.send_static_file('overview.html')

# TODO: move all the rest functions into a blueprint
@app.route('/rest/locationtime')
def location_time():
    """
    return locationtime data
    """

    q = db.session.execute('SELECT * FROM locationtime')
    
    result = []
    for row in q:
        rd = {k:v for k,v in row.items()}
        
        r = {
                'lat': rd['lat'],
                'lon': rd['lon'],
                'location': rd['location'],
                'timeseries' : {
                    'count': rd['count'],
                    'day': rd['day']
                    }
                }

        result.append(r)


    obj = {'locationTimeVolumeResults':
            {'results': result}}

    return jsonify(obj)

@app.route('/<path:dummy>')
def catch_all(dummy):
    """
    hack for leaving javascript intact

    serves all unknown routes to the static directory
    """

    return redirect(url_for('static', filename=dummy))
