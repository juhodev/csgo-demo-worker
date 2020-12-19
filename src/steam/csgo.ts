import {
	LoginDetails,
	LoginState,
	SharingCode,
	MatchSharingCsgoMatch,
} from './types';
import * as Steam from 'steam';
import * as cs from 'csgo';
import { logger } from '..';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

class Csgo {
	private steamUser: Steam.SteamUser;
	private steamClient: Steam.SteamClient;
	private csgoClient: cs.CSGOClient;

	private loginDetails: LoginDetails;

	private loginState: LoginState;
	constructor() {
		this.loginState = LoginState.STEAM_NOT_READY;

		this.onSteamConnection = this.onSteamConnection.bind(this);
		this.onError = this.onError.bind(this);
		this.onLogOnResponse = this.onLogOnResponse.bind(this);
		this.onUpdateMachineAuth = this.onUpdateMachineAuth.bind(this);
		this.onSentry = this.onSentry.bind(this);
		this.onCsgoReady = this.onCsgoReady.bind(this);
	}

	/**
	 * This logs in to steam and launches CSGO. The Promise is resolved after
	 * the CSGO client is launched.
	 *
	 * @param details Log in details to log in with
	 */
	async login(details: LoginDetails) {
		return new Promise((resolve, reject) => {
			this.loginDetails = details;
			this.steamClient = new Steam.SteamClient();
			this.steamUser = new Steam.SteamUser(this.steamClient);
			// this initializes the steam game coordinator for CSGO (game id 730)
			const steamGC = new Steam.SteamGameCoordinator(
				this.steamClient,
				730,
			);
			this.csgoClient = new cs.CSGOClient(this.steamUser, steamGC, false);

			this.steamClient.connect();

			this.steamClient.on('connected', this.onSteamConnection);
			this.steamClient.on('error', (error) =>
				this.onError(error, reject),
			);
			this.steamClient.on('logOnResponse', (response) =>
				this.onLogOnResponse(response, reject),
			);
			this.steamClient.on('sentry', this.onSentry);

			this.steamUser.on('updateMachineAuth', this.onUpdateMachineAuth);
			this.csgoClient.on('ready', () => this.onCsgoReady(resolve));
		});
	}

	/**
	 * This requests the from the Steam server and when the `matchList` event
	 * is called this will return the match
	 *
	 * @param sharingCode Sharing code for the game you want to request
	 * @returns The match object returned by the steam server.
	 */
	async requestGame(
		sharingCode: SharingCode,
	): Promise<MatchSharingCsgoMatch> {
		return new Promise((resolve) => {
			// This requests the game from the client.
			this.csgoClient.requestGame(
				sharingCode.matchId,
				sharingCode.outcomeId,
				parseInt(sharingCode.tokenId), // REMEMBER: The tokenId needs to be a number
			);

			logger.log(
				'debug',
				`Requested game ${JSON.stringify(sharingCode)}`,
			);

			this.csgoClient.on('matchList', (matchList) => {
				// I only requested one match so if the response has more than one game
				// I want to ignore it because I don't know what data will be in there.
				if (matchList.matches.length !== 1) {
					logger.error(
						'Received more than onen match or zero matches!',
					);
					return;
				}

				const match: MatchSharingCsgoMatch = matchList.matches[0];
				resolve(match);
			});
		});
	}

	/**
	 * This function is called when a connection to steam is established NOT when
	 * steam is logged in.
	 *
	 * This tries to log in to steam with the `loginDetails` passed in to the login
	 * function. If a sentry file is found in the `data` folder it also gets added
	 * to the login details.
	 */
	private onSteamConnection() {
		logger.log('info', 'Connected to steam');
		this.loginState = LoginState.STEAM_CONNECTED;

		const sentryFile: string = path.resolve('data', 'sentry');
		if (fs.existsSync(sentryFile)) {
			const sha: Buffer = this.makeSha(fs.readFileSync(sentryFile));
			this.loginDetails.sha_sentryfile = sha;
		}

		this.steamUser.logOn(this.loginDetails);
	}

	/**
	 * This saves the machine auth information to a sentry file.
	 *
	 * With this information the steam client remembers if it has already
	 * logged in on this device.
	 *
	 * @param response Response from logging in to steam
	 * @param callback Callback method to something not sure what :-)
	 */
	private onUpdateMachineAuth(response, callback) {
		const sentryFile: string = path.resolve('data', 'sentry');
		fs.writeFileSync(sentryFile, response.bytes);
		callback({ sha_file: this.makeSha(response.bytes) });
	}

	/**
	 * This is called when I receive a log in response from the steam
	 * servers.
	 *
	 * @param response Response from steam log in
	 */
	private onLogOnResponse(response, reject) {
		if (response.eresult !== Steam.EResult.OK) {
			logger.log('error', `Couldn't log in to steam!`);
			reject();
			return;
		}

		logger.log('info', 'Logged in to steam!');
		this.loginState = LoginState.STEAM_LOGGED_IN;
		this.csgoClient.launch();
	}

	private onSentry(sentry) {
		const sentryFile: string = path.resolve('data', 'sentry');
		fs.writeFileSync(sentryFile, sentry);
	}

	/**
	 * Called after CSGO is launched
	 *
	 * @param resolve Resolve function from a Promise
	 */
	private onCsgoReady(resolve) {
		logger.log('info', 'CSGO launched and ready!');
		this.loginState = LoginState.CSGO_READY;
		resolve();
	}

	private onError(error: any, reject: any) {
		logger.log('error', error);

		// On error gets called when the client is disconnected by the server.
		//
		// I want to reconnect if this happens during a valid session
		// I don't want to try to reconnect if my loginDetails don't have an auth code
		// because then it's most likely that I've received one in my email and I have
		// to supply that.
		if (
			!this.steamClient.loggedOn &&
			this.loginDetails.auth_code !== undefined
		) {
			this.login(this.loginDetails);
			return;
		}
		reject();
	}

	private makeSha(bytes: Buffer) {
		const hash = crypto.createHash('sha1');
		hash.update(bytes);
		return hash.digest();
	}

	getLoginState() {
		return this.loginState;
	}
}

export default Csgo;
