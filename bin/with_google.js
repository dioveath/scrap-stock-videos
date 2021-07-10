var fs = require("fs");
var url = require("url");
var http = require('http');
var open = require('open');
var path = require('path');
const util = require('util');
const destroyer = require('server-destroy');

var { google } = require("googleapis");
var OAuth2 = google.auth.OAuth2;
const readFilePromise = util.promisify(fs.readFile);



const SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube',  
  'https://www.googleapis.com/auth/plus.login',
];

var TOKEN_DIR = "/.credentials/";
var TOKEN_PATH = TOKEN_DIR + "freevideos_token.json";

async function getAuthorizedClient() {
  try {
    var content = await readFilePromise('client_secret.json');
    return authorize(JSON.parse(content));
  } catch(error){
    console.log("Error loading client secret file: " + error);
    return false;
  }
}


async function authorize(credentials) {
  var clientSecret = credentials.web.client_secret;
  var clientId = credentials.web.client_id;
  var redirectUrl = credentials.web.redirect_uris[0];

  var oauth2Client = new OAuth2(clientId, clientSecret, redirectUrl);

  try {
    // Check if we have previously stored a token.
    var token = await readFilePromise(TOKEN_PATH);
    console.log("Got token from - " + path.resolve(TOKEN_PATH));
    oauth2Client.credentials = JSON.parse(token);
  } catch(error){
    var tokens = await getNewToken(oauth2Client);
    oauth2Client.credentials = tokens;
    storeToken(tokens);    
  }
  return oauth2Client;
}

async function getNewToken(oauth2Client) {
  return new Promise((resolve, reject) => {
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: SCOPES,
    });
    const server = http.createServer(async (req, res) => {
      try {
        if (req.url.indexOf("/auth/google/callback") > -1) {
          const qs = new url.URL(req.url, 'http://localhost:3333').searchParams;
          res.end('Authenication successful! Please return to the console');
          server.destroy();
          const {tokens} = await oauth2Client.getToken(qs.get('code'));
          // oauth2Client.credentials = tokens;
          resolve(tokens);
        }
      } catch (e) {
        reject(e);
      }
    }).listen(3333, ()=> {
      open(authUrl, {wait: false}).then(cp => cp.unref());
    });
    destroyer(server);
  });
}

function storeToken(tokens) {
  try {
    fs.mkdirSync(TOKEN_DIR);
  } catch (error) {
    if (error.code != "EEXIST") {
      throw error;
    }
  }

  fs.writeFile(TOKEN_PATH, JSON.stringify(tokens), (error) => {
    if (error) throw error;
    console.log("Token stored to " + TOKEN_PATH);
  });
}



exports.getAuthorizedClient = getAuthorizedClient;


