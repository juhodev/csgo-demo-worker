import { logger, timer } from '.';
import Csgo from './steam/csgo';
import {
	LoginDetails,
	LoginState,
	Match,
	MatchSharingCsgoMatch,
	RoundStats,
	SharingCode,
} from './steam/types';
import * as cs from 'csgo';
import * as util from 'util';
import * as path from 'path';
import * as fs from 'fs';
import { ChildProcess, exec } from 'child_process';
import Demo from './steam/demo';
import fetch from 'node-fetch';
import { sendMatchToMaster } from './worker';

const streamPipeline = util.promisify(require('stream').pipeline);

class Downloader {
	private csgo: Csgo;

	private working: boolean;
	private downloadQueue: string[];
	private initialized: boolean;

	constructor() {
		this.csgo = new Csgo();
		this.working = false;
		this.downloadQueue = [];
		this.initialized = false;
	}

	async init(loginDetails: LoginDetails) {
		this.initialized = true;
		await this.csgo.login(loginDetails);
		this.download();
	}

	isInitialized() {
		return this.initialized;
	}

	/**
	 * Adds a demo to the download queue
	 *
	 * @param demoLink Link for the demo download
	 */
	add(demoCode: string) {
		this.downloadQueue.push(demoCode);
		logger.log('debug', `${demoCode} added to the download queue`);
		this.download();
	}

	private async download() {
		// We don't want to proceed with downloading in three cases:
		// 1. We're already downloading a demo
		// 2. The csgo client hasn't launched yet, when the client is ready it'll start
		//    downloading demos.
		// 3. The download queue is empty
		if (
			this.working ||
			this.csgo.getLoginState() !== LoginState.CSGO_READY ||
			this.downloadQueue.length === 0
		) {
			return;
		}

		this.working = true;
		timer.start('demo');

		const sharingCode: string = this.downloadQueue.shift();
		// TODO: Check if a demo with this code has already been downloaded

		const decodedSharingCode: SharingCode = this.decodeSharingCode(
			sharingCode,
		);

		// This returns a game with all the round stats but more importantly the last round
		// will have a link to the demo file. I need to parse the demo file because this response
		// at least to my knowledge doens't return what side the player is on.
		const match: MatchSharingCsgoMatch = await this.csgo.requestGame(
			decodedSharingCode,
		);

		const lastRound: RoundStats =
			match.roundstatsall[match.roundstatsall.length - 1];

		// I have no idea why the demo link is called `map` but it is.
		const demoLink: string = lastRound.map;

		if (demoLink === undefined) {
			logger.error(
				`Couldn't get the demo link from this match: ${JSON.stringify(
					match,
				)}`,
			);
			return;
		}

		const demoFilePath: string = await this.downloadDemo(demoLink);

		if (demoFilePath === undefined) {
			logger.error('demoFilePath is undefined');
			return;
		}

		const decompressedFilePath: string = await this.decompressWithBzip2(
			demoFilePath,
		);
		const demo: Demo = new Demo(
			decompressedFilePath,
			match.matchtime * 1000, // The time needs to be * 1000 to convert it to JS timestamp
		);
		const demoMatch: Match = await demo.process();
		logger.debug(JSON.stringify(demoMatch));
		this.working = false;
		sendMatchToMaster(demoMatch);
	}

	/**
	 * Downloads a demo and saves it in `data/demos/<demo_name>`.
	 *
	 * @param demoLink The link to the demo you want to download
	 * @returns Path to the the downloaded file
	 */
	private async downloadDemo(demoLink: string): Promise<string> {
		const demoName: string = demoLink.substr(demoLink.lastIndexOf('/') + 1);
		const filePath: string = path.resolve('data', 'demos', demoName);

		logger.debug(`Downloading demo ${demoName} (${demoLink})`);

		const response = await fetch(demoLink);
		if (response.ok) {
			logger.debug(`Got the response! Writing to ${filePath}`);
			await streamPipeline(response.body, fs.createWriteStream(filePath));
			logger.debug(`Demo ${demoName} downloaded`);
			return filePath;
		} else {
			logger.error(
				`The response wasn't OK!!! response code: ${response.status}`,
			);
			return undefined;
		}
	}

	/**
	 * Decompresses a file with bzip2.
	 *
	 * The demo files are in bzip2 archives and the best way to decompress them
	 * it just to run bzip2 on the command line.
	 *
	 * The Promise resolves after the program has ran.
	 *
	 * @param filePath Path to the file you want to decompress
	 */
	private async decompressWithBzip2(filePath: string): Promise<string> {
		return new Promise((resolve) => {
			logger.debug(`Decompressing file ${filePath}`);
			const command = `bzip2 -d ${filePath}`;
			const process: ChildProcess = exec(command);
			process.on('exit', () => {
				const decompressedPath: string = filePath.substr(
					0,
					filePath.length - 4,
				);
				logger.debug(`Decompressed ${filePath}`);
				resolve(decompressedPath);
			});
		});
	}

	private decodeSharingCode(sharingCode: string): SharingCode {
		return new cs.SharecodeDecoder(sharingCode).decode();
	}
}

export default Downloader;
