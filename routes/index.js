var express = require('express');
var router = express.Router();

function makeResponse(message){
    return "Hoge!!";
}

/* Callback */
router.post('/callback', function(req, res, next) {
    console.log(req.body.result[0].content);
    var lineResponse = makeResponse(req.body.result[0].content);
    var headers = {
        X-Line-ChannelID: "1468262145",
        X-Line-ChannelSecret: "6ebec0057b2374dc28276ba0f00a1e96",
        X-Line-Trusted-User-With-ACL: "u5811e3e3ba810b3c5d4ee96cf6e3ac2d"
    };
    var body = {
        to:["ud72461ced7e0bf1619cabf38fa313e0f"],
        toChannel: "1383378250",
        eventType: "138311608800106203",
        content: {"contentType":1, "toType":1, "text": lineResponse}
    };
    request({
        url: "https://trialbot-api.line.me/v1/events",
        method: "POST",
        headers: headers,
        body: body,
        json: true
    }, function (error, response, body) {
        if (error || response.statusCode != 200) {
            console.log("Failed to save answer.");
            console.log(error);
            console.log(response);
        }
    });
    res.send(null);
});

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

module.exports = router;
