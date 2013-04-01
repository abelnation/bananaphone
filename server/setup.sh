#!/bin/sh

# Create virtual env and activate it
/usr/local/bin/virtualenv -p /usr/local/bin/python2.7 --distribute bananaphone-env
source bananaphone-env/bin/activate

# Install packages
pip install flask
pip install Flask-SQLAlchemy
