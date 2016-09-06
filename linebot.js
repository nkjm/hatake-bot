'use strict';

const apiai = require('apiai');
const uuid = require('node-uuid');
const request = require('request');
const HatakeDb = require('./hatakeDb.js');
const hatakeConfig = require('./hatakeConfig.js');
const utility = require('./utility.js');

module.exports = class LineBot {

    get apiaiService() {
        return this._apiaiService;
    }

    set apiaiService(value) {
        this._apiaiService = value;
    }

    get botConfig() {
        return this._botConfig;
    }

    set botConfig(value) {
        this._botConfig = value;
    }

    get sessionIds() {
        return this._sessionIds;
    }

    set sessionIds(value) {
        this._sessionIds = value;
    }

    constructor(botConfig) {
        this._botConfig = botConfig;
        var apiaiOptions = {
            language: botConfig.apiaiLang,
            requestSource: "line"
        };

        // apiai sdkのインスタンスを初期化。
        this._apiaiService = apiai(botConfig.apiaiAccessToken, apiaiOptions);

        this._sessionIds = new Map();
    }

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
                    responseText = "いやー、日差しはきついですね。帽子かぶりたいくらいです。";
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

    // メッセージを送ってきたユーザーにLINEで返信する。
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
};
