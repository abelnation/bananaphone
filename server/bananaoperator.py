from flask import Flask, request, Response
from flask.ext.pymongo import PyMongo
import bson.json_util

import json
from datetime import datetime

app = Flask(__name__)
app.debug = True

mongo = PyMongo(app)

LIST_NAME = 'thelist'

@app.route("/login", methods=['POST'])
def login():
	print request.form
	args = parse_json_args()
	print args

	user = mongo.db.users.find_one({'id': args['id']})
	print user

	if not user:
		print "Creating user: " + args['name']
		user = {
			'id': args['id'],
	        'username': args['username'],
	        'link': args['link'],
	        'name': args['name'],
	        'picture_url': "https://graph.facebook.com/%s/picture?type=small" % args['username'],
		}
		user_id = mongo.db.users.insert(user)
		user = mongo.db.users.find_one({ '_id': user_id })

	else:
		print "Updating user: " + args['name']
		mongo.db.users.update(
			{ '_id': user['_id'] },
			{ '$set': {	
				'id': args['id'],
		        'username': args['username'],
		        'link': args['link'],
		        'name': args['name'],
		        'picture_url': "https://graph.facebook.com/%s/picture?type=small" % args['username'],
			}}
		)

	print "making response"
	return make_json_response(request, user)

@app.route("/list/<listname>/")
def get_the_list(listname):
	the_list = mongo.db.lists.find_one({'name': listname})
	
	if not the_list:
		print "Creating the list: " + listname
		the_list = {
			'name': listname,
			'last_updated': get_timestamp(),
			'tracks': [],
		}
		mongo.db.lists.insert(the_list)

	return make_json_response(request, the_list)

@app.route("/list/<listname>/addtrack", methods=["POST"])
def add_track(listname):
	the_list = mongo.db.lists.find_one_or_404({'name': listname})

	args = parse_json_args()

	print args

	track = {
		'playlist_pos': args['playlist_pos'],
		'title': args['track_data']['data']['name'], 
		'artist': artistStringFromArray(args['track_data']['data']['artists']),
		'submitted_by_id': args['submitted_by'],
		'spotify_uri': args['track_data']['data']['uri'],
		'comments': [],
		'likes': [],
		'num_likes': 0,
		'num_comments': 0,
		'num_listened': 0,
		'last_updated': get_timestamp(),
	}

	mongo.db.lists.update(
		{ '_id': the_list['_id'] },
		{ '$pushAll': {	
			'tracks': [track],
			
		}}
	)
	mongo.db.lists.update(
		{ '_id': the_list['_id'] },
		{ '$set': {	
			'last_updated': get_timestamp(),
		}}
	)
	
	return make_json_response(request, track)

@app.route("/list/<listname>/track/<track_no>/")
def get_track_data(listname, track_no):
	the_list = mongo.db.lists.find_one({ 'name': listname})
	track_no = int(track_no)
	track = the_list['tracks'][track_no]

	return make_json_response(request, track)

@app.route("/list/<listname>/track/<track_no>/addcomment", methods=["POST"])
def add_comment_to_track(listname, track_no, methods=["POST"]):
	the_list = mongo.db.lists.find_one({'name': listname})

	track_no = int(track_no)
	track = the_list['tracks'][track_no]

	args = parse_json_args()

	comment = {
		'comment': args['comment'],
		'author': args['author'],
		'timestamp': get_timestamp(),
		'num_likes': 0
	}

	track['comments'].append(comment)
	track['num_comments'] = len(track['comments'])
	track['last_updated'] = get_timestamp()

	mongo.db.lists.update(
		{ 	'_id': the_list['_id'],
			'tracks': {
				'$elemMatch': {
					'playlist_pos': track_no,
				}
			}	 
		},
		{ '$pushAll': {	
			'tracks.$.comments': [comment] },
			'$set': {
				'tracks.$.num_comments': track['num_comments'],
				'tracks.$.last_updated': get_timestamp() 
			},
		})

	return make_json_response(request, track)

@app.route("/list/<listname>/track/<track_no>/like")
def like_track(listname, track_no):
	the_list = mongo.db.lists.find_one({'name': listname})
	track_no = int(track_no)
	track = the_list['tracks'][track_no]

	args = parse_json_args()
	user_id = args['author']['id']

	if user_id in track['likes']:
		print "User has already liked this track"
		return make_json_response(request, None)
	else:
		track['likes'].append(user_id)

	mongo.db.lists.update(
		{ 	'_id': the_list['_id'],
			'tracks': {
				'$elemMatch': {
					'playlist_pos': track_no,
				}
			}
		},
		{ 
			'$pushAll': {	
				'tracks.$.likes': [user_id] },
			'$set': {
				'tracks.$.num_likes': len(track['likes']),
				'tracks.$.last_updated': get_timestamp(),
			},
		})
	the_list = mongo.db.lists.find_one({'name': listname})
	track = the_list['tracks'][track_no]

	return make_json_response(request, track)

@app.route("/list/<listname>/track/<track_no>/play")
def play_track(listname, track_no):
	pass

@app.route("/cleardb")
def clear_db():
	mongo.db.drop_collection('lists')
	mongo.db.drop_collection('users')

	return make_json_response(request, None) 

def artistStringFromArray(arr):
	print "artistString: "
	print arr
	result = ""
	for i, artist in enumerate(arr):
		result += artist['name']
		if i < (len(arr)-1):
			result += ", "
		print result
	return result

def bson_to_json(bson_doc):
	return bson.json_util.dumps(bson_doc)

def get_timestamp():
	return datetime.now().isoformat()

def parse_json_args():
	if request.method == "POST":
		print "Post"
		return json.loads(request.form.get('json'))
	else:
		print "Get"
		return json.loads(request.args.get('json'))

def make_json_response(callback, data):

	callback = None
	if request.method == "POST" and 'callback' in request.form:
		callback = request.form['callback']
	elif request.method == "GET" and 'callback' in request.args:
		callback = request.args['callback']

	if callback:
		print "Sending jsonp"
		result = "%s(%s)" % (callback, bson_to_json(data))
		print result

		return Response(response=result,
            	        status=200,
                	    mimetype="application/javascript")
	else:
		print "Sending json"
		result = bson_to_json(data)
		print result

		return Response(response=result,
    	                status=200,
        	            mimetype="application/javascript")

if __name__ == '__main__':
	# app.run(host= '0.0.0.0')
	app.run()
