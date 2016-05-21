var express = require('express');
var router = express.Router();
var request = require('request');

function makeResponse(message){
    if (message.indexOf("おはよう") > -1) {
        return "おはようございます！";
    } else if (message.indexOf("こんにちは") > -1){
        return "ああどうも、こんにちは。";
    } else if (message.indexOf("こんばんは") > -1){
        return "これはこれは。こんばんは。";
    } else {
        return "は？";
    }
}

/* Callback */
router.post('/callback', function(req, res, next) {
    console.log(req.body.result[0].content);
    var lineResponse = makeResponse(req.body.result[0].content);
    var headers = {
        'X-Line-ChannelID': "1468262145",
        'X-Line-ChannelSecret': "6ebec0057b2374dc28276ba0f00a1e96",
        'X-Line-Trusted-User-With-ACL': "u5811e3e3ba810b3c5d4ee96cf6e3ac2d",
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

/* GET home page. */
router.get('/sendMessage', function(req, res, next) {
    var headers = {
        'X-Line-ChannelID': "1468262145",
        'X-Line-ChannelSecret': "6ebec0057b2374dc28276ba0f00a1e96",
        'X-Line-Trusted-User-With-ACL': "u5811e3e3ba810b3c5d4ee96cf6e3ac2d",
        'Content-Type': "application/json"
    };
    var body = {
        to: ["ud72461ced7e0bf1619cabf38fa313e0f"],
        toChannel: "1383378250",
        eventType: "138311608800106203",
        content: {"contentType":1, "toType":1, "text": "HOGE!!!"}
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

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

module.exports = router;
