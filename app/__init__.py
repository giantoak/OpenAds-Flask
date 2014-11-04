from flask import Flask
import address

app = Flask(__name__)
parser = address.AddressParser()

from app import views
