import { Position, RadarData } from './types';
import * as fs from 'fs';
import * as path from 'path';

class CsgoMap {
	private pointsToHighlight: Position[];

	constructor() {
		this.pointsToHighlight = [];
	}

	addPoint(pos: Position) {
		this.pointsToHighlight.push(pos);
	}

	save(map: string): Position[] {
		const radarData: RadarData = this.loadRadarData(map);
		return this.pointsToHighlight.map((pos) => this.convertToRadarCoordinate(pos, radarData));
	}

	private convertToRadarCoordinate(pos: Position, radarData: RadarData): Position {
		return {
			x: Math.round((pos.x - radarData.originX) / radarData.scale),
			y: Math.round((pos.y - radarData.originY) / -radarData.scale),
		};
	}

	private loadRadarData(map: string): RadarData {
		const tbsFile: string = path.resolve('radar', `${map}.txt`);
		const values: Map<string, string> = this.loadTBS(tbsFile);

		const posX: number = parseInt(values.get('pos_x'));
		const posY: number = parseInt(values.get('pos_y'));
		const scale: number = parseFloat(values.get('scale'));

		return {
			scale,
			originX: posX,
			originY: posY,
		};
	}

	private loadTBS(file: string): Map<string, string> {
		const map: Map<string, string> = new Map();

		const str: string = fs.readFileSync(file, 'utf-8');
		const lines: string[] = str.split('\n');
		debugger;
		for (const line of lines) {
			if (!line.includes('\t')) {
				continue;
			}

			let key: string = '';
			let value: string = '';

			const tabs: string[] = line.split('\t');
			for (const tab of tabs) {
				if (tab.length > 1) {
					if (key === '') {
						key = tab.trim();
					} else {
						value = tab.trim();
						break;
					}
				}
			}

			key = key.substr(1, key.length - 2);
			value = value.substr(1, value.length - 2);

			map.set(key, value);
		}

		return map;
	}
}

export default CsgoMap;
