var express = require('express');
var router = express.Router();
var request = require('request');
var hatakeConfig = require('../config.js');

function getLatestMoisture(callback){
    var headers = {
        'Content-Type': "application/json"
    };
    request({
        url: hatakeConfig.dbApiPrefix + "/log/latest",
        method: "GET",
        headers: headers
    }, function (error, response, body) {
        if (error) {
            console.log(error);
            callback("?");
        } else {
            console.log(JSON.parse(response.body));
            callback(JSON.parse(response.body).moisture);
        }
    });
}

function makeResponse(message, callback){
    if (message.indexOf("おはよう") > -1) {
        callback("おはようございます！");
    } else if (message.indexOf("こんにちは") > -1){
        callback("ああどうも、こんにちは。");
    } else if (message.indexOf("こんばんは") > -1){
        callback("これはこれは。こんばんは。");
    } else if (message.indexOf("どうも") > -1 || message.indexOf("ども") > -1){
        callback("どうも〜。");
    } else if (message.indexOf("水") > -1 || message.indexOf("調子") > -1 || message.indexOf("どう？") > -1) {
        getLatestMoisture(function(moisture){
            console.log(moisture);
            if (moisture == "?"){
                callback("あれ、そういわれればどうなのかしら。自分で自分がわからないわ。");
            } else if (moisture <= hatakeConfig.moistureThresholdLow) {
                callback("よくきいてくれた！正直かなり乾いています。");
            } else if (moisture > hatakeConfig.moistureThresholdLow && moisture <= hatakeConfig.moistureThresholdHigh){
                callback("ちょうどいいくらいですよ。いつもこれくらいがいいな。");
            } else if (moisture > hatakeConfig.moistureThresholdHigh){
                callback("いやー、じゃぶじゃぶですよ。");
            } else {
                callback("あれ、そういわれればどうなのかしら。自分で自分がわからないわ。");
            }
        });
    } else {
        callback("えーと・・・");
    }
}

/* Callback */
router.post('/callback', function(req, res, next) {
    makeResponse(req.body.result[0].content.text, function(lineResponse){
        var headers = {
            'X-Line-ChannelID': hatakeConfig.lineChannelId,
            'X-Line-ChannelSecret': hatakeConfig.lineChannelSecret,
            'X-Line-Trusted-User-With-ACL': hatakeConfig.lineMid,
            'Content-Type': "application/json"
        };
        var body = {
            to:[req.body.result[0].content.from],
            toChannel: "1383378250",
            eventType: "138311608800106203",
            content: {"contentType":1, "toType":1, "text": lineResponse}
        };
        request({
            url: "https://trialbot-api.line.me/v1/events",
            method: "POST",
            headers: headers,
            body: JSON.stringify(body)
        }, function (error, response, body) {
            if (error || response.statusCode != 200) {
                console.log(body);
            }
        });
        res.send(null);
    });
});

/* GET home page. */
router.get('/sendMessage', function(req, res, next) {
    makeResponse("現在の水分量はいかが？", function(lineResponse){
        var headers = {
            'X-Line-ChannelID': hatakeConfig.lineChannelId,
            'X-Line-ChannelSecret': hatakeConfig.lineChannelSecret,
            'X-Line-Trusted-User-With-ACL': hatakeConfig.lineMid,
            'Content-Type': "application/json"
        };
        var body = {
            to: [hatakeConfig.hatakeOwnerLineMid],
            toChannel: "1383378250",
            eventType: "138311608800106203",
            content: {"contentType":1, "toType":1, "text": lineResponse}
        };
        request({
            url: "https://trialbot-api.line.me/v1/events",
            method: "POST",
            headers: headers,
            body: JSON.stringify(body)
        }, function (error, response, body) {
            if (error || response.statusCode != 200) {
                console.log(body);
                //console.log(response);
            }
        });
        res.send(null);
    });
});

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

module.exports = router;
