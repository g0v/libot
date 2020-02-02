const fs = require('fs');
var imgur = require('imgur');


/*imgur.setAPIUrl('https://api.imgur.com/3/');
imgur.setClientId('a27075466ae2d41');
imgur.setCredentials('flyingmars@gmail.com', 'libottaiwan886', 'a27075466ae2d41');
imgur.uploadFile('./netprofiles.jpeg','uUOABkR')
    .then(function (json) {
        console.log(json.data.link);
    })
    .catch(function (err) {
        console.error(err.message);
    });*/
    
class ImgurUploader{
  constructor(){
    this.imgurObj = imgur;
    this.imgurObj.setAPIUrl('https://api.imgur.com/3/');
    this.imgurObj.setClientId('a27075466ae2d41');
    this.imgurObj.setCredentials('flyingmars@gmail.com', 'libottaiwan886', 'a27075466ae2d41');
  }
  
  async uploadImage(image) {
      
      var link = "";
      
      await imgur.uploadFile("./" + image)
        .then(function (json) {
            link = json.data.link;
        })
        .catch(function (err) {
            console.error(err.message);
        });
        
      return link;
  }
}

module.exports = ImgurUploader

// var https = require('https');

// var options = {
  // hostname: 'api.imgur.com',
  // path: '/3/image',
  // headers: {'Authorization': 'Client-ID a27075466ae2d41'},
  // method: 'GET'
// };

// var req = https.request(options, function(res) {
  // console.log('statusCode:', res.statusCode);
  // console.log('headers:', res.headers);

  // res.on('data', function(d) {
    // process.stdout.write(d);
  // });
// });