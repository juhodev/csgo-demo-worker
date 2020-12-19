import expressPromiseRouter from 'express-promise-router';
import { downloader } from '../..';

const router = expressPromiseRouter();

router.post('/:sharingCode', (req, res) => {
	const { sharingCode } = req.params;

	if (sharingCode === undefined) {
		res.status(400).json({
			error: true,
			data: { message: 'Please add a sharing code' },
		});
		return;
	}

	downloader.add(sharingCode);
	res.json({ error: false, data: { message: 'Sharing code added' } });
});

export default router;