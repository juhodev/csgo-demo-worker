import * as demofile from 'demofile';
import * as fs from 'fs';
import { logger } from '..';
import { saveProcessTime } from '../metrics/db';
import { Match, Player, Team } from './types';
import { changeMapName } from './utils';

class Demo {
	private demoFilePath: string;
	private players: demofile.Player[];
	private demoFile: demofile.DemoFile;
	private matchTime: number;

	private processStart: number;

	constructor(demoFilePath: string, matchTime: number) {
		this.demoFilePath = demoFilePath;
		this.players = [];
		this.matchTime = matchTime;

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

		// If the player rejoins the game this event will still get called
		// even if the player entity is already in the `players` array.
		// Ignore the player if it's already in the `players` array.
		const playerAlreadyExists: boolean = this.players.some(
			(p) => p.userInfo.friendsId === entity.userInfo.friendsId,
		);

		if (playerAlreadyExists) {
			return;
		}

		this.players.push(entity);
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
			const player: Player = {
				name: playerEntity.userInfo.name,
				steamId3: playerEntity.userInfo.friendsId.toString(),
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
