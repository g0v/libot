'use strict';


/*!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

應該把google sheet當資料庫，要用再拉下來？

還是在nodejs端建資料庫？

可能user進來後再抓這個user的相關cases資料

!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!*/

var StageNode = function(stageName, prev, next) {

    this.stageName = stageName
    this.prev = prev;
    this.next = next;    
            
}

var LampStageNode = function(stageName, prev, next) {   

    StageNode.call(this, stageName, prev, next);      
            
}

LampStageNode.prototype.createMessage = function(event, currentCase) {

    var message = null;

    switch(this.stageName) {
    
        case "start":
        
            var message = {
              "type": "template",
              "altText": "Pick the date and time",
              "template": {
                  "type": "confirm",
                  "text": "什麼時候發現的？",
                  "actions": [
                      {  
                         "type":"datetimepicker",
                         "label":"選擇日期時間",
                         "data":"storeId=12345",
                         "mode":"datetime",
                         "initial":"2017-12-25t00:00",
                         "max":"2018-01-24t23:59",
                         "min":"2017-12-25t00:00"
                      },
                      {
                        "type": "message",
                        "label": "取消",
                        "text": "取消"
                      }
                  ]
              }
            }
            
            if(!this.next) {                
                this.next = new LampStageNode("GPS", currentCase.currentStage, null);
            }
                
            currentCase.currentStage = this.next;
            
            break;
            
        case "GPS":
        
            if(event.type == "postback") {
                message = { type: 'text', text: event.postback.params.datetime };
                
                var message = {
                  "type": "template",
                  "altText": "Pick the date and time",
                  "template": {
                      "type": "confirm",
                      "text": "時間："　+ event.postback.params.datetime + "\n" + "能幫我選擇地址嗎？",
                      "actions": [
                          {  
                             "type":"uri",
                             "label":"選擇地址",
                             "uri":"line://nv/location",
                             "altUri": {
                                "desktop" : "http://example.com/pc/page/222"
                             }
                          },
                          {
                            "type": "message",
                            "label": "取消",
                            "text": "取消"
                          }
                      ]
                  }
                }
                
                if(!this.next) {                
                    this.next = new LampStageNode("photo", currentCase.currentStage, null);
                }
                currentCase.currentStage = this.next;
                
            } else {
                message = { type: 'text', text: "使用者取消" };
                var userId = event.source.userId;
                
                libotUsers[userId].currentCaseId = null                
                currentCase.currentStage = null
                
            }                    
            
            break;                                        
            
        case "photo":
            
            if(event.type == "message"　&& event.message.type == "location" ) {
            
                message = { type: 'text', text: "最後一個步驟，請傳照片給我！"};
                
                if(!this.next) {                
                    this.next = new LampStageNode("end", currentCase.currentStage, null);
                }
                
                currentCase.currentStage = this.next;
            } else {
                message = { type: 'text', text: "使用者取消" };
                var userId = event.source.userId;
                
                libotUsers[userId].currentCaseId = null                
                currentCase.currentStage = null
                
            }      
            
            break;                    
            
        case "end":
        
            message = { type: 'text', text: "完成"};
            var userId = event.source.userId;
            libotUsers[userId].currentCaseId = null                
            currentCase.currentStage = null

            break;
    
    }
    
    return message;

}

var TYPE_TO_STRING = {
    0: "路燈故障",
    1: "公園樹木",
    2: "道路坑洞",
    3: "號誌反光鏡",
    4: "其他問題",    
}

var STRING_TO_TYPE = {}

for(var type in TYPE_TO_STRING) {
    STRING_TO_TYPE[TYPE_TO_STRING[type]] = type;
}

var libotUsers = {}; //key = userId
var libotCases = {};　

var Case = function(userId, timestamp, type) {
   
    this.caseId = _uuid();
    this.locations = [];
    this.userId = userId;    
    this.timestamp = timestamp;
    this.type = type;
    
    switch(TYPE_TO_STRING[this.type]) {
        case "路燈故障":
            this.stageHead = new LampStageNode("start", null, null);
            this.currentStage = this.stageHead;
            break;
    }
}

var User = function(userId, timestamp) {

    this.caseIds = {};
    this.userId = userId;
    this.timestamp = timestamp;
    this.currentCaseId = null    
    
}

