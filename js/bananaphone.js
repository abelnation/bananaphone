var Bananaphone = (function() {
  var SERVER_URL = "http://localhost:5000/";
  var LIST_NAME = "thelist";
  
  var self = {};

  var sp = getSpotifyApi(1);
	var m = sp.require("sp://import/scripts/api/models");
	var v = sp.require("sp://import/scripts/api/views");
	var fx = sp.require('sp://import/scripts/fx');
	var ui = sp.require('sp://import/scripts/ui');
  var auth = sp.require('sp://import/scripts/api/auth');

  var fb_access_token;
  var current_user;

	var selected_track_num;
  var selected_track_row;
	var playing_track_num;
  var playing_track_row;

	var ui_playlist;
  var ui_selected_track_info;
  var ui_track_controls; // track controls
	var ui_social;
	var ui_social_container;
  var ui_like_button;
  var ui_comment_button;



  self.init = function() {

    log_current_fn(arguments.callee.name, Array.prototype.slice.call(arguments));

    setupSocialControls();
  	fetchList();

    doAuth();

  	// When a track is dropped on the app from spotify
  	m.application.observe(m.EVENT.LINKSCHANGED, onTrackDropped);
  };

  function doAuth() {
    log_current_fn(arguments.callee.name, Array.prototype.slice.call(arguments));

    auth.authenticateWithFacebook('554341824586878', ['user_about_me'], {

      onSuccess : function(accessToken, ttl) {
        console.log("Success! Here's the access token: " + accessToken);

        fb_access_token = accessToken;
        fetchUserFacebookInfo(accessToken);
      },

      onFailure : function(error) {
        console.log("Authentication failed with error: " + error);
      },

      onComplete : function() { }
    });

    // current_user = m.session.anonymousUserID;
  }

  function selectTrack(track_num) {
  	log_current_fn(arguments.callee.name, Array.prototype.slice.call(arguments));

  	if(selected_track_row) {
  		selected_track_row.removeClass("selected");	
  	}
  
  	var row = $("#track-"+track_num);
    console.log(track_num);
    console.log(row);
  	row.addClass("selected");
    ui_comment_field.removeAttr('disabled');
    ui_comment_field.focus();

  	selected_track_row = row;
    selected_track_num = track_num

    fetchTrackData(track_num);
  }

  function playTrack(track_num) {
  	log_current_fn(arguments.callee.name, Array.prototype.slice.call(arguments));

  	if(playing_track_row) {
  		playing_track_row.removeClass("playing");	
  	}

  	var row = $("#track-"+track_num);
  	row.addClass("playing");

  	playing_track_row = row;
    playing_track_num = track_num;
  }

  /* 
   * SERVER CALLS 
   */

  function fetchUserFacebookInfo(accessToken) {
    log_current_fn(arguments.callee.name, Array.prototype.slice.call(arguments));

    var url = "https://graph.facebook.com/me?access_token=" + accessToken;
    $.ajax({
      dataType: "json",
      url: url,
      data: {},
      success: onUserInfoReceived,
    });
  }

  function loginUser(user_info) {
    log_current_fn(arguments.callee.name, Array.prototype.slice.call(arguments));

    var url = SERVER_URL + "login";
    $.ajax({
      dataType: "json",
      url: url,
      method: 'post',
      data: {
        'json': JSON.stringify({
          id: user_info['id'],
          username: user_info['username'],
          link: user_info['link'],
          name: ""+ user_info['first_name'] + " " + user_info['last_name'],
        }),
      },
      success: onUserLoggedIn,
    });
  }

  function fetchList() {
    log_current_fn(arguments.callee.name, Array.prototype.slice.call(arguments));

  	var url = SERVER_URL + "list/" + LIST_NAME;
  	$.ajax({
      dataType: "json",
      url: url,
      data: {},
      success: onPlaylistDataReceived,
    });
  }

  function addTrack(track_data) {
    log_current_fn(arguments.callee.name, Array.prototype.slice.call(arguments));

    var url = SERVER_URL  + "list/" + LIST_NAME + "/addtrack";
    $.ajax({
      dataType: "json",
      method: "post",
      url: url,
      data: {
        'json': JSON.stringify({
          'track_data': track_data,
          'playlist_pos': playlist_length,
          'submitted_by': current_user
        }),
      },
      success: onTrackAdded,
    });
  }

  function fetchTrackData(track_num) {
    log_current_fn(arguments.callee.name, Array.prototype.slice.call(arguments));

  	var url = SERVER_URL  + "list/" + LIST_NAME + "/track/" + track_num;
  	$.ajax({
      dataType: "json",
      url: url,
      data: {
        'json': JSON.stringify({
          'track_num': track_num,
        }),
      },
      success: onTrackDataReceived,
    });
  }

  function likeTrack(track_num) {
    log_current_fn(arguments.callee.name, Array.prototype.slice.call(arguments));

  	var url = SERVER_URL  + "list/" + LIST_NAME + "/track/" + track_num + "/like";
  	$.ajax({
      dataType: "json",
      url: url,
      data: {
        'json': JSON.stringify({
          'author': current_user,
          'track_num': track_num,
        }),
      },
      success: onTrackLikeResponseReceived,
    });
  }

  function addComment(track_num, comment) {
    log_current_fn(arguments.callee.name, Array.prototype.slice.call(arguments));

  	var url = SERVER_URL + "list/" + LIST_NAME + "/track/" + track_num + "/addcomment";
  	$.ajax({
      dataType: "json",
      url: url,
      method: "post",
      data: {
        'json': JSON.stringify({
        	'track_num': track_num,
        	'author': current_user,
        	'comment': comment,
        }),
      },
      success: onTrackCommentResponseReceived,
    });
  }

  function addToPlayCount(track_num) {
    log_current_fn(arguments.callee.name, Array.prototype.slice.call(arguments));

  	var url = SERVER_URL + "list/" + LIST_NAME + "/track/" + track_num + "/play";
  	$.ajax({
      dataType: "json",
      url: url,
      method: "POST",
      data: {
        'json': JSON.stringify({
          'track_num': track_num,
          'author': current_user // TODO
        })
      },
      success: onTrackPlayResponseReceived,
    });
  }

  /*
   * HANDLERS
   */

  function onUserInfoReceived(user_info) {
    log_current_fn(arguments.callee.name, Array.prototype.slice.call(arguments));

    loginUser(user_info)

    console.log(user_info);
  }

  function onUserLoggedIn(user_info) {
    log_current_fn(arguments.callee.name, Array.prototype.slice.call(arguments));
    console.log(user_info);
    current_user = user_info;
    selectTrack(selected_track_num);
  }

  function onTrackAdded(track_data) {
    var track_elem = createPlaylistTrackItem(playlist_length, track_data);
    playlist.tracks.push(track_data);
    playlist_length = playlist.tracks.length;

    var table_body = ui_playlist.find("tbody")
    table_body.append(track_elem);
  }

  function onTrackDataUpdated(track_data) {
    log_current_fn(arguments.callee.name, Array.prototype.slice.call(arguments));

    var track_num = track_data.playlist_pos;

    updatePlaylistRow(track_num, track_data);
    if(track_num == selected_track_num) {
      selectTrack(track_num);

    }
  }

  function onPlaylistUpdated() {
    
  }

  function onLikeTrack(e) {
    likeTrack(selected_track_num);
  }

  function onPlayTrack(e) {
  	var track_num = $(e.target).parent().data("track-num");
  	playTrack(track_num);
  }

  function onSelectTrack(e) {
    var track_num = $(e.target).parent().data("track-num");
    selectTrack(track_num);
  }

  function onCommentSubmitted(e) {
    var comment = $(e.target).val();
    addComment(selected_track_num, comment);
    ui_comment_field.val("");
    ui_comment_field.blur();
  }

  function onTrackDropped(app) {
		console.log("Track dropped into app");
		console.log(m.application.links);
    var t = m.Track.fromURI(m.application.links[0], function(track_data) {
      console.log(track_data);
      addTrack(track_data);
    });
  }


  function onPlaylistDataReceived(data, textStatus) {
  	log_current_fn(arguments.callee.name, Array.prototype.slice.call(arguments));
    console.log(data);

    playlist = data;
    playlist_length = playlist.tracks.length;

    createPlaylistView(data);

    if(data.tracks.length > 0) {
      selectTrack(0);  
    }
  }

  function onTrackDataReceived(data, textStatus) {
    log_current_fn(arguments.callee.name, Array.prototype.slice.call(arguments));
    showTrackData(data);
  }

  function onTrackLikeResponseReceived(track_data, textStatus) {
    log_current_fn(arguments.callee.name, Array.prototype.slice.call(arguments));
    if (track_data) {
      onTrackDataUpdated(track_data);
    }
  }

  function onTrackCommentResponseReceived(track_data, textStatus) {
    log_current_fn(arguments.callee.name, Array.prototype.slice.call(arguments));
    onTrackDataUpdated(track_data);
  }

  function onTrackPlayResponseReceived(track_data, textStatus) {
    log_current_fn(arguments.callee.name, Array.prototype.slice.call(arguments));
  }

  /*
   * UI INITIALIZATION
   */

  function createPlaylistView(data) {
    log_current_fn(arguments.callee.name, Array.prototype.slice.call(arguments));  

    ui_playlist_container = $("playlist-container");
    ui_playlist = $("#playlist");

    var table_body = ui_playlist.find("tbody")
    table_body.empty();

    // self.playlist = m.Playlist.fromURI("spotify:user:mattias:playlist:1PDwG4hvy5n2pBf93A8R3r");
    // var list = new v.List(playlist);

    for (var i=0; i<data.tracks.length; i++) {
      var track = data.tracks[i];
      var track_elem = createPlaylistTrackItem(i, track);
      table_body.append(track_elem);
    }

    // Set timeout to make sure we have the playlist data 
   //  setTimeout(function() {
   //  	console.log("list length: " + self.playlist.data.length);

	  //   for (var i=0; i < self.playlist.data.length; i++) {
			// 	var track = self.playlist.get(i);
			// 	var track_elem = createPlaylistTrackItem(i, track);
			// 	table_body.append(track_elem);
	  //   }

	  //   $(".playlist-track td").click(onSelectTrack);
		 //  $(".playlist-track td").dblclick(onPlayTrack);
	  // }, 200); 
  }

  function createPlaylistTrackItem(track_num, track) {
    // log_current_fn(arguments.callee.name, Array.prototype.slice.call(arguments));
  	
    var num_likes = track['num_likes'];
		var num_comments = track['num_comments']
		var num_plays = track['num_plays'];

  	var track_data = {
  		'track_num': track_num,
  		'title': track.title,
  		// 'artist': makeArtistString(track.artist),
      'artist': track.artist,
   		'num_likes': num_likes != 0 ? num_likes : "",
   		'num_comments': num_comments != 0 ? num_comments : "",
   		'num_plays': num_plays != 0 ? num_plays : "",
  	}
  	var elem = ich.ich_playlist_track(track_data);

    elem.click(onSelectTrack);
    elem.dblclick(onPlayTrack);

  	return elem;
  }

  function updatePlaylistRow(track_num, track_data) {
    var elem = createPlaylistTrackItem(track_num, track_data);
    $("#track-"+track_num).replaceWith(elem);
  }

  function setupSocialControls() {
    log_current_fn(arguments.callee.name, Array.prototype.slice.call(arguments));

    ui_social_container = $("#track-social-container");
    ui_social = $("#track-social");   
    ui_selected_track_info = $("#track-info");
    ui_track_controls = $("#track-social-info");
    ui_comment_field = $("#track-comment-field");

    ui_like_button = ui_track_controls.find(".action-like");
    ui_comment_button = ui_track_controls.find(".action-comment");

    ui_like_button.click(onLikeTrack);
    ui_comment_button.click(ui_comment_field.focus());

    ui_comment_field.focus(function(e) { $(this).addClass("focused"); });
    ui_comment_field.blur(function(e) { $(this).removeClass("focused"); });
    ui_comment_field.keydown(function(e){
       if(e.keyCode == 13 && !e.shiftKey) { onCommentSubmitted(e); }     
    });
  }

  function showTrackData(track_data) {
    log_current_fn(arguments.callee.name, Array.prototype.slice.call(arguments));
    console.log(track_data);

    ui_social.empty();

    ui_selected_track_info.empty();
    ui_selected_track_info.html(
      ich.ich_track_info(track_data)
    );

    if (track_data['likes'].indexOf(current_user['id']) != -1) {
      console.log("already liked");
      ui_like_button.addClass("sp-flat");
    } else {
      console.log("not liked");
      ui_like_button.removeClass("sp-flat");
    }

    ui_social.append(ich.ich_track_social_comment_header({header: ""+track_data['num_likes']+" Likes"}));
    ui_social.append(ich.ich_track_social_comment_header({header: ""+track_data['num_comments']+" Comments"}));

  	for (var i=0; i<track_data['comments'].length; i++) {
      var comment = track_data['comments'][i]
      comment.timestamp = formatDate(comment.timestamp);
  		var elem = ich.ich_track_social_comment(comment);
  		ui_social.append(elem);
  	}
  }

  /*
   * UTILITY FUNCTIONS
   */ 

  function formatDate(isotimestamp) {
    var d = new Date(isotimestamp);
    return d.toDateString();
  }

  function makeRandomComment() {
    var names = ['Abel Allison', 'Steve Ritter', 'Karthi Karunanidhi', 'Andreas Brandhaugen', 'Ross Wait'];
    var comments = [
      'Dude this is sick...',
      'Hahaha, awesome',
      'Nice',
      'Word, sounds kinda like the Smiths',
      'Thanks for this!'
    ];
    return {
      'author': randomElem(names),
      'comment': randomElem(comments),
    };
  }

  function makeArtistString(artist_arr) {
  	var result = "";
  	for(var i=0; i<artist_arr.length; i++) {
  		var artist = artist_arr[i];
  		result += artist.name + " ";
  	}
  	return result;
  }

  function randomInt(max) {
  	return Math.floor(Math.random()*max);
  }

  function randomElem(arr) {
    return arr[Math.floor(randomInt(arr.length))];
  }

  function log_current_fn(name, args) {
    // var args_str = "";
    // for(var i=0;i<args.length; i++) {
    //   args_str += args[i] + ", ";
    // }
    console.log("" + name + ": " + args.join);
    console.log(args)
  }

  return self;
})();

$(function() {
	Bananaphone.init();
});