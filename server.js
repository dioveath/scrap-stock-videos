const fs = require('fs');
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const {flash} = require("express-flash-message");

const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth").OAuth2Strategy;
const LocalStrategy = require('passport-local').Strategy;

const {google} = require("googleapis");

var OAuth2 = google.auth.OAuth2;
const env = require("dotenv");

const app = express();

env.config({debug: false});

const scopes = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube',  
  'https://www.googleapis.com/auth/plus.login',
];


const googleStrategy = new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: process.env.REDIRECT_URL,   
}, function (accessToken, refreshToken, profile, done){
  return done(null, {
    username: profile.displayName,
    token: accessToken,
  });
});

app.use(session({secret: "charicha"}));
app.use(flash());
app.use(bodyParser.urlencoded({extended: false}));

passport.use(googleStrategy);
// passport.use(localStrategy);

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, {
    username: user.username,
    token: user.token,
  });
});

app.use(express.json());

app.get("/", (req, res) => {
  res.send(`
<center> <h1><a href='http://localhost:3333/auth/google/login'>Login With Google<a/><h1/> <center/>
`);
});


// Google Auth
app.get("/auth/google/login", passport.authenticate('google', {scope: scopes}));
app.get("/auth/google/callback",
	passport.authenticate('google', {
	  failureRedirect: '/fail',
          failureFlash: "Failure Flash"
	}),
	function(req, res){
	  res.redirect("/home");
	});


app.get("/auth/logout", (req, res) => {
  req.logout();
  res.redirect("/");
});


app.get("/home",
        function(req, res, next) {
	  if (req.user == undefined)
	    res.send("Unauthorized you are!");
          else 
	    next();
	}, (req, res)=>{
          res.send(`Welcome ${req.user.username} <br/>`);
          uploadMedia(req.user.token,
                      "Snow Slowly Falling Down.mp4",
                      (evt) => {
                        const progress = (evt.bytesRead);
                        console.log(`${Math.round(progress)}bytes Uploaded`);
                      }
                     ).catch(console.error);
        });

app.get("/fail", (req, res)=>{
  res.send("Login Failed ");
});


app.listen(3333, ()=> console.log("listening @ http://localhost:3333"));


function getChannel(accessToken) {
  var service = google.youtube('v3');
  var client = new OAuth2(process.env.CLIENT_ID,
                          process.env.CLIENT_SECRET,
                          process.env.REDIRECT_URL);
  client.credentials = {
    access_token: accessToken,
  };
  
  service.channels.list({
    auth: client,
    part: 'snippet,contentDetails,statistics',
    mine: true,
  }, function(err, response) {
    if (err) {
      console.log('The API returned an error: ' + err);
      return;
    }
    // console.log(channels);
    var channels = response.data.items;
    if (channels.length == 0) {
      console.log ('No channel found.');
    } else {
      console.log ('This channel\'s ID is %s. Its title is \'%s\', and ' +
                   'it has %s views.',
                   channels[0].id,
                   channels[0].snippet.title,
                   channels[0].statistics.viewCount);
    }
  });
}


async function uploadMedia(accessToken, fileName, onProgressCallback){
  var service = google.youtube('v3');
  var client = new OAuth2(process.env.CLIENT_ID,
                          process.env.CLIENT_SECRET,
                          process.env.REDIRECT_URL);
  client.credentials = {
    access_token: accessToken,
  };

  const fileSize = fs.statSync(fileName).size;

  console.log(fileSize);

  const res = await service.videos.insert({
    auth: client,
    part: 'id,snippet,status',
    notifySubscribers: false,
    requestBody: {
      snippet: {
        title: 'Node.js YouTube Upload Test',
        description: 'Testing YouTube upload via Google APIs Node.js Client',
      },
      status: {
        privacyStatus: 'private',
      },
    },
    media: {
      body: fs.createReadStream(fileName)
    }
  },{
    onUploadProgress: onProgressCallback,
  });

  console.log('\n\n');
  console.log(res.data);
  return res.data;
}
