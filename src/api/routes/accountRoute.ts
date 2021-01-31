import expressPromiseRouter from 'express-promise-router';
import { downloader } from '../..';
import { LoginDetails } from '../../steam/types';

const router = expressPromiseRouter();

router.post('/login', async (req, res) => {
	const { username, password, authCode } = req.body;

	// TODO: I might want to check whether steam is logged in or not
	// When calling this the first time steam is going to send a code to the email
	// associated with the account and then you need to re-login with the auth
	// code that's in the email.
	// Because of how I've done this I currently need to restart the server in order
	// to re-login and obviously that's really bad design.
	if (downloader.isInitialized()) {
		res.status(400).json({
			error: true,
			data: { message: 'Already initialized' },
		});
		return;
	}

	const loginDetails: LoginDetails = {
		account_name: username,
		password,
	};

	if (authCode !== undefined) {
		loginDetails.auth_code = authCode;
	}

	downloader.init(loginDetails);
	res.json({ error: false, data: { message: 'Trying to log in to Steam!' } });
});

export default router;