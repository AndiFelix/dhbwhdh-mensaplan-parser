"use strict";
const fs = require("fs");
const util = require("util");

const cd = new Date();
const currentDateString = util.format("%d-%d-%d@%d:%d.%d", cd.getDate(), cd.getMonth() + 1, cd.getFullYear(), cd.getHours() + 1,
        cd.getMinutes(), cd.getSeconds());

function writeLog(logText, level) {
    console.log("[" + level + "] " + logText);
    fs.appendFile("./checker.log", currentDateString + " [" + level + "] " + logText + "\n", function (err) {
    });
}

exports.l = function (logText) {
    writeLog(logText, "LOG");
};

exports.e = function (logText) {
    writeLog(logText, "ERR");
};

exports.i = function (logText) {
    writeLog(logText, "INF");
};

exports.w = function (logText) {
    writeLog(logText, "WAR");
};




