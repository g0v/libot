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
var libotCases = {}; //key = caseId

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
		{name: 'f2d', from: 'Free', to: 'Date'},
		{name: 'd2a', from: 'Date', to: 'Address'},
		{name: 'a2p', from: 'Address', to: 'Photo'},
		{name: 'p2e', from: 'Photo', to: 'End'},
		{name: 'e2f', from: 'End', to: 'Free'},
		{name: 'f2l', from: 'Free', to: 'List'},
		{name: 'goto', from: '*', to: function(s) { return s } }
    ],
	data: {
		message: null
	},
    methods: {		
		/*onF2d: function(transition, event, user, currentCase) {
			var fsm = transition.fsm;
			
			console.log('OK');
		},*/
		/*onF2d: function(self, event, user, currentCase) {
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
		onD2a: function(self, event, user, currentCase) {
			console.log("onD2a");
			
			var fsm = self.fsm;
			var nextState = null;
			var message = null;
			
			// currentCase.eventTimestamp is because user says previous step
			if(event.type == "postback" || currentCase.eventTimestamp !== null) { 
				if(!currentCase.eventTimestamp) {
					currentCase.eventTimestamp = event.postback.params.datetime;
				}
				var action1 = 　{  
                                 "type":"uri",
                                 "label":"選擇地址",
                                 "uri":"line://nv/location",
                                 "altUri": {
                                    "desktop" : "http://example.com/pc/page/222"
                                 }
                              　};
				message = generateFlexMessage("您選擇的時間為："　+ currentCase.eventTimestamp + "\n" + "能幫我選擇地址嗎？", action1);
				
			} else {
				if(event.type == "message") {
					switch(event.message.text) {
						case "取消":
							console.log("Cancel");
							message = { type: 'text', text: "使用者取消" };
							var userId = event.source.userId;
							libotUsers[userId].currentCaseId = null;
							nextState = "Free"
							break;
					}
				}
			}
			return {"message": message, "nextState": nextState};
		},
		onA2p: function(self, event, user, currentCase) {
			console.log("onA2p")
			
			var fsm = self.fsm;
			var nextState = null;
			var message = null;
			
			if(event.type == "message"　&& event.message.type == "location") {
				
				currentCase.location = event.message								
				currentCase.currentStage = this.next;

			} else {
			
				if(event.type == "message") {
					switch(event.message.text) {
						case "取消":
							console.log("Cancel");
							message = { type: 'text', text: "使用者取消" };
							var userId = event.source.userId;
							libotUsers[userId].currentCaseId = null;
							nextState = "Free"
							break;
							
						case "前一步":
							console.log("前一步");
							nextState = "Free"
							
							break;
					}
				}            
				
			}
			
			return {"message": message, "nextState": nextState};
		},
		onP2e: function(self, event, user, currentCase) {
			console.log("onP2e")
		},
		onE2f: function(self, event, user, currentCase) {
			console.log("onE2f")
		},
		onF2l: function(self, event, user, currentCase) {
			console.log("onF2l")
		},*/
		onEnd: function(transition) {
			console.log('onEnd')
			var fsm = transition.fsm;
			
			fsm.message = { type: 'text', text: "完成" };
		},
		onPhoto: function(transition) {
			console.log('onPhoto')
			var fsm = transition.fsm;
			
			var action1 = 　{  
                                 "type":"uri",
                                 "label":"選擇圖片",
                                 "uri":"line://nv/cameraRoll/single",
                                 "altUri": {
                                    "desktop" : "http://example.com/pc/page/222"
                                 }
                              　}; 
                
			fsm.message = generateFlexMessage("最後一個步驟囉～\n請直接傳照片給我！", action1);
		},
		onAddress: function(transition) {
			console.log('onAddress')
			
			var fsm = transition.fsm;
			
			var action1 = 　{  
                                 "type":"uri",
                                 "label":"選擇地址",
                                 "uri":"line://nv/location",
                                 "altUri": {
                                    "desktop" : "http://example.com/pc/page/222"
                                 }
                              　};
			fsm.message = generateFlexMessage("您選擇的時間為："　+ fsm.currentCase.eventTimestamp + "\n" + "能幫我選擇地址嗎？", action1);
		},
		onDate: function(transition) {
			console.log('onDate')
			
			var fsm = transition.fsm;
			
			var action1 = {
							 "type":"datetimepicker",
							 "label":"選擇日期時間",
							 "data":"storeId=12345",
							 "mode":"datetime",
							 "initial":"2017-12-25t00:00",
							 "max":"2033-01-24t23:59",
							 "min":"2017-12-25t00:00"
						  };
		
			fsm.message = generateFlexMessage("什麼時候發現的？", action1, false);
		},
		handler: function(event, user, currentCase) {
			var fsm = user.fsm;
			var message = null;
			
			console.log("fsm.state", fsm.state)
			
			fsm.message = null;
			fsm.event = event;
			fsm.user = user;
			fsm.currentCase = currentCase;
			
			while(fsm.message === null) {
				switch(fsm.state) {
					case "Free": {
						if(event.type == "message") {
							switch(event.message.text) {
								case "路燈故障":
								case "公園樹木":
								case "道路坑洞":
								case "交通設施":
								case "環境清潔":
									fsm.f2d();
									break;
								case "查看進度":
									fsm.message = { type: 'text', text: "查看進度" };
									break;
								default:
									fsm.message = { type: 'text', text: "請選取想要回報的類別" };
									break;
							}
						} else {
							fsm.message = { type: 'text', text: "請選取想要回報的類別" };
						}
						break;
					}
					case "Date": {
						
						if(event.type == "message" && event.message.text == "取消") {
							console.log("Cancel");
							var userId = event.source.userId;
							libotUsers[userId].currentCaseId = null;
							fsm.message = { type: 'text', text: "使用者取消" };
							fsm.goto("Free");
							break;
						} else if(event.type == "postback") { 
							
							currentCase.eventTimestamp = event.postback.params.datetime;
							console.log("currentCase.eventTimestamp", currentCase.eventTimestamp);
							
							fsm.d2a();
						} else {						
							fsm.message = { type: 'text', text: "抱歉～我聽不懂～" };
						}
						
						break;
					}
					case "Address": {
						
						if(event.type == "message" && event.message.text == "取消") {
							console.log("Cancel");
							var userId = event.source.userId;
							libotUsers[userId].currentCaseId = null;
							fsm.message = { type: 'text', text: "使用者取消" };
							fsm.goto("Free");
							break;
						} else if(event.type == "message" && event.message.text == "前一步") {
							fsm.message = null; 
							fsm.goto("Date");
						} else if(event.type == "message"　&& event.message.type == "location") {
							currentCase.location = event.message								
							fsm.a2p();
						} else {						
							fsm.message = { type: 'text', text: "抱歉～我聽不懂～" };
						}

						break;
					}				
					case "Photo": {
						if(event.type == "message" && event.message.text == "取消") {
							console.log("Cancel");
							var userId = event.source.userId;
							libotUsers[userId].currentCaseId = null;
							fsm.message = { type: 'text', text: "使用者取消" };
							fsm.goto("Free");
							break;
						} else if(event.type == "message" && event.message.text == "前一步") {
							fsm.message = null;
							fsm.goto("Address");
						} else if(event.type == "message" && event.message.type == "image") {
							currentCase.image = event.message.id;
							fsm.p2e();
							fsm.goto('Free');
						} else {						
							fsm.message = { type: 'text', text: "抱歉～我聽不懂～" };
						}
						break;
					}								
				}
			}
			console.log(fsm.message);
			return fsm.message;
			
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

    var message = null;
	var currentCase = null;
	
    if(event.type == "message" && event.message.text in STRING_TO_TYPE) {         
        var newCase = new Case(event.source.userId, event.timestamp, STRING_TO_TYPE[event.message.text]);
        console.log(newCase); 
		this.caseIds[newCase.caseId] = true;
		this.currentCaseId = newCase.caseId;     
		libotCases[newCase.caseId] = newCase;
		this.fsm.goto('Free');
	}
	
	if(event.type == "message" && event.message.text == "查看進度") {
		this.fsm.goto('Free');
	}
	
	if(this.currentCaseId !== null) {
		currentCase = libotCases[this.currentCaseId];
	}
	
	//console.log('hello', currentCase)
	
	//this.fsm.f2d();
	
	message = this.fsm.handler(event, this, currentCase);
    
    return message;
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
    
    console.log("libotUsers", libotUsers);
    
    var message = null;
         
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