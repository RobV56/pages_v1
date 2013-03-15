ourtunez.player.Player = function(domId, playlistId, playlists)
{
    // Private variables.

    var self = {
	player: null,
	playlistId: playlistId,
	entry: {},
	media: null,
	liked: false,
	disliked: false,
	favorite: false,
	playFix: false,
	playFixRequired: false,
	playlists: playlists || [],
	typeDetected: false,
	androidFixNecessary: false
    };

    
    // Private functions.

    // Gingerbread and older native Android browsers have several HTML5 audio bugs
    // that prevent the app from functioning, but there are fixes that we can put in place
    // to work around the problems.
    function isAndroidFixNecessary()
    {
	if (self.typeDetected)
	{
	    return self.androidFixNecessary;
	}

	var ua = navigator.userAgent.toLowerCase();
	var fix = false;

	if ($.jPlayer.platform.android)
	{
	    fix = true;

	    // Firefox on Android
	    if (/gecko\/[0-9.-_]+ firefox\/[0-9.-_]+/.exec(ua))
	    {
		// Firefox on old Android doesn't need the fix, and in fact the fix actually prevents it from working
		fix = false;
	    }
	    // Newer Android
	    else if (/android 4/.exec(ua))
	    {
		// TODO test this on an Android 4 device
		fix = false;
	    }
	}
	else if (/silk/.exec(ua)) // jPlayer doesn't properly detect Kindles as Android
	{
	    fix = true;

	    // Kindle Fire HD
	    if (/android 4/.exec(ua))
	    {
		// TODO test this on a Kindle Fire HD
		fix = false;
	    }
	}

	self.typeDetected = true;
	self.androidFixNecessary = fix;

	return fix;

	// Firefox on Android 2.3.6: Mozilla/5.0 (Android; Mobile; rv:19.0) Gecko/19.0 Firefox/19.0
	// Native browser on Android 2.3.6: Mozilla/5.0 (Linux; U; Android 2.3.6; en-us; SCH-I405 4G Build/FF1) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1
    }

    function play()
    {
	if (isAndroidFixNecessary() && self.playFixRequired)
	{
	    self.playFix = true;
	    console.log("self.playFix = true");
	}
	else
	{
	    self.player.jPlayer("play");
	    console.log("self.player.jPlayer('play')");
	}
    }
    
    function setMedia(media)
    {
	self.media = media;
	resetAndroid();
	self.player.jPlayer("setMedia", self.media);
	console.log("self.player.jPlayer('setMedia')");
	console.log(self.media);
    }

    function urlFromToken(token)
    {
	return "/music/audio/" + token + "/";
    }

    function setNext(entry, textStatus, jqXHR)
    {
	// TODO: check for 500, 405, etc. and retry, show message that can't contact server

	if (!entry.success)
	{
	    $("#skipDisplay").modal();
	    return;
	}

	var title = entry.artistName + " - " + entry.albumName + " - " + entry.songTitle;

	setMedia({
	    title: title,
	    mp3: urlFromToken(entry.token)
	});

	$(".playbar-controls .artist-name").text(entry.artistName.toUpperCase());
	$(".playbar-controls .album-name").text(entry.albumName.toUpperCase());
	$(".playbar-controls .song-title").text(entry.songTitle.toUpperCase());

	play();

	showLikes(entry.songLiked || false, entry.songDisliked || false);
	showFavorite(entry.artistFavorite || false);

	self.entry = entry;
    }

    function loadNext()
    {
	$.getJSON(ourtunez.util.apiUri("playlist/" + self.playlistId + "/next/"), null, setNext);
    }

    function skip()
    {
	$.getJSON(ourtunez.util.apiUri("playlist/" + self.playlistId + "/skip/"), null, setNext);
    }

    function likeReturn(ret, textStatus, jqXHR)
    {
	console.log(ret);
    }

    function showLikes(liked, disliked)
    {
	self.liked = liked;
	self.disliked = disliked;
	$(".jp-like-on").toggle(self.liked);
	$(".jp-like").toggle(!self.liked);
	$(".jp-dislike-on").toggle(self.disliked);
	$(".jp-dislike").toggle(!self.disliked);
    }

    function likeSong(liked, disliked)
    {
	showLikes(liked, disliked);

	var state = (self.liked ? "like" : 
		     self.disliked ? "dislike" :
		     "clear");

	$.getJSON(ourtunez.util.apiUri("song/" + self.entry.songId + "/like/" + state + "/"), null, likeReturn);
    }

    function showFavorite(fav)
    {
	self.favorite = fav;
	$(".jp-favorite-on").toggle(self.favorite);
	$(".jp-favorite").toggle(!self.favorite);
    }

    function favoriteArtist(fav)
    {
	showFavorite(fav);
	$.getJSON(ourtunez.util.apiUri("artist/" + self.entry.artistId + "/fav/" + (self.favorite ? "on" : "off") + "/"), null, likeReturn);
    }

    function switchPlaylist(event)
    {
	var pid = event.target.getAttribute("playlistId");
	if (self.playlistId != pid)
	{
	    self.playlistId = pid;
	}
    }

    function resetAndroid()
    {
	console.log("reset");
	if (isAndroidFixNecessary())
	{
	    self.playFix = false;
	    self.playFixRequired = true;
	    self.endedFix = true;
	}
    }

    self.player = $(domId);

    self.player.jPlayer({
	ready: loadNext,
	swfPath: "/static/js/vendor",
	supplied: "mp3",
	wmode: "window"
    });

    if (isAndroidFixNecessary())
    {
	console.log("setup fixes");

	// Fix playing new media immediately after setMedia.
	self.player.bind($.jPlayer.event.progress, function(event) {
	    if (self.playFixRequired)
	    {
		self.playFixRequired = false;

		if (self.playFix)
		{
		    self.playFix = false;
		    self.player.jPlayer("play");
		}
	    }
	});

	// Fix missing ended events.
	self.player.bind($.jPlayer.event.ended, function(event) {
	    if (self.endedFix)
	    {
		self.endedFix = false;
		setTimeout(function() {
		    self.setMedia(self.media);
		}, 0);
	    }
	});

	self.player.bind($.jPlayer.event.pause, function(event) {
	    if (self.endedFix)
	    {
		var remaining = event.jPlayer.status.duration - event.jPlayer.status.currentTime;
		if (event.jPlayer.status.currentTime === 0 || remaining < 1)
		{
		    setTimeout(function() {
			//self.player.jPlayer._trigger($.jPlayer.event.ended);
		    }, 0);
		}
	    }
	});
    }

    // TODO: bind the player errors too to catch streams that get cut.

    self.player.bind($.jPlayer.event.ended, loadNext);

    $(".jp-like").click(function() {
	likeSong(true, false);
	$(this).blur();
	return false;
    });

    $(".jp-like-on").click(function() {
	likeSong(false, false);
	$(this).blur();
	return false;
    });

    $(".jp-dislike").click(function() {
	likeSong(false, true);
	$(this).blur();
	return false;
    });

    $(".jp-dislike-on").click(function() {
	likeSong(false, false);
	$(this).blur();
	return false;
    });

    $(".jp-favorite").click(function() {
	favoriteArtist(true);
	$(this).blur();
	return false;
    });

    $(".jp-favorite-on").click(function() {
	favoriteArtist(false);
	$(this).blur();
	return false;
    });

    $(".jp-next").click(function() {
	skip();
	$(this).blur();
	return false;
    });

    //$('#playlist-dropdown a.playlist-item').click(switchPlaylist);
    

    //    TODO: hook the progress/timeupdate events to manage security
    //    TODO: unbind the click events on the progress bar

    return {
	skipNext: function()
	{
	    skip();
	},
	loadNext: function()
	{
	    loadNext();
	}
    };
}
