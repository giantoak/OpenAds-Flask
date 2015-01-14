from app import app, gl
from database import db, rds
import json
from flask import jsonify
from flask import render_template
from flask import url_for
from flask import redirect
from flask import Response
from flask import request
from flask import session
from werkzeug import secure_filename
import random
import os
import pandas as pd
import requests
from string import ascii_lowercase

import flask
import ast

import re
from config import UPLOAD_DIR

# TODO: refactor upload and dataset selection logic into module
@app.route('/upload/')
def upload_splash():
    return render_template('upload.html')

@app.route('/upload/endpoint', methods=['POST'])
def receive_upload():
    """
    Architecture design notes: /upload uploads all of the posted
    files to the server, saves the file names in the global sesion
    variable (g), and renders the client results page.

    On load, the client results page connects to a websocket, which
    triggers the API calls. Results are streamed back to the client
    as they come in.

    """
    ALLOWED_EXTENSIONS = ['csv'] # TODO: provide support for excel

    def allowed_file(filename):
        return '.' in filename and \
                filename.rsplit('.', 1)[1] in ALLOWED_EXTENSIONS
    
    f = flask.request.files['file']
    if allowed_file(f.filename):
        sf = secure_filename(f.filename)
        obscured_fn = sf + ''.join([random.choice(ascii_lowercase) for _ in range(20)])
        dest = os.path.join(UPLOAD_DIR, obscured_fn)
        f.save(dest)

        session['filename'] = dest
        return present()

    raise TypeError('Bad file type')

# TODO: refactor geotag into its own module
@app.route('/rest/geotag/suggest/<q>')
def table_suggest(q):
    endpoint = 'http://api.censusreporter.org/1.0/table/search?q={query}'
    r = requests.get(endpoint.format(query=q))

    try:
        results = r.json()
    except:
        results = []
    
    return jsonify({'results': results})

@app.route('/geotag/export/')
def exporter():
    """
    Export additional census information for geotagged locations.
    """
    tables = request.args.get('tables')
    print tables
    census_base = 'http://api.censusreporter.org/1.0/data/show/latest?table_ids={t}&geo_ids={g}'
    q = db.session.execute('''SELECT geo_id 
                                FROM location_data 
                                WHERE geo_id IS NOT NULL''')

    # hacky list of places that don't show up in the census reporter
    ignore = {'31000US42060','31400US3562020764','31400US4790013644',
            '31000US31100','31400US3562020764','31000US39100','31000US26180',
            '31000US31100','33000US442','31000US43860'}
    
    ids = [x[0] for x in q if x[0] not in ignore]

    #############
    # : HTTP GET is capped at 8kb requests, geo_ids are ~12 bytes each 
    # : Slightly conservative limit of 512 geo_ids per request
    #############

    n = 512 
    id_splits = [ids[i:i+n] for i in xrange(0, len(ids), n)]
    
    results = []
    for id_chunk in id_splits:
        id_str = ','.join(id_chunk)
        query_url = census_base.format(t=tables, g=id_str)

        r = requests.get(query_url)
        resp = r.json()

        results.append(resp)
    
    # TODO: merge results
    return Response(json.dumps(results), mimetype='text/csv')

@app.route('/render/')
def present():
    try:
        fn = session['filename']
    except KeyError:
        return uploader()
    
    return render_template('tabs-home.html')

@app.route('/load_data')
def rest_api_for_data():
    # read in file, pipe into data
    try:
        fn = session['filename']
    except KeyError:
        return uploader()
    df = pd.read_csv(fn)
    records = json.dumps(df.to_dict())
    return Response(records, mimetype='text/json')

@app.route('/retrieve/<file_id>')
def retrieve():
    # grab data

    return

@app.route('/geotag/')
def uploader():
    """
    interactive geotagging home page
    """
    q = db.session.execute('''SELECT loc_id, location, count, geo_name,
                                     pop, lon, lat, discard 
                                FROM location_data''')
    trashed, ut, t = [], [], {}
    
    for row in q:
        rd = {k: v for k,v in row.items()}
        
        if rd['discard']:
            # filter out discarded place names

            label = 'untagged' if not rd['pop'] else 'tagged'
            trashed.append((rd['location'], rd['count'], rd['loc_id'], label))
        
        elif not rd['pop']:
            # place names without geolocation
            ut.append((rd['location'], rd['count'], rd['loc_id']))

        else:
            # replace all single quotes
            loc_stripped = re.sub("'", '', rd['geo_name'])
            t[loc_stripped] = {
                    'count': rd['count'],
                    'ratio': float(rd['count'])/rd['pop'],
                    'lng': rd['lon'],
                    'lat': rd['lat'],
                    'id': rd['loc_id']
                    }
    
    ut = sorted(ut, key=lambda x: x[1], reverse=True)
    trashed = sorted(trashed, key=lambda x: x[1], reverse=True)
    
    return render_template('geotag.html', untagged=ut, trashed=trashed, 
            tagged=json.dumps(t), data_loaded=session.get('filename', ''))

@app.route('/geotag/discard/<loc_id>')
def geotag_discard(loc_id):
    db.session.execute('''UPDATE location_data SET discard=true 
            WHERE loc_id=:ld''',
            {'ld': loc_id})
    
    db.session.commit()
    
    # return blank page
    return ''

@app.route('/geotag/update/', methods=['GET', 'POST'])
def geotag_update():

    print request.form
    loc_id = request.form['loc_id']
    gid = request.form['geo_id']
    name = request.form['geo_name']
    pop = request.form['population']
    
    lon = request.form['longitude']
    lat = request.form['latitude']
    db.session.execute('''UPDATE location_data SET geo_id=:gid,
                                geo_name=:name,
                                pop=:pop,
                                discard=false,
                                lat=:lat,
                                lon=:lon
                        WHERE loc_id=:ld''', 
                        dict(gid=gid, name=name, pop=pop, ld=loc_id, lon=lon,
                            lat=lat))
    db.session.commit() 
    # return blank page
    return ''

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
                        'full_geoid': row['full_geoid'],
                        'population': row['population'],
                        'location': row['location']
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


    q = db.session.execute('SELECT * FROM locationtimepop')
    
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

            if r:
                r['timeseries'] = timeseries[:]
                result.append(r.copy())

            timeseries = []
            r = {
                'lat': str(rd['lat']),
                'lon': str(rd['lon']),
                'location': rd['location'],
                'timeseries' : [],
                'pop': rd.get('pop', ''),
                'display_name': rd.get('location', '')
                }
        else:
            timeseries.append({
                'count': str(rd['count']),
                'day': str(rd['day']*1000)
                })

    obj = json.dumps({'results': result})
    
    return Response(obj, status=200, mimetype='application/json')

@app.route('/<path:path>')
def map(path):
    return app.send_static_file(path)



