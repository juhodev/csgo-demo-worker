import expressPromiseRouter from 'express-promise-router';
import { getProcessingMetrics } from '../../metrics/metrics';
import { ProcessingMetrics } from '../../metrics/types';

const router = expressPromiseRouter();

router.get('/', async (req, res) => {
	const processingMetrics: ProcessingMetrics = await getProcessingMetrics();
	res.json({ error: false, data: { processingMetrics: processingMetrics } });
});

export default router;
