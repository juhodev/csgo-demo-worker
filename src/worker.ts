import fetch from 'node-fetch';
import { logger } from '.';
import { Match } from './steam/types';

async function registerWorker() {
	const { MASTER_SERVER_URL, DEMO_WORKER_PASSWORD, WORKER_ADDRESS } = process.env;
	logger.info('Registering worker');

	const response = await fetch(`${MASTER_SERVER_URL}/api/demoworker/worker`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			password: DEMO_WORKER_PASSWORD,
			address: WORKER_ADDRESS,
		}),
	});

	if (response.ok) {
		logger.info('Worker registered');
	} else {
		logger.error(`Couldn't register worker ${response.status}`);
	}
}

async function sendMatchToMaster(match: Match) {
	const { MASTER_SERVER_URL, DEMO_WORKER_PASSWORD } = process.env;

	const response = await fetch(`${MASTER_SERVER_URL}/api/demoworker/demo`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			password: DEMO_WORKER_PASSWORD,
			address: 'http://192.168.1.236:8080',
			match,
		}),
	});

	if (response.ok) {
		logger.info('Match sent to the master');
	} else {
		logger.error(`Match couldn't be sent to the master ${response.status}`);
	}
}

export { registerWorker, sendMatchToMaster };
