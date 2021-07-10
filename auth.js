const fs = require('fs');
const path = require('path');



const keyPath = path.join(__dirname, 'client_secret.json');
let keys = {redirect_uris: ['']};
if (fs.existsSync(keyPath)) {
  keys = require(keyPath).web;
}



const oauth2Client = new google.auth.OAuth2(
  keys.client_id,
  keys.client_secret,
  keys.redirect_uris[0]
);

const scopes = [
  'https://www.googleapis.com/auth/contacts.readonly',
  'https://www.googleapis.com/auth/user.emails.read',
  'profile',
];


google.options({auth: oauth2Client});



async function authenticate(scopes){
  return new Promise((resolve, reject) => {
  });
}
