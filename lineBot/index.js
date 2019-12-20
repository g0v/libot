'use strict';

const StateMachine = require('javascript-state-machine');
const https = require('https');
const fs = require('fs');
const INVITE_LINK = "https://line.me/R/ti/p/%40762jfknc";
const line = require('@line/bot-sdk');
const express = require('express');
var visualize = require('javascript-state-machine/lib/visualize');

// create LINE SDK config from env variables
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

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

var TYPE_TO_STRING = {
    0: "路燈故障",
    1: "公園樹木",
    2: "道路坑洞",
    3: "交通設施",
    4: "環境清潔"
}

var STRING_TO_TYPE = {}

for(var type in TYPE_TO_STRING) {
    STRING_TO_TYPE[TYPE_TO_STRING[type]] = type;
}

var libotUsers = {}; //key = userId
var libotCases = {};　

// https://cythilya.github.io/2017/03/12/uuid/
function _uuid() {
  var d = Date.now();
  if (typeof performance !== 'undefined' && typeof performance.now === 'function'){
    d += performance.now(); //use high-precision timer if available
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = (d + Math.random() * 16) % 16 | 0;
    d = Math.floor(d / 16);
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function generateFlexMessage(text1, action1, cancel = true) {
    
    var flexMessage = { 
                        "type": "flex",
                        "altText": "flex message",
                        "contents": 
                        {
                          "type": "bubble",
                          "body": {
                            "type": "box",
                            "layout": "vertical",
                            "spacing": "md",
                            "contents": [
                              {
                                "type": "text",
                                "text": text1,
                                "size": "lg",
                                "weight": "bold",
                                "wrap": true
                              }
                            ]
                          },
                          "footer": {
                            "type": "box",
                            "layout": "vertical",
                            "spacing": "sm",
                            "contents": [
                              {
                                "type": "button",
                                "style": "link",
                                "height": "sm",
                                "action": action1
                              },
                              {
                                "type": "button",
                                "style": "link",
                                "height": "sm",
                                "action": {  
                                   "type":"message",
                                   "label":"前一步",
                                   "text":"前一步"
                                }                      
                              },
                              {
                                "type": "button",
                                "style": "link",
                                "height": "sm",
                                "action": {  
                                   "type":"message",
                                   "label":"取消",
                                   "text":"取消"
                                }   
                              },
                              {
                                "type": "spacer",
                                "size": "sm"
                              }
                            ]
                          }
                        }
                      }
    
    if(!action1) {
        flexMessage["contents"]["footer"]["contents"] = flexMessage["contents"]["footer"]["contents"].slice(1, 3);
    }
                      
    if(!cancel) {
        flexMessage["contents"]["footer"]["contents"] = flexMessage["contents"]["footer"]["contents"].slice(0, 1).concat(flexMessage["contents"]["footer"]["contents"].slice(2, 3));
    }

    return flexMessage

}

var FSM_TEMPLATE = {
    init: 'Free',
    transitions: [
        {name: 'sdw', from: 'SelectDate', to: 'SelectDateWait'},
        {name: 'saw', from: 'SelectAddress', to: 'SelectAddressWait'},
        {name: 'spw', from: 'SelectPhoto', to: 'SelectPhotoWait'},
		{name: 'f2d', from: 'Free', to: 'SelectDate'},
		{name: 'd2a', from: 'SelectDateWait', to: 'SelectAddress'},
		{name: 'a2p', from: 'SelectAddressWait', to: 'SelectPhoto'},
		{name: 'p2e', from: 'SelectPhotoWait', to: 'End'},
		{name: 'e2f', from: 'End', to: 'Free'},
		{name: 'f2l', from: 'Free', to: 'List'},
		{name: 'goto', from: '*', to: function(s) { return s } }
    ],
    methods: {
        
		onSdw: function(fsm) {
			console.log("onSdw")
			
			//return message;
		},
		onSaw: function(fsm) {
			console.log("onSaw")
		},
		onSpw: function(fsm) {
			console.log("onSpw")
		},
		onF2d: function(fsm) {
			console.log("onF2d")
			var action1 = {
							 "type":"datetimepicker",
							 "label":"選擇日期時間",
							 "data":"storeId=12345",
							 "mode":"datetime",
							 "initial":"2017-12-25t00:00",
							 "max":"2033-01-24t23:59",
							 "min":"2017-12-25t00:00"
						  };
		
			var message = generateFlexMessage("什麼時候發現的？", action1, false);
			
			return message;
		},
		onD2a: function(fsm) {
			console.log("onD2a")
		},
		onA2p: function(fsm) {
			console.log("onA2p")
		},
		onP2e: function(fsm) {
			console.log("onP2e")
		},
		onE2f: function(fsm) {
			console.log("onE2f")
		},
		onF2l: function(fsm) {
			console.log("onF2l")
		},
		handler: function(fsm, event) {
			console.log("fsm.state", fsm.state)
			switch(fsm.state) {
				case "Free": {
					switch(event.message.text) {
						case "路燈故障":                       
						case "公園樹木":            
						case "道路坑洞":            
						case "交通設施":
						case "環境清潔":                
							var message = fsm.f2d();
							break;
						case "查看進度":
							var message = { type: 'text', text: "查看進度" };
							break;
						default:
							var message = { type: 'text', text: "請選取想要回報的類別" };
							break;
					}
					break;
				}
				case "SelectDate": {
					fsm.sdw();
					break;
				}
				case "SelectDateWait": {
					fsm.d2a();
					break;
				}
				case "SelectAddress": {
					fsm.saw();
					break;
				}
				case "SelectAddressWait": {
					fsm.a2p();
					break;
				}
				case "SelectPhoto": {
					fsm.spw();
					break;
				}				
				case "SelectPhotoWait": {
					fsm.p2e();
					break;
				}
				case "End": {
					fsm.e2f();
					break;
				}
			}
			return message;
		}
    }
}

var Case = function(userId, timestamp, type) {
   
    this.caseId = _uuid();
    this.location = null;
    this.userId = userId;    
    this.createTimestamp = timestamp; // case 成立的時間
    this.eventTimestamp = null;
    this.type = type;
	//this.fsm = new StateMachine(FSM_TEMPLATE);
    
}

var User = function(userId, timestamp) {

    this.caseIds = {};
    this.userId = userId;
    this.timestamp = timestamp;
    this.currentCaseId = null;
	this.fsm = new StateMachine(FSM_TEMPLATE);
    
}

User.prototype.process = function(event) {

    console.log(event);

    var message = null	
	
    if(event.type == "message" && event.message.text in STRING_TO_TYPE) {         
        var newCase = new Case(event.source.userId, event.timestamp, STRING_TO_TYPE[event.message.text]);            
        console.log(newCase)    
		this.caseIds[newCase.caseId] = true;
		this.currentCaseId = newCase.caseId;     
		libotCases[newCase.caseId] = newCase;
		this.fsm.goto('Free');
	}
	
	if(event.type == "message" && event.message.text == "查看進度") {
		this.fsm.goto('Free');
	}

	message = this.fsm.handler(this.fsm, event);
    
    return message
}

function group_reply(event) {

	var message = false;

    if(event.message.text.includes("派工")) {
    
        var messageText = "嗨！里長，需要我幫您直接反應給機關窗口嗎？點我可以帶你馬上立案喔！\n" + INVITE_LINK
        var message = { type: 'text', text: messageText };
		
    }

    return message;
}

function user_reply(event) {

    console.log(event);
    
    if(event.source.type == "user" && !(event.source.userId in libotUsers)) {
        libotUsers[event.source.userId] = new User(event.source.userId);
    }
    
    console.log("libotUsers", libotUsers)
    
    var message = null
         
    message = libotUsers[event.source.userId].process(event);                            
    
    return message;
}

// event handler
function handleEvent(event) {
    
    console.log(event);

    var message = null;
    
    if(event.source.type == "group") {
        message = group_reply(event);
    }
    
    if(event.source.type == "user") {
        message = user_reply(event);
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