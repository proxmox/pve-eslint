const eslint = require('./lib/eslint.js');
const createWorker = require('./lib/worker.js');

module.exports = eslint;
module.exports.createWorker = createWorker;
