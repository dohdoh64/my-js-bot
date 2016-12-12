var Discord = require("discord.js");
var bot = new Discord.Client();
var yt = require("./youtubetest.js");
var youtubetest = new yt();
var fs = require('fs');
var Downloader = require("./Downloader.js");
var dl = new Downloader();
var prefix = "!";
var VChannel;
var tChannel;
var playlist = new Array;
var dispatchers = new Discord.Collection();

//~~~~~~COMMANDS~~~~~~
var commands = {
  help: {
    name: "!help",
    fnc: "Displays available commands.",
    process: function(msg) {
      var cmdlength = Object.keys(commands).length;
      var msgs = [];
      for (i = 0; i < cmdlength; i++) {
        var item = commands[Object.keys(commands)[i]];
          msgs.push(item.name + ": " + item.fnc);
          msgs.push(" ");
        };
      return msgs;
    },
  },
  ping: {
    name: "!ping",
    fnc: 'Responds with "pong" when pinged.',
    process: function(msg) {
      var msgs = [];
      msgs.push("pong!");
      return msgs;
    },
  },
  shutdown: {
    name: "!shutdown",
    fnc: "Shuts down the bot.",
    process: function(msg) {
      playlist.splice(0, playlist.length);
      msg.channel.sendMessage("Goodbye. Logging off.");
      bot.destroy((err) => {console.log(err)});
    }
  },
  play: {
   name: "!play <query>",
   fnc: "Plays a Youtube video matching given tags.",
   process: function(msg, query) {
     if (VChannel.connection) {
       vid = youtubetest.respond(query, msg);
       jog(msg);
       function jog(msg) {
         if (typeof(vid) === 'undefined') {
           console.log('Video ID is undefined. Checking Again in 0.1 seconds.');
           setTimeout(jog, 100);
         } else {
           vidid = vid[0];
           vidtitle = vid[1];
           console.log('Video ID is defined: ' + vidid + " and the title is " + vidtitle);
           var url = "./music_files/" + vidid + '.mp3';
           fs.stat(url, function(err, stat) {
             if (err === null) {
               console.log("File already exists!");
               add2Playlist(vidid, vidtitle);
             } else if(err.code === 'ENOENT') {
               console.log("Downloading File.");
               dlyt(vidid, vidtitle);
             } else {
               console.log('Some other error: ', err.code);
             }
           });
         }
       };
     } else {
       msg.channel.sendMessage("I am not connected to a voice channel.");
     }
   }
  },
  summon: {
    name: "!summon <voice channel>",
    fnc: "Summons the bot to the voice channel specified.",
    process: function(msg, query) {
      query = query.split(" ")[1];
      if (typeof(query) === 'undefined') {
        msg.channel.sendMessage("No channel defined!");
      } else {
        query = query.toLowerCase();
        if (query === 'general') {
          VChannel.join();
        } else {
          msg.channel.sendMessage("Invalid Voice Channel.");
        }
      }
    }
  },
  leave: {
    name: "!leave",
    fnc: "Makes the bot leave the current voice channel.",
    process: function(msg) {
      playlist.splice(0, playlist.length);
      VChannel.leave();
    }
  },
  pause: {
    name: "!pause",
    fnc: "Pauses the current song.",
    process: function(msg) {
      if (dispatchers.get(1).paused) {
        msg.channel.sendMessage("Song is already paused!");
      } else {
        dispatchers.get(1).pause();
      }
    }
  },
  resume: {
    name: "!resume",
    fnc: "Resumes the current song.",
    process: function(msg) {
      if (dispatchers.get(1).paused) {
        dispatchers.get(1).resume();
      } else {
        msg.channel.sendMessage("Song is already playing!");
      }
    }
  },
  queue: {
    name: "!queue",
    fnc: "Lists all items in the playlist.",
    process: function(msg) {
      if(playlist.length > 0) {
        textarray = [];
        for (i = 0; i < playlist.length; i++) {
          textarray.push((i+1) + ": " + playlist[i].vidtitle);
        }
        msg.channel.sendMessage(textarray);
      } else {
        msg.channel.sendMessage("There are no items in the queue.");
      }
    }
  },
  skip: {
    name: '!skip',
    fnc: "Skips the current song.",
    process: function(msg) {
      if (dispatchers.get(1) === "undefined"){}else{
        dispatchers.get(1).end();
      }
    }
  },
};


bot.on('ready', () => {
  VChannel = bot.channels.find("name", "General");
  tChannel = bot.channels.find(val => val.type === 'text');
  tChannel.sendMessage("I am ready!");
  console.log('I am ready!');
});

bot.on("message", msg => {
  if(!msg.content.startsWith(prefix) || msg.author.bot || (msg.author.id === bot.user.id)) return;

  var cmdraw = msg.content.split(" ")[0].substring(1).toLowerCase();
  var query = msg.content.split("!")[1];
  var cmd = commands[cmdraw];
  if (cmd) {
    var res = cmd.process(msg, query, bot);
    if (res) {
      msg.channel.sendMessage(res);
    }
  } else {
    let msgs = [];
    msgs.push(msg.content + " is not a valid command.");
    msgs.push(" ");
    msgs.push("Available commands:");
    msgs.push(" ");
    msg.channel.sendMessage(msgs);
    msg.channel.sendMessage(commands.help.process(msg));
  }
});


// Functions

function dlyt(vidid, vidtitle) {
  var i = 0;
  dl.getMP3({videoId: vidid, name: vidid + ".mp3"}, function(err,res){
    i++;
    if(err)
    throw err;
    else{
      console.log("Song was downloaded: " + res.file);
      add2Playlist(vidid, vidtitle);
    }
  });
};

function play(vidid, vidtitle) {
  var dispatcher = VChannel.connection.playFile("./music_files/" + vidid + ".mp3");
  dispatchers.set(1, dispatcher);
  console.log("Now playing: " + vidtitle);
  tChannel.sendMessage("Now playing: " + vidtitle);
  dispatchers.get(1).on("end", () => {
    if (!VChannel.connection){}else{
      playlist.splice(0, 1);
      if (playlist.length === 0) {
        tChannel.sendMessage("Nothing more in the queue!");
        dispatchers.set(1, "undefined");
      } else {
        vidid = playlist[0].vidid;
        vidtitle = playlist[0].vidtitle;
        play(vidid, vidtitle);
      }
    }
  });
};

function add2Playlist(vidid, vidtitle) {
  if (VChannel.connection) {
    playlist.push({'vidid': vidid, 'vidtitle': vidtitle});
    if(playlist.length === 1) {
      play(vidid, vidtitle);
    } else {
      tChannel.sendMessage("Queued " + playlist[playlist.length-1].vidtitle + ".");
    }
  } else {
    tChannel.sendMessage("I am not connected to a voice channel.");
  }
};

bot.on('error', e => { console.error(e); });
bot.login("your_bot_token");