User.prototype.process = function(event) {

    var message = null

    if(event.type == "message" && event.message.text in STRING_TO_TYPE) {         
        var newCase = new Case(event.source.userId, event.timestamp, STRING_TO_TYPE[event.message.text]);            
        console.log(newCase)    
       
        switch(event.message.text) {
            case "路燈故障":                       
                this.caseIds[newCase.caseId] = true;
                this.currentCaseId = newCase.caseId;            
                libotCases[newCase.caseId] = newCase;
                message = newCase.currentStage.createMessage(event, libotCases[newCase.caseId]);
                break;
            case "公園樹木":
                break;
            case "道路坑洞":
                break;
            case "號誌反光鏡":
                break;
            case "其他問題":
                break;
            case "看案件進度":
                break;
        }
    } else {    
        // 要對應到正確的Nodes    
        
        if(libotUsers[event.source.userId].currentCaseId) {
            var currentCase = libotCases[libotUsers[event.source.userId].currentCaseId];        
            message = currentCase.currentStage.createMessage(event, libotCases[this.currentCaseId]);
        } else {
            message = { type: 'text', text: "請選取想要回報的類別" };
        }
    }
    
    return message
}

const INVITE_LINK = "https://line.me/R/ti/p/%40762jfknc";

const line = require('@line/bot-sdk');
const express = require('express');

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

function group_reply(event) {

    if(event.message.text.includes("派工")) {
    
        var messageText = "嗨！里長，需要我幫您直接反應給機關窗口嗎？點我可以帶你馬上立案喔！\n" + INVITE_LINK
        var message = { type: 'text', text: messageText };
        
        client.replyMessage(event.replyToken, message);
        
        /*var inviteMessage = INVITE_LINK 
        var message = { type: 'text', text: inviteMessage };
        
        client.replyMessage(event.replyToken, message);*/
        
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
  
  
    console.log(event)


    var message = null
    
    if(event.source.type == "group") {
        message = group_reply(event);
    }
    
    if(event.source.type == "user") {
        message = user_reply(event);
    }
        
        
    // use reply API
    return client.replyMessage(event.replyToken, message);
}

// listen on port
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`listening on ${port}`);
});

