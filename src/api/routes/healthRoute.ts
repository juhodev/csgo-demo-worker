import expressPromiseRouter from 'express-promise-router';

const router = expressPromiseRouter();

router.get('/', (req, res) => {
	res.sendStatus(200);
});

export default router;
