'use strict';

const express = require('express');
const router = express.Router();

const crypto = require('crypto');
const LineBot = require('../linebot');
const googleTranslate = require('google-translate')(process.env.GOOGLE_API_KEY);

// -----------------------------------------------------------------------------
// ルーティング設定

// LINEからのコールバックがこのURLにPOSTされます。
router.post('/', (req, res) => {

    // Signature Validation
    if (!LineBot.validateSignature(req.get('X-Line-Signature'), req.rawBody)){
        return res.status(401).send('Signature validation failed.');
    }
    console.log('Signature validation succeeded.');

    try {

        for (let botEvent of req.body.events){
            // 受信したメッセージをGoogle Translate APIで英語に翻訳。
            if (botEvent.type == "message"){
                console.log("Got message from " + botEvent.source.userId);
                googleTranslate.translate(botEvent.message.text, 'en', function(err, translation) {
                    if (err){
                        console.log(err);
                        return;
                    }
                    console.log("Translation: " + translation.translatedText);

                    // 英語翻訳したメッセージをセット。
                    botEvent.message.translatedText = translation.translatedText;

                    // 英語翻訳したメッセージを含むitemオブジェクトをapi.aiにかける。
                    LineBot.processMessage(
                        botEvent.message.text,
                        translation.translatedText,
                        botEvent.source.userId,
                        botEvent.replyToken
                    );
                });
            }
        }

    } catch (err) {
        console.log(err);
    }

    res.status(200).end();
});
// -----------------------------------------------------------------------------

/*
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
*/

module.exports = router;
