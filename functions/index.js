//exports.findDivergencesAe = require('./firebase-functions/findDivergencesAe');
//exports.findDivergencesFl = require('./firebase-functions/findDivergencesFl');
//exports.findDivergencesMs = require('./firebase-functions/findDivergencesMs');
//exports.findDivergencesTz = require('./firebase-functions/findDivergencesTz');

Object.assign(exports, require("./firebase-functions/findDivergencesAe"));
Object.assign(exports, require("./firebase-functions/findDivergencesFl"));
//Object.assign(exports, require("./firebase-functions/findDivergencesMs"));
//Object.assign(exports, require("./firebase-functions/findDivergencesTz"));