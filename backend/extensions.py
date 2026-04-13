"""
Flask extension instances — initialized here, bound to app in app factory.
"""
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS

db = SQLAlchemy()
cors = CORS()
