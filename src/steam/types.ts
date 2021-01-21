import { Weapon } from 'demofile';

export type LoginDetails = {
	account_name: string;
	password: string;
	auth_code?: string;
	sha_sentryfile?: Buffer;
};

export type SharingCode = {
	matchId: string;
	outcomeId: string;
	tokenId: string;
};

// !!! The MatchSharingCsgoMatch and RoundStats don't have all the data that's received !!!
export type MatchSharingCsgoMatch = {
	matchid: {
		low: number;
		high: number;
		unsigned: boolean;
	};
	matchtime: number;
	roundstatsall: RoundStats[];
};

export type RoundStats = {
	reservationid: number;
	reservation: {
		account_ids: number[];
	};
	kills: number[];
	assists: number[];
	deaths: number[];
	scores: number[];
	pings: number[];
	team_scores: number[];
	enemy_kills: number[];
	enemy_headshots: number[];
	mvps: number[];
	match_duration: number;
	map: string;
};

export enum LoginState {
	STEAM_NOT_READY = 'STEAM_NOT_READY',
	STEAM_CONNECTED = 'STEAM_CONNECTED',
	STEAM_LOGGED_IN = 'STEAM_LOGGED_IN',
	CSGO_READY = 'CSGO_READY',
	LOGIN_ERROR = 'LOGIN_ERROR',
}

export type Match = {
	score: number[];
	winner: string;
	map: string;
	date: number;
	duration: number;
	terroristTeam: Team;
	counterTerroristTeam: Team;
};

export type Team = {
	winner: boolean;
	score: number;
	side: string;
	players: Player[];
};

export type Player = {
	name: string;
	steamId64: string;
	steamId3: string;
	kills: number;
	deaths: number;
	assists: number;
	hsp: number;
	mvps: number;
	ping: number;
	side: string;
	score: number;
	unnecessaryStats: UnnecessaryStats;
};

export type PlayerIdentity = {
	name: string;
	steamId3: number;
	steamId64: string;
};

export type UnnecessaryStats = {
	jumps: number;
	fallDamage: number;
	weaponFire: WeaponFire[];
	weaponZooms: number;
	damageTaken: DamageTaken[];
	blind: Blind;
	itemPickup: ItemPickup[];
	reloads: number;
	footsteps: number;
	bombPlants: number;
};

export type WeaponFire = {
	weapon: string;
	count: number;
};

export type DamageTaken = {
	weapon: string;
	amount: number;
};

export type Blind = {
	times: number;
	duration: number;
};

export type ItemPickup = {
	item: string;
	count: number;
	silent: number;
};
