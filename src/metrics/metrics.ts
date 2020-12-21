import { ProcessingMetrics } from './types';
import { ProcessTime } from './db';

async function getProcessingMetrics(): Promise<ProcessingMetrics> {
	const times: ProcessTime[] = await ProcessTime.findAll();

	let total: number = 0;
	let longest: number = -1;

	for (const time of times) {
		total += time.processingTime;

		if (longest < time.processingTime) {
			longest = time.processingTime;
		}
	}

	const metrics: ProcessingMetrics = {
		all: times.map((time) => time.processingTime),
		average: total / times.length,
		longest,
	};

	return metrics;
}

export { getProcessingMetrics };
