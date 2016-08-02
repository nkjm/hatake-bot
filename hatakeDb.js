'use strict';

const request = require('request');
const hatakeConfig = require('./hatakeConfig.js');

module.exports = class HatakeDb {

    static getLatestMoisture(callback){
        const headers = {
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
                if (response.body && JSON.parse(response.body).items && JSON.parse(response.body).items.length == 1){
                    callback(JSON.parse(response.body).items[0].moisture);
                } else {
                    callback("?");
                }
            }
        });
    }

}
