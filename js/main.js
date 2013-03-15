// ourtunez namespace.
ourtunez = {};
ourtunez.player = {};

ourtunez.config = {
    apiVersion: "v1"
};

ourtunez.util = {};

ourtunez.util.apiUri = function(uri)
{
    return "/api/" + ourtunez.config.apiVersion + "/" + uri;
}

$(document).ready(function() {
    if (ourtunez.player.Player)
    {
	var player = new ourtunez.player.Player("#jquery_jplayer_1", 1);
    }
});
