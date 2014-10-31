from app import app
from flask.ext.sqlalchemy import SQLAlchemy
from config import dburl
import os

app.config['SQLALCHEMY_DATABASE_URI'] = dburl
db = SQLAlchemy(app)