/*
var fixContainer = {
  "type": "carousel",
  "contents": [
    {
      "type": "bubble",
      "size": "micro",
      "hero": {
        "type": "image",
        "url": "https://scdn.line-apps.com/n/channel_devcenter/img/flexsnapshot/clip/clip10.jpg",
        "size": "full",
        "aspectMode": "cover",
        "aspectRatio": "320:213"
      },
      "body": {
        "type": "box",
        "layout": "vertical",
        "contents": [
          {
            "type": "text",
            "text": "我要報修",
            "weight": "bold",
            "size": "sm",
            "wrap": true
          },
          {
            "type": "box",
            "layout": "baseline",
            "contents": [
              {
                "type": "icon",
                "size": "xs",
                "url": "https://scdn.line-apps.com/n/channel_devcenter/img/fx/review_gold_star_28.png"
              },
              {
                "type": "icon",
                "size": "xs",
                "url": "https://scdn.line-apps.com/n/channel_devcenter/img/fx/review_gold_star_28.png"
              },
              {
                "type": "icon",
                "size": "xs",
                "url": "https://scdn.line-apps.com/n/channel_devcenter/img/fx/review_gold_star_28.png"
              },
              {
                "type": "icon",
                "size": "xs",
                "url": "https://scdn.line-apps.com/n/channel_devcenter/img/fx/review_gold_star_28.png"
              },
              {
                "type": "icon",
                "size": "xs",
                "url": "https://scdn.line-apps.com/n/channel_devcenter/img/fx/review_gray_star_28.png"
              },
              {
                "type": "text",
                "text": "4.0",
                "size": "xs",
                "color": "#8c8c8c",
                "margin": "md",
                "flex": 0
              }
            ]
          },
          {
            "type": "box",
            "layout": "vertical",
            "contents": [
              {
                "type": "box",
                "layout": "baseline",
                "spacing": "sm",
                "contents": [
                  {
                    "type": "text",
                    "text": "我要報修",
                    "wrap": true,
                    "color": "#8c8c8c",
                    "size": "xs",
                    "flex": 5
                  }
                ]
              }
            ]
          }
        ],
        "spacing": "sm",
        "paddingAll": "13px"
      }
    },
    {
      "type": "bubble",
      "size": "micro",
      "hero": {
        "type": "image",
        "url": "https://scdn.line-apps.com/n/channel_devcenter/img/flexsnapshot/clip/clip11.jpg",
        "size": "full",
        "aspectMode": "cover",
        "aspectRatio": "320:213"
      },
      "body": {
        "type": "box",
        "layout": "vertical",
        "contents": [
          {
            "type": "text",
            "text": "我肚子餓",
            "weight": "bold",
            "size": "sm",
            "wrap": true
          },
          {
            "type": "box",
            "layout": "baseline",
            "contents": [
              {
                "type": "icon",
                "size": "xs",
                "url": "https://scdn.line-apps.com/n/channel_devcenter/img/fx/review_gold_star_28.png"
              },
              {
                "type": "icon",
                "size": "xs",
                "url": "https://scdn.line-apps.com/n/channel_devcenter/img/fx/review_gold_star_28.png"
              },
              {
                "type": "icon",
                "size": "xs",
                "url": "https://scdn.line-apps.com/n/channel_devcenter/img/fx/review_gold_star_28.png"
              },
              {
                "type": "icon",
                "size": "xs",
                "url": "https://scdn.line-apps.com/n/channel_devcenter/img/fx/review_gold_star_28.png"
              },
              {
                "type": "icon",
                "size": "xs",
                "url": "https://scdn.line-apps.com/n/channel_devcenter/img/fx/review_gray_star_28.png"
              },
              {
                "type": "text",
                "text": "4.0",
                "size": "sm",
                "color": "#8c8c8c",
                "margin": "md",
                "flex": 0
              }
            ]
          },
          {
            "type": "box",
            "layout": "vertical",
            "contents": [
              {
                "type": "box",
                "layout": "baseline",
                "spacing": "sm",
                "contents": [
                  {
                    "type": "text",
                    "text": "我肚子餓",
                    "wrap": true,
                    "color": "#8c8c8c",
                    "size": "xs",
                    "flex": 5
                  }
                ]
              }
            ]
          }
        ],
        "spacing": "sm",
        "paddingAll": "13px"
      }
    },
    {
      "type": "bubble",
      "size": "micro",
      "hero": {
        "type": "image",
        "url": "https://scdn.line-apps.com/n/channel_devcenter/img/flexsnapshot/clip/clip12.jpg",
        "size": "full",
        "aspectMode": "cover",
        "aspectRatio": "320:213"
      },
      "body": {
        "type": "box",
        "layout": "vertical",
        "contents": [
          {
            "type": "text",
            "text": "里長安安有事嗎",
            "weight": "bold",
            "size": "sm"
          },
          {
            "type": "box",
            "layout": "baseline",
            "contents": [
              {
                "type": "icon",
                "size": "xs",
                "url": "https://scdn.line-apps.com/n/channel_devcenter/img/fx/review_gold_star_28.png"
              },
              {
                "type": "icon",
                "size": "xs",
                "url": "https://scdn.line-apps.com/n/channel_devcenter/img/fx/review_gold_star_28.png"
              },
              {
                "type": "icon",
                "size": "xs",
                "url": "https://scdn.line-apps.com/n/channel_devcenter/img/fx/review_gold_star_28.png"
              },
              {
                "type": "icon",
                "size": "xs",
                "url": "https://scdn.line-apps.com/n/channel_devcenter/img/fx/review_gold_star_28.png"
              },
              {
                "type": "icon",
                "size": "xs",
                "url": "https://scdn.line-apps.com/n/channel_devcenter/img/fx/review_gray_star_28.png"
              },
              {
                "type": "text",
                "text": "4.0",
                "size": "sm",
                "color": "#8c8c8c",
                "margin": "md",
                "flex": 0
              }
            ]
          },
          {
            "type": "box",
            "layout": "vertical",
            "contents": [
              {
                "type": "box",
                "layout": "baseline",
                "spacing": "sm",
                "contents": [
                  {
                    "type": "text",
                    "text": "里長安安有事嗎？",
                    "wrap": true,
                    "color": "#8c8c8c",
                    "size": "xs",
                    "flex": 5
                  }
                ]
              }
            ]
          }
        ],
        "spacing": "sm",
        "paddingAll": "13px"
      }
    }
  ]
}*/
