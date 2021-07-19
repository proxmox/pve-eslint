'use strict';

const worker = require('worker_threads');

if (!worker.isMainThread) {
    const eslint = require('pve-eslint');
    const data = worker.workerData;
    const cli = new eslint.CLIEngine(data.cliOptions);
    const report = cli.executeOnFiles(data.files);
    worker.parentPort.postMessage(report);
} else {
    module.exports = async function createWorker(workerData) {
	return new Promise((resolve, reject) => {
	    const child = new worker.Worker(__filename,
		{
		    workerData,
		},
	    );
	    child.on('message', resolve);
	    child.on('error', reject);
	    child.on('exit', (code) => {
		if (code !== 0) {reject(new Error(`Worker stopped with exit code ${code}`));}
	    });
	});
    }
}

