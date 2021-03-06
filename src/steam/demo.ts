import * as demofile from 'demofile';
import {
	IEventBombPlanted,
	IEventItemPickup,
	IEventPlayerBlind,
	IEventPlayerFalldamage,
	IEventPlayerFootstep,
	IEventPlayerHurt,
	IEventPlayerJump,
	IEventWeaponFire,
	IEventWeaponReload,
	IEventWeaponZoom,
} from 'demofile';
import * as fs from 'fs';
import { logger, timer } from '..';
import { saveProcessTime } from '../metrics/db';
import CsgoMap from './map/csgoMap';
import { HeatmapPosition, Position } from './map/types';
import { DamageTaken, ItemPickup, Match, Player, PlayerIdentity, Team, UnnecessaryStats, WeaponFire } from './types';
import { changeMapName } from './utils';

class Demo {
	private demoFilePath: string;
	private players: demofile.Player[];
	private demoFile: demofile.DemoFile;
	private matchTime: number;
	private playerIdentities: Map<string, PlayerIdentity>;
	// This'll contain stats that no one really needs but I want to save
	private unnecessaryStats: Map<number, UnnecessaryStats>;
	private firingHeatmap: Map<number, CsgoMap>;

	constructor(demoFilePath: string, matchTime: number) {
		this.demoFilePath = demoFilePath;
		this.players = [];
		this.matchTime = matchTime;
		this.playerIdentities = new Map();
		this.unnecessaryStats = new Map();
		this.firingHeatmap = new Map();

		this.onEntityCreate = this.onEntityCreate.bind(this);
		this.onError = this.onError.bind(this);
		this.onEnd = this.onEnd.bind(this);
		this.onPlayerJump = this.onPlayerJump.bind(this);
		this.onPlayerFallDamage = this.onPlayerFallDamage.bind(this);
		this.onWeaponFire = this.onWeaponFire.bind(this);
		this.onWeaponZoom = this.onWeaponZoom.bind(this);
		this.onPlayerHurt = this.onPlayerHurt.bind(this);
		this.onPlayerBlind = this.onPlayerBlind.bind(this);
		this.onItemPickup = this.onItemPickup.bind(this);
		this.onWeaponReload = this.onWeaponReload.bind(this);
		this.onPlayerFootstep = this.onPlayerFootstep.bind(this);
		this.onBombPlant = this.onBombPlant.bind(this);
	}

	// TODO: Divide the map into squares and use those squares to draw a heatmap
	// of some sorts. There's no point in doing it pixel by pixel (or well coordinate by coordinate or whatever the fuck)

	async process(): Promise<Match> {
		return new Promise((resolve, reject) => {
			logger.debug(`Processing demo ${this.demoFilePath}`);
			this.createDemoFile(resolve, reject);

			const demo: Buffer = fs.readFileSync(this.demoFilePath);
			this.demoFile.parse(demo);
		});
	}

	private createDemoFile(resolve: (match: Match) => void, reject: (reason: any) => void) {
		this.demoFile = new demofile.DemoFile();

		this.demoFile.entities.on('create', this.onEntityCreate);

		this.demoFile.gameEvents.on('player_jump', this.onPlayerJump);
		this.demoFile.gameEvents.on('player_falldamage', this.onPlayerFallDamage);
		this.demoFile.gameEvents.on('weapon_fire', this.onWeaponFire);
		this.demoFile.gameEvents.on('weapon_zoom', this.onWeaponZoom);
		this.demoFile.gameEvents.on('player_hurt', this.onPlayerHurt);
		this.demoFile.gameEvents.on('player_blind', this.onPlayerBlind);
		this.demoFile.gameEvents.on('item_pickup', this.onItemPickup);
		this.demoFile.gameEvents.on('weapon_reload', this.onWeaponReload);
		this.demoFile.gameEvents.on('player_footstep', this.onPlayerFootstep);
		this.demoFile.gameEvents.on('bomb_planted', this.onBombPlant);

		this.demoFile.on('error', (e) => this.onError(e, reject));
		this.demoFile.on('end', () => this.onEnd(resolve));
	}

	private onPlayerJump(event: IEventPlayerJump) {
		const { userid } = event;
		const stats: UnnecessaryStats = this.getUnnecessaryStats(userid);

		stats.jumps++;
	}

	private onBombPlant(event: IEventBombPlanted) {
		const { userid } = event;
		const stats: UnnecessaryStats = this.getUnnecessaryStats(userid);

		stats.bombPlants++;
	}

	private onPlayerFallDamage(event: IEventPlayerFalldamage) {
		const { damage, userid } = event;
		const stats: UnnecessaryStats = this.getUnnecessaryStats(userid);

		stats.fallDamage += damage;
	}

