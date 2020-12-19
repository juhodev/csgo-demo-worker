/**
 * This changes the maps file name to its display name. This needs to be done
 * because I was saving the maps with the display names earlier.
 *
 * @param map Map name you want to switch to the map's display name
 */
export function changeMapName(map: string): string {
	switch (map) {
		case 'de_inferno':
			return 'Inferno';

		case 'de_train':
			return 'Train';

		case 'de_mirage':
			return 'Mirage';

		case 'de_nuke':
			return 'Nuke';

		case 'de_overpass':
			return 'Overpass';

		case 'de_dust2':
			return 'Dust II';

		case 'de_vertigo':
			return 'Vertigo';

		case 'de_cache':
			return 'Cache';

		case 'de_cobblestone':
			return 'Cobblestone';

		case 'de_canals':
			return 'Canals';

		case 'de_zoo':
			return 'Zoo';

		case 'de_abbey':
			return 'Abbey';

		case 'de_biome':
			return 'Biome';

		case 'cs_militia':
			return 'Militia';

		case 'cs_agency':
			return 'Agency';

		case 'cs_office':
			return 'Office';

		case 'cs_italy':
			return 'Italy';

		case 'cs_assault':
			return 'Assault';

		case 'de_ancient':
			return 'Ancient';

		case 'de_anubis':
			return 'Anubis';
	}
}
