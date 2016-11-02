'use strict';

const APIAI = require('apiai');
const uuid = require('node-uuid');
const request = require('request');
const utility = require('./utility.js');
const crypto = require('crypto');
const HatakeDb = require('./hatakeDb.js');
const hatakeConfig = require('./hatakeConfig.js');

const LINE_CHANNEL_ID = process.env.LINE_CHANNEL_ID;
const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET;
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const BOT_ADMIN_LINE_MID = process.env.BOT_ADMIN_LINE_MID;
const APIAI_ACCESS_TOKEN = process.env.APIAI_ACCESS_TOKEN;
const APIAI_LANG = process.env.APIAI_LANG;

module.exports = class LineBot {

    static validateSignature(signature, rawBody){
        // Signature Validation
        let hash = crypto.createHmac('sha256', LINE_CHANNEL_SECRET).update(rawBody).digest('base64');
        if (hash != signature) {
            return false;
        }
        return true;
    }

    static processMessage(messageText, translatedMessageText, sourceUserId, replyToken) {
        // apiai sdkのインスタンスを初期化。
        let apiai = APIAI(APIAI_ACCESS_TOKEN, {
            language: APIAI_LANG,
            requestSource: "line"
        });
        let sessionId = uuid.v1();
        let apiaiRequest = apiai.textRequest(translatedMessageText,　{sessionId: sessionId});

        // api.aiからのメッセージ受信後のコールバック。
        apiaiRequest.on('response', (response) => {

            let responseText;
            let that = this;

            // レスポンスのresultが空の場合。通常は有りえない。
            if (!utility.isDefined(response.result)) {
                console.log('Received empty result');
                responseText = "私、ちょっと具合が悪い見たいです。良いエンジニアに診てもらわないと・・";
                LineBot.replyMessage(replyToken, responseText);
                return;
            }

            // api.aiに該当するactionが設定されていないか、うまく特定できなかった場合。
            if (!utility.isDefined(response.result.action)) {
                console.log("Action is not defined on api.ai.");
                responseText = "う、、すみません、わかりません。";
                LineBot.replyMessage(replyToken, responseText);

                // Botの管理者にメッセージを送信。
                LineBot.pushMessage(BOT_ADMIN_LINE_MID, 'た、助けてください。わからないこと聞かれました。「' + message.content.text + '」「' + message.content.translatedText + '」');
                return;
            }

            // レスポンスが正しく返され、actionも設定されているので、あとはactionに応じた処理を実装していく。
            switch (response.result.action) {
                case "get-latest-moisture":
                    // 土壌湿度情報をクラウドデータベースに問い合わせ、その値に応じてレスポンスを設定します。
                    HatakeDb.getLatestMoisture(function(moisture){
                        responseText = LineBot.getResponseByMoisture(moisture);
                        console.log("Response: " + responseText);
                        if (utility.isDefined(responseText)) {
                            LineBot.replyMessage(replyToken, responseText);
                        } else {
                            responseText = "・・・";
                            LineBot.replyMessage(replyToken, responseText);
                        }
                    });
                    break;
                case "get-latest-light":
                    // 仮の実装で固定の値を常に返しています。本来は照度センサーの値を取得してレスポンスを設定するイメージです。
                    responseText = "いやー、きついですね。帽子かぶりたいくらいです。";
                    LineBot.replyMessage(replyToken, responseText);
                    break;
                case "get-latest-nutrition":
                    // 仮の実装で固定の値を常に返しています。本来は土壌養分の値を取得してレスポンスを設定するイメージです。
                    responseText = "肥え、プリーズ。";
                    LineBot.replyMessage(replyToken, responseText);
                    break;
                case "get-latest-soil":
                    // 土壌湿度とほぼ同じ処理です。
                    HatakeDb.getLatestMoisture(function(moisture){
                        responseText = "水分については、" + LineBot.getResponseByMoisture(moisture);
                        console.log("Response: " + responseText);
                        if (utility.isDefined(responseText)) {
                            LineBot.replyMessage(replyToken, responseText);
                        } else {
                            responseText = "・・・";
                            LineBot.replyMessage(replyToken, responseText);
                        }
                    });
                    break;
                default:
                    // api.ai側にはアクションが設定されているものの、このBotプログラム上に処理が実装されていなかった場合。
                    console.log("Action: '" + response.result.action + "' is not implemented.");

                    // もしapi.ai側でspeechが設定されていた場合、それをそのままレスポンスメッセージに使用します。
                    if (utility.isDefined(response.result.fulfillment) && utility.isDefined(response.result.fulfillment.speech)){
                        responseText = response.result.fulfillment.speech;
                        LineBot.replyMessage(replyToken, responseText);
                    } else {
                        responseText = "う、、すみません、わかりません。";
                        LineBot.replyMessage(replyToken, responseText);

                        // Botの管理者にメッセージを送信。
                        LineBot.pushMessage(BOT_ADMIN_LINE_MID, 'た、助けてください。わからないこと聞かれました。「' + message.content.text + '」「' + message.content.translatedText + '」');
                    }

                    break;
            }
        });

        // api.aiでエラー発生時のコールバック。
        apiaiRequest.on('error', (error) => console.error(error));

        // api.aiインスタンスの設定は完了。api.aiへのコールアウト開始。
        apiaiRequest.end();
    }

    /*
    // メッセージをapi.aiで処理する。
    processMessage(message, res) {
        // messageに必要な情報（送信元Midとメッセージ）があるか確認
        if (!message.content || !message.content.from || !message.content.translatedText) {
            console.log('empty message');
            return;
        }

        let chatId = message.content.from;
        let messageText = message.content.translatedText;

        console.log(chatId, messageText);

        if (!this._sessionIds.has(chatId)) {
            this._sessionIds.set(chatId, uuid.v1());
        }

        let apiaiRequest = this._apiaiService.textRequest(messageText,　{　sessionId: this._sessionIds.get(chatId)　});

        // api.aiからのメッセージ受信後のコールバック。
        apiaiRequest.on('response', (response) => {

            let responseText;
            let that = this;

            // レスポンスのresultが空の場合。通常は有りえない。
            if (!utility.isDefined(response.result)) {
                console.log('Received empty result');
                responseText = "私、ちょっと具合が悪い見たいです。良いエンジニアに診てもらわないと・・";
                that.postLineMessage(chatId, responseText);
                return;
            }

            // api.aiに該当するactionが設定されていないか、うまく特定できなかった場合。
            if (!utility.isDefined(response.result.action)) {
                console.log("Action is not defined on api.ai.");
                responseText = "う、、すみません、わかりません。";
                that.postLineMessage(chatId, responseText);

                // Botの管理者にメッセージを送信。
                that.postLineMessage(that._botConfig.botAdminLineMID, 'た、助けてください。わからないこと聞かれました。「' + message.content.text + '」「' + message.content.translatedText + '」');
                return;
            }

            // レスポンスが正しく返され、actionも設定されているので、あとはactionに応じた処理を実装していく。
            switch (response.result.action) {
                case "get-latest-moisture":
                    // 土壌湿度情報をクラウドデータベースに問い合わせ、その値に応じてレスポンスを設定します。
                    HatakeDb.getLatestMoisture(function(moisture){
                        responseText = LineBot.getResponseByMoisture(moisture);
                        console.log("Response: " + responseText);
                        if (utility.isDefined(responseText)) {
                            that.postLineMessage(chatId, responseText);
                        } else {
                            responseText = "・・・";
                            that.postLineMessage(chatId, responseText);
                        }
                    });
                    break;
                case "get-latest-light":
                    // 仮の実装で固定の値を常に返しています。本来は照度センサーの値を取得してレスポンスを設定するイメージです。
                    responseText = "いやー、きついですね。帽子かぶりたいくらいです。";
                    that.postLineMessage(chatId, responseText);
                    break;
                case "get-latest-nutrition":
                    // 仮の実装で固定の値を常に返しています。本来は土壌養分の値を取得してレスポンスを設定するイメージです。
                    responseText = "肥え、プリーズ。";
                    that.postLineMessage(chatId, responseText);
                    break;
                case "get-latest-soil":
                    // 土壌湿度とほぼ同じ処理です。
                    HatakeDb.getLatestMoisture(function(moisture){
                        responseText = "水分については、" + LineBot.getResponseByMoisture(moisture);
                        console.log("Response: " + responseText);
                        if (utility.isDefined(responseText)) {
                            that.postLineMessage(chatId, responseText);
                        } else {
                            responseText = "・・・";
                            that.postLineMessage(chatId, responseText);
                        }
                    });
                    break;
                default:
                    // api.ai側にはアクションが設定されているものの、このBotプログラム上に処理が実装されていなかった場合。
                    console.log("Action: '" + response.result.action + "' is not implemented.");

                    // もしapi.ai側でspeechが設定されていた場合、それをそのままレスポンスメッセージに使用します。
                    if (utility.isDefined(response.result.fulfillment) && utility.isDefined(response.result.fulfillment.speech)){
                        responseText = response.result.fulfillment.speech;
                        that.postLineMessage(chatId, responseText);
                    } else {
                        responseText = "う、、すみません、わかりません。";
                        that.postLineMessage(chatId, responseText);

                        // Botの管理者にメッセージを送信。
                        that.postLineMessage(that._botConfig.botAdminLineMID, 'た、助けてください。わからないこと聞かれました。「' + message.content.text + '」「' + message.content.translatedText + '」');
                    }

                    break;
            }
        });

        // api.aiでエラー発生時のコールバック。
        apiaiRequest.on('error', (error) => console.error(error));

        // api.aiインスタンスの設定は完了。api.aiへのコールアウト開始。
        apiaiRequest.end();
    }
    */

    // メッセージを送ってきたユーザーにLINEで返信する。
    /*
    postLineMessage(to, text) {
        request.post("https://trialbot-api.line.me/v1/events", {
            headers: {
                'X-Line-ChannelID': this._botConfig.channelId,
                'X-Line-ChannelSecret': this._botConfig.channelSecret,
                'X-Line-Trusted-User-With-ACL': this._botConfig.MID
            },
            json: {
                to: [to],
                toChannel: 1383378250,
                eventType: "138311608800106203",
                content: {
                    contentType: 1,
                    toType: 1,
                    text: text
                }
            }
        }, function (error, response, body) {
            if (error) {
                console.error('Error while sending message', error);
                return;
            }

            if (response.statusCode != 200) {
                console.error('Error status code while sending message', body);
                return;
            }

            console.log('Send LINE message succeeded');
        });
    }
    */

    // あらかじめ設定された土壌湿度閾値に応じて返信メッセージ本文を返す。
    static getResponseByMoisture(moisture){
        let response;
        if (typeof moisture === 'undefined' || !(moisture >= 0 && moisture <= 100)){
            response = "状況よくわかりませんでした。";
        } else if (moisture <= hatakeConfig.moistureThresholdLow){
            response = "カラカラです。";
        } else if (moisture <= hatakeConfig.moistureThresholdHigh){
            response = "ちょうど良い感じです。";
        } else {
            response = "ジャブジャブです。";
        }
        return response;
    }

    static replyMessage(replyToken, message){
        let headers = {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + LINE_CHANNEL_ACCESS_TOKEN
        };

        let body = {
            replyToken: replyToken,
            messages: [message]
        }
        console.log(headers);
        console.log(body);
        let url = 'https://api.line.me/v2/bot/message/reply';
        request({
            url: url,
            method: 'POST',
            headers: headers,
            body: body,
            json: true
        }, function (error, response, body) {
            (error) ? console.log(error) : console.log('Line reply sent.');
        });
    }

    static pushMessage(to, message){
        let headers = {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + LINE_CHANNEL_ACCESS_TOKEN
        };
        let body = {
            to: to,
            messages: [message]
        }
        let url = 'https://api.line.me/v2/bot/message/push';
        request({
            url: url,
            method: 'POST',
            headers: headers,
            body: body,
            json: true
        }, function (error, response, body) {
            (error) ? console.log(error) : console.log('Line message sent.');
        });
    }

    /*
    /  New Bot api
    */
    /*
    const LINE_CHANNEL_ID = process.env.LINE_CHANNEL_ID;
    const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET;
    const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    const LINE_MID = process.env.LINE_MID;
    const BOT_ADMIN_LINE_MID = process.env.BOT_ADMIN_LINE_MID;
    const crypto = require('crypto');
    const request = require('request');
    const Promise = require('bluebird');

    module.exports = class LineBot {

        static pushMessage(to, message){
            return new Promise(function(resolve, reject){
                let headers = {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + LINE_CHANNEL_ACCESS_TOKEN
                };
                let body = {
                    to: to,
                    messages: [message]
                }
                let url = 'https://api.line.me/v2/bot/message/push';
                request({
                    url: url,
                    method: 'POST',
                    headers: headers,
                    body: body,
                    json: true
                }, function (error, response, body) {
                    (error) ? reject(error) : resolve();
                });
            });
        }

        static replyMessage(replyToken, message){
            return new Promise(function(resolve, reject){
                let headers = {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + LINE_CHANNEL_ACCESS_TOKEN
                };
                let body = {
                    replyToken: replyToken,
                    messages: [message]
                }
                let url = 'https://api.line.me/v2/bot/message/reply';
                request({
                    url: url,
                    method: 'POST',
                    headers: headers,
                    body: body,
                    json: true
                }, function (error, response, body) {
                    (error) ? reject(error) : resolve();
                });
            });
        }

    };
    */
};
