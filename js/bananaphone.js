var Bananaphone = (function() {
  var SERVER_URL = "http://localhost:5000/";
  
  var self = {};

  var sp = getSpotifyApi(1);
	var m = sp.require("sp://import/scripts/api/models");
	var v = sp.require("sp://import/scripts/api/views");
	var fx = sp.require('sp://import/scripts/fx');
	var ui = sp.require('sp://import/scripts/ui');

	var selected_track_num;
  var selected_track_row;
	var playing_track_num;
  var playing_track_row;

	var ui_playlist;
	var ui_social;
	var ui_social_container;

  self.init = function() {

    log_current_fn(arguments.callee.name, Array.prototype.slice.call(arguments));

  	fetchList();

  	// When a track is dropped on the app from spotify
  	m.application.observe(m.EVENT.LINKSCHANGED, onTrackDropped);
  };

  function selectTrack(track_num) {
  	log_current_fn(arguments.callee.name, Array.prototype.slice.call(arguments));

  	if(selected_track_row) {
  		selected_track_row.removeClass("selected");	
  	}
  
  	var row = $("#track-"+track_num);
  	row.addClass("selected");

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

  function fetchList() {
    log_current_fn(arguments.callee.name, Array.prototype.slice.call(arguments));

  	var url = SERVER_URL;
  	$.ajax({
      dataType: "json",
      url: url,
      data: {},
      success: onPlaylistDataReceived,
    });
  }

  function fetchTrackData(track_num) {
    log_current_fn(arguments.callee.name, Array.prototype.slice.call(arguments));

  	var url = SERVER_URL + "track/" + track_num;
  	$.ajax({
      dataType: "json",
      url: url,
      data: {
      	'track_num': track_num,
      },
      success: onTrackDataReceived,
    });
  }

  function likeTrack(track_num) {
    log_current_fn(arguments.callee.name, Array.prototype.slice.call(arguments));

  	var url = SERVER_URL + "track/" + track_num + "/like";
  	$.ajax({
      dataType: "json",
      url: url,
      data: {
      	'track_num': track_num,
      },
      success: onTrackLikeResponseReceived,
    });
  }

  function addComment(track_num, comment) {
    log_current_fn(arguments.callee.name, Array.prototype.slice.call(arguments));

  	var url = SERVER_URL + "track/" + track_num + "/addcomment";
  	$.ajax({
      dataType: "json",
      url: url,
      data: {
      	'track_num': track_num,
      	'author': "Abel Allison", // TODO
      	'comment': comment,
      },
      success: onTrackCommentResponseReceived,
    });
  }

  function addToPlayCount(track_num) {
    log_current_fn(arguments.callee.name, Array.prototype.slice.call(arguments));

  	var url = SERVER_URL + "track/" + track_num + "/play";
  	$.ajax({
      dataType: "json",
      url: url,
      data: {
      	'track_num': track_num,
      	'author': "Abel Allison" // TODO
      },
      success: onTrackPlayResponseReceived,
    });
  }

  /*
   * HANDLERS
   */

  function onTrackDataUpdated(track_data) {

  }

  function onPlaylistUpdated() {
    
  }

  function onPlayTrack(e) {
  	var track_num = $(this).parent().data("track-num");
  	playTrack(track_num);
  }

  function onSelectTrack(e) {
    var track_num = $(this).parent().data("track-num");
    selectTrack(track_num);
  }

  function onCommentSubmitted(e) {
    var comment = $(this).html();
    addComment(selected_track_num, comment);
  }

  function onTrackDropped(app) {
		console.log("Track dropped into app");
		console.log(m.application.links);
  }


  function onPlaylistDataReceived(data, textStatus) {
  	createPlaylistView(data);
  }

  function onTrackDataReceived(data, textStatus) {
    showTrackData(data);
  }

  function onTrackLikeResponseReceived(data, textStatus) {

  }

  function onTrackCommentResponseReceived(data, textStatus) {

  }

  function onTrackPlayResponseReceived(data, textStatus) {

  }

  /*
   * UI INITIALIZATION
   */

  function createPlaylistView(data) {
    log_current_fn(arguments.callee.name, Array.prototype.slice.call(arguments));  

    ui_playlist_container = $("playlist-container");
    ui_playlist = $("#playlist");

    self.playlist = m.Playlist.fromURI("spotify:user:mattias:playlist:1PDwG4hvy5n2pBf93A8R3r");
    // var list = new v.List(playlist);

    var table_body = ui_playlist.find("tbody")
    table_body.empty();

    // Set timeout to make sure we have the playlist data 
    setTimeout(function() {
    	console.log("list length: " + self.playlist.data.length);

	    for (var i=0; i < self.playlist.data.length; i++) {
				var track = self.playlist.get(i);
				var track_elem = createPlaylistTrackItem(i, track);
				table_body.append(track_elem);
	    }

	    $(".playlist-track td").click(onSelectTrack);
		  $(".playlist-track td").dblclick(onPlayTrack);
	  }, 200); 
  }

  function createPlaylistTrackItem(track_num, track) {
    log_current_fn(arguments.callee.name, Array.prototype.slice.call(arguments));
  	
    var num_likes = randomInt(6);
		var num_comments = randomInt(4);
		var num_plays = randomInt(20);

  	var track_data = {
  		'track_num': track_num,
  		'title': track.data.name,
  		'artist': makeArtistString(track.data.artists),
   		'num_likes': num_likes != 0 ? num_likes : "",
   		'num_comments': num_comments != 0 ? num_comments : "",
   		'num_plays': num_plays != 0 ? num_plays : "",
  	}
  	var elem = ich.ich_playlist_track(track_data);

  	return elem;
  }

  function showTrackData(track_data) {
    log_current_fn(arguments.callee.name, Array.prototype.slice.call(arguments));

  	ui_social_container = $("#track-social-container");
  	ui_social = $("#track-social");  	
    ui_comment_field = $("#track-comment-field");

    ui_social.empty();

  	for (var i=0; i<10; i++) {
  		var elem = ich.ich_track_social_comment(makeRandomComment());
  		ui_social.append(elem);
  	}

    ui_comment_field.focus(function(e) { $(this).addClass("focused"); });
    ui_comment_field.blur(function(e) { $(this).removeClass("focused"); });
    ui_comment_field.keypress(function(e){
       if($(this).keyCode == 13) { onCommentSubmitted(e); }     
    });
  }

  /*
   * UTILITY FUNCTIONS
   */ 

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
  }

  return self;
})();

$(function() {
	Bananaphone.init();
});