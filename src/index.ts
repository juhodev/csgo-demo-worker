import * as dotenv from 'dotenv';
dotenv.config();

import * as winston from 'winston';
import startApi from './api/server';
import Downloader from './downloader';
import * as fs from 'fs';
import { registerWorker } from './worker';
import Timer from './timer';

const logger = winston.createLogger({
	level: 'debug',
	format: winston.format.json(),
	transports: [new winston.transports.File({ filename: 'data/all.log' })],
});

if (process.env.NODE_ENV !== 'production') {
	logger.add(
		new winston.transports.Console({ format: winston.format.simple() }),
	);
}

if (!fs.existsSync('data')) {
	fs.mkdirSync('data');
	logger.info(`Data folder created`);
}

if (!fs.existsSync('data/demos')) {
	fs.mkdirSync('data/demos');
	logger.info(`Demos folder created`);
}

const downloader: Downloader = new Downloader();
const timer: Timer = new Timer();

startApi();
registerWorker();

export { logger, downloader, timer };
