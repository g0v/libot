const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

  /**
   * Prints the names and majors of students in a sample spreadsheet:
   * @see https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
   * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
   */
function listMajors(oAuth2Client,sheetID) {
    const sheets = google.sheets({version: 'v4', auth: oAuth2Client});
    sheets.spreadsheets.values.get({
      spreadsheetId: sheetID,
      range: 'DEMO!A1:N100',
    }, (err, res) => {
      if (err) return console.log('The API returned an error: ' + err);
      const rows = res.data.values;
      if (rows.length) {
        console.log('Name, Major:');
        // Print columns A and E, which correspond to indices 0 and 4.
        rows.map((row) => {
          console.log(`${row[0]}, ${row[4]}`);
        });
      } else {
        console.log('No data found.');
      }
    }); // end get callback
}

class GoogleSheetAdapter {
  constructor(credentialsPath,sheetID){
    this.credentialsPath = credentialsPath;
    this.sheetID = sheetID;
    this.credentials = undefined;
    this.oAuth2Client = undefined;
    
    // Load client secrets from a local file.
    fs.readFile(this.credentialsPath, (err, content) => {
      if (err) return console.log('Error loading client secret file:', err);
      // Authorize a client with credentials, then call the Google Sheets API.
      this.credentials = JSON.parse(content);
      this.authorize(listMajors);
    });
  }
  
  /**
   * Get and store new token after prompting for user authorization, and then
   * execute the given callback with the authorized OAuth2 client.
   * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
   * @param {getEventsCallback} callback The callback for the authorized client.
   */
  getNewToken(callback) {
    const authUrl = this.oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
    });
    console.log('Authorize this app by visiting this url:', authUrl);
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question('Enter the code from that page here: ', (code) => {
      rl.close();
      this.oAuth2Client.getToken(code, (err, token) => {
        if (err) return console.error('Error while trying to retrieve access token', err);
        this.oAuth2Client.setCredentials(token);
        // Store the token to disk for later program executions
        fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
          if (err) return console.error(err);
          console.log('Token stored to', TOKEN_PATH);
        });
        callback(this.oAuth2Client,this.sheetID);
      });
    });
  }
  
  /**
   * Create an OAuth2 client with the given credentials, and then execute the
   * given callback function.
   * @param {Object} credentials The authorization client credentials.
   * @param {function} callback The callback to call with the authorized client.
   */
  authorize(callback) {
    const {client_secret, client_id, redirect_uris} = this.credentials.installed;
    this.oAuth2Client = new google.auth.OAuth2(
        client_id, client_secret, redirect_uris[0]);

    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, (err, token) => {
      if (err) return this.getNewToken(callback);
      this.oAuth2Client.setCredentials(JSON.parse(token));
      callback(this.oAuth2Client,this.sheetID);
    });
  }
  

  
}



let temp = new GoogleSheetAdapter('credentials.json','1AJepb9l1DDFQ0rvGI6x22YCtSKMUM4LhSZyYyBMmGE8');









