module.exports = {
    isEmptyStr: isEmptyStr,
    trimStr: trimStr,
    strToInt: strToInt,
    timestamp: timestamp,
};

var moment = require('moment');

function timestamp() {
    return moment().format("YYYY/MM/DD hh:mm:ss A");
}

function trimStr(str) {
    return str ? str.trim() : '';
}

function isEmptyStr(str) {
    return !str || !str.trim()
}

function strToInt(str) {
    if (str === undefined || str === null) return null;
    if (str === "0") return 0;
    return parseInt(str);
}