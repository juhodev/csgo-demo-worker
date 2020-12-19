import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as morgan from 'morgan';
import * as fs from 'fs';
import * as path from 'path';

import AccountRouter from './routes/accountRoute';
import DemoRouter from './routes/demoRoute';
import HealthRouter from './routes/healthRoute';

function startApi() {
	const app = express();
	app.use(bodyParser.json());

	setupMorgan(app);

	app.use('/account', AccountRouter);
	app.use('/demo', DemoRouter);
	app.use('/health', HealthRouter);

	app.listen(process.env.HTTP_PORT, () => {
		console.log(`API listening on port ${process.env.HTTP_PORT}`);
	});
}

/**
 * Setups up morgan for logging.
 *
 * This will log the full request data into `data/access.log` and will print
 * a smaller log to stdout.
 *
 * @param app Express app
 */
function setupMorgan(app: any) {
	const accessLogPath: string = path.resolve('data', 'access.log');
	const accessLogStream = fs.createWriteStream(accessLogPath, { flags: 'a' });
	app.use(morgan('combined', { stream: accessLogStream }));
	app.use(morgan('dev'));
}

export default startApi;
