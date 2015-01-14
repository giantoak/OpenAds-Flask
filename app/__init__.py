from flask import Flask
from getloc import GetLoc

gl = GetLoc()
app = Flask(__name__)
app.secret_key = open('/dev/urandom', 'rb').read(32)
from app import views
