'use strict';

const StateMachine = require('javascript-state-machine');

const https = require('https');
const fs = require('fs');
const INVITE_LINK = "https://line.me/R/ti/p/%40762jfknc";
const line = require('@line/bot-sdk');
const express = require('express');
const GoogleSheetAdapter = require('../googlesheetHandler/sheet.js');
const ImgurUploader = require('../googlesheetHandler/imgur.js');

var Stream = require('stream').Transform
var visualize = require('javascript-state-machine/lib/visualize');
var Mutex = require('async-mutex').Mutex;
const mutex = new Mutex();

let googleSheetHandler = new GoogleSheetAdapter('../googlesheetHandler/credentials.json','1AJepb9l1DDFQ0rvGI6x22YCtSKMUM4LhSZyYyBMmGE8');
let imgurUploader = new ImgurUploader();
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
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
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

    return flexMessage;
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
		onEnd: function(transition) {
			console.log('onEnd')
			var fsm = transition.fsm;
			console.log("currentCase", fsm.currentCase);
            
            var line_image = uploadImage(fsm.currentCase.image, fsm);
            
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
		handler: async function(event, user, currentCase) {
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
								    var message_text = "沒有資料"
									var row_datas = [];
                                    
                                    const google_release = await mutex.acquire();
                                    
                                    googleSheetHandler.getAttributeByFilter("陳情者",fsm.user.userId, function(row) {
                                        row_datas.push(row_data_to_row_info(row));
                                        console.log("push");
                                        google_release();
                                    });
                                    
                                    const release = await mutex.acquire();
                                    release();
									
									console.log(row_datas);
									if(row_datas.length) {
										message_text = row_datas_to_case_string(row_datas);
									}								
									
									fsm.message = { type: 'text', text: message_text };
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
async function handleEvent(event) {
    
    console.log(event);

    var message = null;
    
    if(event.source.type == "group") {
        message = await group_reply(event);
    }
    
    if(event.source.type == "user") {
        message = await user_reply(event);
    }
        
    // use reply API
	if(message) {
		return client.replyMessage(event.replyToken, message);
	}
}

function row_data_to_row_info(row_data) {	
	return {ID: row_data[0], address: row_data[6], status: row_data[12]};
}
	
function row_datas_to_case_string(row_datas) {
	
	var result_string = "";
	
	row_datas.forEach(function(row_info) {
        
        console.log(row_info);
        
		result_string += "案件編號：" + row_info["ID"] + "\n" +
						 "地址：" + row_info["address"] + "\n" +
						 "狀態：" + row_info["status"] + "\n" +
						 "-----------------" + "\n";
	});
	
	return result_string;
}

function uploadImage(message_id, fsm) {
    var district_idx = fsm.currentCase.location.address.indexOf("區");
    var district = fsm.currentCase.location.address.slice(district_idx - 2, district_idx + 1);    
    
    const request = require('request');
    
    const options = {
        url: 'https://api-data.line.me/v2/bot/message/' + message_id.toString() + '/content',
        headers: { 'Authorization': 'Bearer ' + config.channelAccessToken}
    };

    var download = function(options, filename, callback){
        request.head(options, function(err, res, body){
            console.log('content-type:', res.headers['content-type']);
            console.log('content-length:', res.headers['content-length']);

            request(options).pipe(fs.createWriteStream(filename)).on('close', callback);
        });
    };

    download(options, 'image.jpg', async function(){
        console.log('done');
        
        var link = await imgurUploader.uploadImage('image.jpg');
        var row_data = [fsm.currentCase.caseId, district, '某某里', fsm.currentCase.userId, TYPE_TO_STRING[fsm.currentCase.type], fsm.currentCase.eventTimestamp, fsm.currentCase.location.address, '損壞', link, "","","","勘查中"]
        googleSheetHandler.appendRow(row_data);
    });
    
}

// listen on port
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`listening on ${port}`);
});