	private onWeaponFire(event: IEventWeaponFire) {
		const { weapon, userid } = event;
		const stats: UnnecessaryStats = this.getUnnecessaryStats(userid);

		let weaponFire: WeaponFire = stats.weaponFire.find((x) => x.weapon === weapon);
		if (weaponFire === undefined) {
			weaponFire = { count: 0, weapon };
			stats.weaponFire.push(weaponFire);
		}

		this.logPlayerLocation(userid);

		weaponFire.count++;
		stats.weaponFire;
	}

	private onWeaponZoom(event: IEventWeaponZoom) {
		const { userid } = event;
		const stats: UnnecessaryStats = this.getUnnecessaryStats(userid);

		stats.weaponZooms++;
	}

	private onPlayerFootstep(event: IEventPlayerFootstep) {
		const { userid } = event;
		const stats: UnnecessaryStats = this.getUnnecessaryStats(userid);

		stats.footsteps++;
	}

	private onWeaponReload(event: IEventWeaponReload) {
		const { userid } = event;
		const stats: UnnecessaryStats = this.getUnnecessaryStats(userid);

		stats.reloads++;
	}

	private onItemPickup(event: IEventItemPickup) {
		const { userid, item, silent } = event;
		const stats: UnnecessaryStats = this.getUnnecessaryStats(userid);

		let itemPickup: ItemPickup = stats.itemPickup.find((x) => x.item === item);
		if (itemPickup === undefined) {
			itemPickup = { count: 0, item, silent: 0 };
			stats.itemPickup.push(itemPickup);
		}

		itemPickup.count++;
		if (silent) {
			itemPickup.silent++;
		}
	}

	private onPlayerBlind(event: IEventPlayerBlind) {
		const { userid, blind_duration } = event;
		const stats: UnnecessaryStats = this.getUnnecessaryStats(userid);

		stats.blind.duration += blind_duration;
		stats.blind.times++;
	}

	private onPlayerHurt(event: IEventPlayerHurt) {
		const { userid, dmg_health, weapon } = event;
		const stats: UnnecessaryStats = this.getUnnecessaryStats(userid);

		let damageTaken: DamageTaken = stats.damageTaken.find((x) => x.weapon === weapon);
		if (damageTaken === undefined) {
			damageTaken = { amount: 0, weapon };
			stats.damageTaken.push(damageTaken);
		}

		damageTaken.amount += dmg_health;
		stats.weaponFire;
	}

	private getUnnecessaryStats(userid: number): UnnecessaryStats {
		if (!this.unnecessaryStats.has(userid)) {
			this.unnecessaryStats.set(userid, {
				version: 1,
				jumps: 0,
				fallDamage: 0,
				weaponFire: [],
				weaponZooms: 0,
				damageTaken: [],
				blind: {
					duration: 0,
					times: 0,
				},
				footsteps: 0,
				itemPickup: [],
				reloads: 0,
				bombPlants: 0,
				firingHeatmap: [],
			});
		}

		return this.unnecessaryStats.get(userid);
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
		const playerIndex: number = this.players.findIndex((p) => p.steam64Id === entity.steam64Id);

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

	private async onEnd(resolve: (match: Match) => void) {
		const tRounds: number = this.demoFile.teams.find((team) => team.teamName === 'TERRORIST')?.score;

		// The typescript types think that the CT team name is COUNTERTERRORIST but it's
		// actually CT. This way I don't get an error when building. Should probably submit a PR
		// but I'm not doing that right now.
		const ctTeamName: string = 'CT';
		const ctRounds: number = this.demoFile.teams.find((team) => team.teamName === ctTeamName)?.score;

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
			const identity: PlayerIdentity = this.playerIdentities.get(playerEntity.steam64Id);

			const firingHeatmap: CsgoMap = this.firingHeatmap.get(playerEntity.userId);
			if (firingHeatmap !== undefined) {
				const firingPositions: HeatmapPosition[] = firingHeatmap.save(this.demoFile.header.mapName);
				const unnecessaryStats: UnnecessaryStats = this.unnecessaryStats.get(playerEntity.userId);
				unnecessaryStats.firingHeatmap = firingPositions;
			}

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
				unnecessaryStats: this.unnecessaryStats.get(playerEntity.userId),
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
		const processingTime: number = timer.end('demo');
		await saveProcessTime(currentTime, processingTime, this.demoFilePath);

		logger.debug('Demo processed!');
		resolve(match);
	}

	private logPlayerLocation(userid: number) {
		const entity: demofile.Player = this.players.find((player) => player.userId === userid);
		if (entity !== undefined) {
			if (!this.firingHeatmap.has(entity.userId)) {
				this.firingHeatmap.set(entity.userId, new CsgoMap());
			}

			const map: CsgoMap = this.firingHeatmap.get(entity.userId);
			map.addPoint({ x: entity.position.x, y: entity.position.y });
		}
	}
}

export default Demo;
