const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

const COLUMN_MAP = {
  "案件編號":0,
  "行政區":1,
  "里別":2,
  "陳情者":3,
  "類別":4,
  "狀態":12,
  "結案":13
};

class GoogleSheetAdapter {
  constructor(credentialsPath,sheetID){
    this.credentialsPath = credentialsPath;
    this.sheetID = sheetID;
    this.credentials = undefined;
    this.oAuth2Client = undefined;   
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
    // Load client secrets from a local file.
    fs.readFile(this.credentialsPath, (err, content) => {
      if (err) return console.log('Error loading client secret file:', err);
      // Authorize a client with credentials, then call the Google Sheets API.
      this.credentials = JSON.parse(content);
      const {client_secret, client_id, redirect_uris} = this.credentials.installed;
      this.oAuth2Client = new google.auth.OAuth2(
          client_id, client_secret, redirect_uris[0]);

      // Check if we have previously stored a token.
      fs.readFile(TOKEN_PATH, (err, token) => {
        if (err) return this.getNewToken(callback);
        this.oAuth2Client.setCredentials(JSON.parse(token));
        callback();
      });
    });
  }
  
   getSpreadSheets(callbackForRows){
	console.log("getSpreadSheets start")
    this.authorize(()=>{
      var sheets = google.sheets({version: 'v4', auth: this.oAuth2Client});
      sheets.spreadsheets.values.get({
          spreadsheetId: this.sheetID,
          range: 'DEMO!A1:N100',
      }, (err, res) => {
        if (err) return console.log('The API returned an error: ' + err);
        const rows = res.data.values;
		console.log("getSpreadSheets cb start")
        callbackForRows(rows);
		console.log("getSpreadSheets cb end")
      }); // end get sheets
    }); // end authorize
	console.log("getSpreadSheets end")
  }
  
  getAttributeByID(id,callbackForEachRow){ 
    this.getSpreadSheets(function(rows){
      rows.forEach(row => {
        if ( id == parseInt(row[0]) ) callbackForEachRow(row);
      }); // end each row
    }); 
  }

  getAttributeByFilter(columnName,columnValue, callbackForEachRow){

	  console.log(["getAttributeByFilter start", columnName, columnValue, callbackForEachRow]);
      if (columnName && columnValue) {
		  var columnNum = COLUMN_MAP[columnName];
		   this.getSpreadSheets(function(rows){    
		    rows.forEach(async row => {
			  if ( row[columnNum] == columnValue ) {
				  console.log("getAttributeByFilter cb start")
				  callbackForEachRow(row);
				  console.log("getAttributeByFilter cb end")
			  }
		    }); // end each row
		  }); 
       
      }
	  console.log("getAttributeByFilter end")
  }
  
  appendRow(row){  
    this.authorize(()=>{
      var sheets = google.sheets({version: 'v4', auth: this.oAuth2Client});
      var request = {
        spreadsheetId: this.sheetID,
        range: 'DEMO!A1:N100',
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        resource:{
          values:[row]
        },
      };
      sheets.spreadsheets.values.append(request, function(err, response) {
        if (err) {
          console.error(err);
          return;
        }
        console.log(JSON.stringify(response, null, 2));
      });
    });
  };
}

//let googleSheetHandler = new GoogleSheetAdapter('credentials.json','1AJepb9l1DDFQ0rvGI6x22YCtSKMUM4LhSZyYyBMmGE8');
// googleSheetHandler.getAttributeByID(2,function(row){
  // console.log(row);
// });

/*async function main() {
    console.log("start")
    await googleSheetHandler.getAttributeByFilter("類別","路燈故障", function(row){
        console.log(row);
    });
    console.log("end")
}

main();*/

//googleSheetHandler.appendRow([2,'南港','合成里','jasonTEST','道路坑洞消失了','2017/08/01 上午 9:24','臺北市大安區忠孝東路七段9999巷11號','中坑洞','連結',"","","",""]);

module.exports = GoogleSheetAdapter



