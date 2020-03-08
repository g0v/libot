'use strict';



const https = require('https');
const INVITE_LINK = "https://line.me/R/ti/p/%40762jfknc";
const line = require('@line/bot-sdk');
const express = require('express');
const User = require('./user.js')
const Case = require('./case.js')
const config = require('./config.js')

var visualize = require('javascript-state-machine/lib/visualize');

// create LINE SDK client
const client = new line.Client(config);

// create Express app
// about Express itself: https://expressjs.com/
const app = express();

// register a webhook handler with middleware
// about the middleware, please refer to doc
app.post('/callback', line.middleware(config), (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

var libotUsers = {}; //key = userId
var libotCases = {}; //key = caseId

function group_reply(event) {

	var message = false;

    if(event.message.text.includes("派工")) {
    
        var messageText = "嗨！里長，需要我幫您直接反應給機關窗口嗎？點我可以帶你馬上立案喔！\n" + INVITE_LINK
        var message = { type: 'text', text: messageText };
	
    }

    return message;
}

function user_reply(event, libotUsers, libotCases) {

    console.log(event);
    
    if(event.source.type == "user" && !(event.source.userId in libotUsers)) {
        libotUsers[event.source.userId] = new User(event.source.userId);
    }
    
    console.log("libotUsers", libotUsers);
    
    var message = null;
         
    message = libotUsers[event.source.userId].process(event, libotUsers, libotCases);                            
    
    return message;
}

// event handler
async function handleEvent(event) {
    
    console.log(event);

    var message = null;
    
    if(event.source.type == "group") {
        message = await group_reply(event);
    }
    
    if(event.source.type == "user") {
        message = await user_reply(event, libotUsers, libotCases);
    }
        
    // use reply API
	if(message) {
		return client.replyMessage(event.replyToken, message);
	}
}

// listen on port
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`listening on ${port}`);
});


