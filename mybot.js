var Discord = require("discord.js");
var bot = new Discord.Client();
var yt = require("./youtubetest.js");
var youtubetest = new yt();
var fs = require('fs');
var datafile;
datafile = JSON.parse(fs.readFileSync('userdata.json', 'utf8'));
var Downloader = require("./Downloader.js");
var dl = new Downloader();
var prefix = "!";
var VChannel;
var tChannel;
var playlist = new Array;
var dispatchers = new Discord.Collection();
var msg;
var userdata;

//~~~~~~COMMANDS~~~~~~
var commands = {
  help: {
    name: "!help <level>(optional)",
    fnc: "Displays available commands. If you omit the level it will default to the users level.",
    level: 1,
    process: function(msg, query) {
      var level = userdata.level;
      let qrylevel = query.substring(5);
      if (qrylevel) {level = qrylevel};
      var cmdlength = Object.keys(commands).length;
      var msgs = ["```"];
      for (i = 0; i < cmdlength; i++) {
      var item = commands[Object.keys(commands)[i]];
        if (item.level <= level) {
          msgs.push(item.name + ": " + item.fnc);
          msgs.push(" ");
        }
      };
      msgs.push("```");
      return msgs;
    }
  },
  ping: {
    name: "!ping",
    fnc: 'Responds with "pong" when pinged.',
    level: 1,
    process: function(msg) {
      var msgs = [];
      msgs.push("pong!");
      return msgs;
    }
  },
  shutdown: {
    name: "!shutdown",
    fnc: "Shuts down the bot.",
    level: 3,
    process: function(msg) {
      playlist.splice(0, playlist.length);
      VChannel.leave();
      msg.channel.sendMessage("Goodbye. Logging off.");
      bot.destroy((err) => {console.log(err)});
    }
  },
  play: {
   name: "!play <query>",
   fnc: "Plays a Youtube video matching given tags.",
   level: 2,
   process: function(msg, query) {
     if (VChannel.connection) {
       query = query.split("play ")[1];
       if (query.slice(24, 32) === "playlist" || query.slice(16, 24) === "playlist") {
         msg.channel.sendMessage("Playlists are not currently supported.");
      } else if (query.slice(0, 4) === "http" || query.slice(0,3) === "www") {
        query = query.slice(-11);
        processquery(msg, query);
      } else {
        processquery(msg, query);
      }
     } else {
       msg.channel.sendMessage("I am not connected to a voice channel.");
     }
   }
  },
  summon: {
    name: "!summon <voice channel>",
    fnc: "Summons the bot to the voice channel specified. If blank joins user's voice channel if the user is connected to one.",
    level: 2,
    process: function(msg, query) {
      query = query.split(" ")[1];
      if (typeof(query) === 'undefined') {
        var userid = msg.author.id;
        var chnls = msg.guild.channels.findAll("type", "voice");
        for (i = 0; i < chnls.length; i++) {
          if (chnls[i].members.get(userid)) {
            chnls[i].join();
            VChannel = chnls[i];
            break;
          } else {
            console.log("User not in channel. Checking next channel");
          }
        }
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
    level: 2,
    process: function(msg) {
      VChannel.leave();
    }
  },
  pause: {
    name: "!pause",
    fnc: "Pauses the current song.",
    level: 2,
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
    level: 2,
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
    level: 1,
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
    level: 3,
    process: function(msg) {
      if (dispatchers.get(1) === "undefined"){}else{
        dispatchers.get(1).end();
      }
    }
  },
  volume: {
    name: "!volume <volume out of 100>",
    fnc: "Sets the audio streams volume.",
    level: 3,
    process: function(msg, query) {
      query = query.substring(6);
      var voice = dispatchers.get(1);
      if (!voice) {
        msg.channel.sendMessage("There is no song currently playing.");
      } else {
        if (query === "") {
          msg.channel.sendMessage("Current volume is: " + voice.volume*100);
        } else if (query < 1 || query > 100 || isNaN(query === true)) {
          msg.channel.sendMessage("Invalid volume.");
        } else {
          query = Math.floor(query);
          var i = query/100;
          voice.setVolume(i);
          msg.channel.sendMessage("Volume set to " + query + "%");
        }
      }
    }
  },
  exit: {
    name: "!exit",
    fnc: "Exits the server the message comes from.",
    level: 4,
    process: function(msg) {
      msg.guild.leave().catch(console.error);
      bot.destroy((err) => {console.log(err)});
    }
  },
  refreshjson: {
    name: "!refreshjson",
    fnc: "Refreshes the userdata JSON file.",
    level: 3,
    process: function(msg) {
      datafile = JSON.parse(fs.readFileSync('userdata.json', 'utf8'));
      msg.channel.sendMessage("Refreshed JSON file.");
    }
  },
  setlevel: {
    name: "!setlevel <1-4> <user>",
    fnc: "Sets the level for the specified user.",
    level: 4,
    process: function(msg, query) {
      let level = query.substring(9,10);
      if (level < 1 || level > 4) {
        msg.channel.sendMessage("The specified level is not valid.")
      }
      console.log(level);
      let username = query.substring(11);
      console.log(username);
      let userid = bot.users.find("username", username).id;
      datafile[userid] = {"level": level, "username": username};
      fs.writeFile('userdata.json', JSON.stringify(datafile), console.error);
      msg.channel.sendMessage("Set " + username + "'s level to " + level);
    }
  },
  level: {
    name: "!level <username>",
    fnc: "Returns the user's level.",
    level: 1,
    process: function(msg, query) {
      let username = query.substring(6);
      if (!username) {
        username = msg.author.username;
        msg.channel.sendMessage(username + "'s level is: " + userdata.level)
      } else {
        let userid = bot.users.find("username", username).id;
        if (!userid) {
          msg.channel.sendMessage("There is no user with the username: " + username)
        } else {
          let usrdata = datafile[userid];
          msg.channel.sendMessage(username + "'s level is: " + usrdata.level);
        }
      }
    }
  },
  remove: {
    name: "!remove <songs_id_in_queue>",
    fnc: "Removes the specified song from the queue based on the song's place in the queue.",
    level: 3,
    process: function(msg, query) {
      query = query.substring(7)-1;
      if (isNaN(query)) {
        msg.channel.sendMessage("The query is not a number!")
      } else if (query < 0 || query > playlist.length-1) {
        msg.channel.sendMessage("There is no song with the id in the queue!");
      } else {
        msg.channel.sendMessage(playlist[query].vidtitle + " was removed from the queue.");
        playlist.splice(query, 1);
      }
    }
  }
};


bot.on('ready', () => {
  VChannel = bot.channels.find("name", "General");
  tChannel = bot.channels.find(val => val.type === 'text');
  tChannel.sendMessage("I am ready!");
  console.log('I am ready!');
});

bot.on("message", msg => {
  if (msg.author.bot || (msg.author.id === bot.user.id)) return;
  userdata = datafile[msg.author.id];
  if (!userdata) {
    datafile[msg.author.id] = {"level": 1, "username": msg.author.username};
    userdata = datafile[msg.author.id];
    let msgs = [];
    msgs.push("You must be new, you do not have any data, I have assigned you a Level 1, meaning you can do these things:")
    msgs.push(" ")
    var cmdlength = Object.keys(commands).length;
    for (i = 0; i < cmdlength; i++) {
      var item = commands[Object.keys(commands)[i]];
      if (item.level <= 1) {
          msgs.push(item.name + ": " + item.fnc);
          msgs.push(" ");
        }
      };
    msgs.push(" ");
    msgs.push("Have fun!");
    msg.channel.sendMessage(msgs);
    fs.writeFile('userdata.json', JSON.stringify(datafile), console.error);
    checkmsg(msg);
  } else {
    checkmsg(msg);
  }
  function checkmsg(msg) {
    if(!msg.content.startsWith(prefix) || msg.author.bot || (msg.author.id === bot.user.id)) return;
    msg = msg;
    var cmdraw = msg.content.split(" ")[0].substring(1).toLowerCase();
    var query = msg.content.split("!")[1];
    var cmd = commands[cmdraw];
    if (cmd) {
      if (cmd.level <= userdata.level) {
        var res = cmd.process(msg, query, bot);
        if (res) {
          msg.channel.sendMessage(res);
        }
      } else if (cmd.level > userdata.level) {
        let msgs = [];
        msgs.push("The required level to use the command " + cmd.name + " is " + cmd.level);
        msgs.push(" ");
        msgs.push("Your current level is: " + userdata.level);
        msg.channel.sendMessage(msgs);
      }
    } else {
      let query = "help";
      let msgs = [];
      msgs.push(msg.content + " is not a valid command.");
      msgs.push(" ");
      msgs.push("Available commands:");
      msgs.push(" ");
      msg.channel.sendMessage(msgs);
      msg.channel.sendMessage(commands.help.process(msg, query));
    }
  }
});


// Functions

function processquery(msg, query) {
 vid = youtubetest.respond(query, msg);
 jog(msg);
 function jog(msg) {
   if (typeof(vid) === 'undefined') {
     console.log('Video ID is undefined. Checking Again in 0.1 seconds.');
     setTimeout(jog, 100);
   } else if (vid === "nores") {
      msg.channel.sendMessage("There were no results found.");
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
          tChannel.sendMessage("Downloading: " + vidtitle + ". Please be patient.");
         dlyt(vidid, vidtitle, msg);
       } else {
         console.log('Some other error: ', err.code);
       }
     });
   }
 }
}

function dlyt(vidid, vidtitle, msg) {
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
