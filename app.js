'use strict';

const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const REST_PORT = (process.env.PORT || 5000);
const DEV_CONFIG = process.env.DEVELOPMENT_CONFIG == 'true';
const route_webhook = require('./routes/webhook');

const app = express();

// -----------------------------------------------------------------------------
// ミドルウェア設定
app.use(bodyParser.json({
    verify: function(req, res, buf, encoding) {
        req.rawBody = buf;
    }
}));
// -----------------------------------------------------------------------------



// -----------------------------------------------------------------------------
// ルーター設定
app.use('/webhook', route_webhook);
// -----------------------------------------------------------------------------



// -----------------------------------------------------------------------------
// Webサーバー設定
app.listen(REST_PORT, function () {
    console.log('Rest service ready on port ' + REST_PORT);
});
