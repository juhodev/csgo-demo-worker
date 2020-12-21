import * as demofile from 'demofile';
import * as fs from 'fs';
import { logger } from '..';
import { saveProcessTime } from '../metrics/db';
import { Match, Player, PlayerIdentity, Team } from './types';
import { changeMapName } from './utils';

class Demo {
	private demoFilePath: string;
	private players: demofile.Player[];
	private demoFile: demofile.DemoFile;
	private matchTime: number;
	private playerIdentities: Map<string, PlayerIdentity>;

	private processStart: number;

	constructor(demoFilePath: string, matchTime: number) {
		this.demoFilePath = demoFilePath;
		this.players = [];
		this.matchTime = matchTime;
		this.playerIdentities = new Map();

		this.onEntityCreate = this.onEntityCreate.bind(this);
		this.onError = this.onError.bind(this);
		this.onEnd = this.onEnd.bind(this);
	}

	async process(): Promise<Match> {
		return new Promise((resolve, reject) => {
			this.processStart = new Date().getTime();
			logger.debug(`Processing demo ${this.demoFilePath}`);
			this.createDemoFile(resolve, reject);

			const demo: Buffer = fs.readFileSync(this.demoFilePath);
			this.demoFile.parse(demo);
		});
	}

	private createDemoFile(
		resolve: (match: Match) => void,
		reject: (reason: any) => void,
	) {
		this.demoFile = new demofile.DemoFile();

		this.demoFile.entities.on('create', this.onEntityCreate);

		this.demoFile.on('error', (e) => this.onError(e, reject));
		this.demoFile.on('end', () => this.onEnd(resolve));
	}

	private onEntityCreate(event: demofile.IEntityCreationEvent) {
		const { entity } = event;

		// We don't care if the entity is not a player
		if (!(entity instanceof demofile.Player)) {
			return;
		}

		// We don't care if the player is a fake player.
		// A fake player is a bot
		if (entity.isFakePlayer) {
			return;
		}

		// If the player already exists in the `players` array we should
		// remove it and update it with the new player entity that just joined.
		// This happens when a player leaves and rejoins the game.
		const playerIndex: number = this.players.findIndex(
			(p) => p.steam64Id === entity.steam64Id,
		);

		if (playerIndex !== -1) {
			this.players.splice(playerIndex, 1);
		}

		this.players.push(entity);

		// I need to keep track of the player names and ids separately because
		// when a player leaves at the end of the game, their name and steamid3 is replaced
		// with a bot but their steamid64 stays the same.
		this.playerIdentities.set(entity.steam64Id, {
			name: entity.userInfo.name,
			steamId3: entity.userInfo.friendsId,
			steamId64: entity.steam64Id,
		});
	}

	private onError(error: any, reject: (reason: any) => void) {
		logger.error(`An error occured while parsing a demo ${error}`);
		reject(error);
	}

	private onEnd(resolve: (match: Match) => void) {
		const tRounds: number = this.demoFile.teams.find(
			(team) => team.teamName === 'TERRORIST',
		)?.score;

		// The typescript types think that the CT team name is COUNTERTERRORIST but it's
		// actually CT. This way I don't get an error when building. Should probably submit a PR
		// but I'm not doing that right now.
		const ctTeamName: string = 'CT';
		const ctRounds: number = this.demoFile.teams.find(
			(team) => team.teamName === ctTeamName,
		)?.score;

		// If for whatever reason I can't find both teams I should
		// just return.
		if (tRounds === undefined || ctRounds === undefined) {
			return;
		}

		// The winner can be `CT`, `T` or if both teams have the same number of
		// rounds then the winner will be `TIE`
		let winner: string;

		if (tRounds === ctRounds) {
			winner = 'TIE';
		} else if (tRounds > ctRounds) {
			winner = 'T';
		} else {
			winner = 'CT';
		}

		const teams: { T: Team; CT: Team } = {
			T: {
				players: [],
				score: tRounds,
				side: 'T',
				winner: winner === 'T',
			},
			CT: {
				players: [],
				score: ctRounds,
				side: 'CT',
				winner: winner === 'CT',
			},
		};

		for (const playerEntity of this.players) {
			// Get the player identity from the ones that are saved when the entity is created. Sometimes
			// the player's name and steamid3 is replaced with ones from a bot. Their steamid64 always stays the
			// same.
			const identity: PlayerIdentity = this.playerIdentities.get(
				playerEntity.steam64Id,
			);

			const player: Player = {
				name: identity.name,
				steamId3: identity.steamId3.toString(),
				steamId64: playerEntity.steam64Id,
				assists: playerEntity.assists,
				deaths: playerEntity.deaths,
				kills: playerEntity.kills,
				mvps: playerEntity.mvps,
				ping: 0,
				side: playerEntity.team?.teamName === 'TERRORIST' ? 'T' : 'CT',
				hsp: Math.round(
					(playerEntity.matchStats
						.map((round) => round.headShotKills)
						.reduce((prev, curr) => (prev += curr)) /
						playerEntity.matchStats.length) *
						100,
				),
				score: playerEntity.score,
			};

			teams[player.side].players.push(player);
		}

		const match: Match = {
			score: [tRounds, ctRounds],
			terroristTeam: teams.T,
			counterTerroristTeam: teams.CT,
			map: changeMapName(this.demoFile.header.mapName),
			date: this.matchTime,
			duration: Math.round(this.demoFile.header.playbackTime),
			winner,
		};

		const currentTime: number = new Date().getTime();
		const processingTime: number = currentTime - this.processStart;
		saveProcessTime(currentTime, processingTime, this.demoFilePath);

		logger.debug('Demo processed!');
		resolve(match);
	}
}

export default Demo;
