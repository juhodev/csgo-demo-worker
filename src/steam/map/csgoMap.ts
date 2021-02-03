import { HeatmapPosition, Position, RadarData } from './types';
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

	save(map: string): HeatmapPosition[] {
		const radarData: RadarData = this.loadRadarData(map);
		const radarCoordinates: Position[] = this.pointsToHighlight.map((pos) =>
			this.convertToRadarCoordinate(pos, radarData),
		);
		return this.createHeatmap(radarCoordinates);
	}

	private createHeatmap(positions: Position[]): HeatmapPosition[] {
		const squares: HeatmapPosition[] = [];

		// This is just a magic number that makes to heatmap look decent. When coordinates are divided (and floored) by this in the initial heatmap data
		// and then multiplied it'll stack coordinates to same positions, creating a heatmap
		const divideBy: number = 7;

		for (const pos of positions) {
			const { x, y } = pos;

			const newX: number = Math.floor(x / divideBy);
			const newY: number = Math.floor(y / divideBy);

			const old: HeatmapPosition = squares.find((heatmapPos) => heatmapPos.x === newX && heatmapPos.y === newY);
			if (old !== undefined) {
				old.value++;
				continue;
			}

			squares.push({ x: newX, y: newY, value: 1 });
		}

		return squares.map((square) => {
			return { x: square.x * divideBy, y: square.y * divideBy, value: square.value };
		});
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
