var youtube_node = require('youtube-node');
var ConfigFile = require("./json_config.json");
var mybot = require("./mybot.js");

function myyt () {
	this.youtube = new youtube_node();
	this.youtube.setKey(ConfigFile.youtube_api_key);
  this.vidid = "";
}

myyt.prototype.respond = function(query, msg) {
  this.youtube.search(query, 1, function(error, result) {
    if (error) {
      msg.channel.sendMessage("There was an error finding requested video.");
    } else {
			if (result.items.length === 0) {
				console.log(result + " is a meme");
				let k = "nores";
				return k;
			} else {
				vidid = result.items[0].id.videoId;
				vidtitle = result.items[0].snippet.title;
				vid = [vidid, vidtitle];
				return vid;
			}
    }
  });
};

module.exports = myyt;
