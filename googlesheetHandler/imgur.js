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
  
  async uploadImage(imagePath) {
      
      var link = "";
      
      await this.imgurObj.uploadFile("./" + imagePath,"uUOABkR")
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
