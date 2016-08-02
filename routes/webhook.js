'use strict';

const express = require('express');
const router = express.Router();

const crypto = require('crypto');
const LineBot = require('../linebot');
const LineBotConfig = require('../linebotconfig');
const googleTranslate = require('google-translate')(process.env.GOOGLE_API_KEY);
const APIAI_ACCESS_TOKEN = process.env.APIAI_ACCESS_TOKEN;
const APIAI_LANG = process.env.APIAI_LANG;
const LINE_CHANNEL_ID = process.env.LINE_CHANNEL_ID;
const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET;
const LINE_MID = process.env.LINE_MID;
const BOT_ADMIN_LINE_MID = process.env.BOT_ADMIN_LINE_MID;


// -----------------------------------------------------------------------------
// ボット関連インスタンス初期化
const botConfig = new LineBotConfig(
    APIAI_ACCESS_TOKEN,
    APIAI_LANG,
    LINE_CHANNEL_ID,
    LINE_CHANNEL_SECRET,
    LINE_MID,
    BOT_ADMIN_LINE_MID
);
const bot = new LineBot(botConfig);
// -----------------------------------------------------------------------------


// -----------------------------------------------------------------------------
// ルーティング設定

// LINEからのコールバックがこのURLにPOSTされます。
router.post('/', (req, res) => {

    console.log('POST received, Yeh.');

    // Signature Validation
    let signature = req.get('X-LINE-ChannelSignature');
    let rawBody = req.rawBody;
    let hash = crypto.createHmac('sha256', LINE_CHANNEL_SECRET).update(req.rawBody).digest('base64');
    if (hash != signature) {
        console.log("Unauthorized request");
        return res.status(401).send('Wrong request signature');
    } else {
        console.log("Authorized.");
    }

    try {

        if (req.body.result) {
            req.body.result.forEach(function (item) {
                // 受信したメッセージをGoogle Translate APIで英語に翻訳。
                googleTranslate.translate(item.content.text, 'en', function(err, translation) {
                    if (err){
                        console.log(err);
                        return;
                    }
                    console.log("Translation: " + translation.translatedText);

                    // 英語翻訳したメッセージをセット。
                    item.content.translatedText = translation.translatedText;

                    // 英語翻訳したメッセージを含むitemオブジェクトをapi.aiにかける。
                    bot.processMessage(item, res);
                });
            });
        }

    } catch (err) {
        res.status(400).send('Error while processing ' + err.message);
        return;
    }

    res.status(200).end();
});
// -----------------------------------------------------------------------------


module.exports = router;
