from flask import Flask, request, Response
from flask.ext.pymongo import PyMongo
import bson.json_util

import json

app = Flask(__name__)
app.debug = True

mongo = PyMongo(app)

LIST_NAME = 'thelist'

@app.route("/")
def get_the_list():
	the_list = mongo.db.lists.find_one({'name': LIST_NAME})
	
	if not the_list:
		the_list = {
			'name': LIST_NAME,
			'tracks': [],
		}
		mongo.db.lists.insert(the_list)

	return make_json_response(request, the_list)

@app.route("/addtrack")
def add_track():
	pass

@app.route("/track/<track_no>")
def get_track_data(track_no):
	the_list = mongo.db.lists.find_one({'name': LIST_NAME})	

	return make_json_response(request, None)

@app.route("/track/<track_no>/addcomment")
def add_comment_to_track(track_no):
	pass

@app.route("/track/<track_no>/like")
def like_track(track_no):
	pass

@app.route("/track/<track_no>/play")
def like_track(track_no):
	pass

def bson_to_json(bson_doc):
	return bson.json_util.dumps(bson_doc)

def make_json_response(callback, data):

	if 'callback' in request.args:
		print "Sending jsonp"
		callback = request.args['callback']
		result = "%s(%s)" % (callback, bson_to_json(data))
		print result

		return Response(response=result,
            	        status=200,
                	    mimetype="application/javascript")
	else:
		print "Sending jsonp"
		result = bson_to_json(data)
		print result

		return Response(response=result,
    	                status=200,
        	            mimetype="application/javascript")

if __name__ == '__main__':
	# app.run(host= '0.0.0.0')
	app.run()
