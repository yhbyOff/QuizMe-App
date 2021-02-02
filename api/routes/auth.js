const server = require('express').Router();
const User = require('../models/User');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const { SECRET, FRONT } = process.env;

server.get('/me', async (req, res, next) => {
	try {
		const { _id } = req.user;
		const result = await User.findById(
			_id,
			'_id firstName lastName email countryCode profilePic role updatedAt'
		);
		if (req.user.updatedAt === result.updatedAt.toISOString()) {
			return res.json(result);
		} else {
			const {
				_id,
				firstName,
				lastName,
				email: userEmail,
				profilePic,
				countryCode,
				role,
				updatedAt,
				premium,
			} = result;
			result.jwt = jwt.sign(
				{
					_id,
					firstName,
					lastName,
					email: userEmail,
					profilePic,
					countryCode,
					role,
					updatedAt,
					premium,
				},
				SECRET
			);
			return res.json(result);
		}
	} catch (error) {
		next(error);
	}
});

server.post('/register', async function (req, res, next) {
	try {
		await User.findOrCreate(
			{
				$or: [
					{ accountId: req.body.accountId || 'false' },
					{ email: req.body.email },
				],
			},
			req.body,
			(err, user, created) => {
				if (err) throw new Error(err);
				if (!created)
					return res
						.status(400)
						.json({ message: 'Username already exist' });

				const newUser = {
					_id: user.id,
					firstName: user.firstName,
					email: user.email,
					profilePic: user.profilePic,
					countryCode: user.countryCode,
					role: user.role,
					updatedAt: user.updatedAt,
					premium: user.premium,
				};
				newUser.jwt = jwt.sign({ ...newUser }, SECRET);
				return res.json(newUser);
			}
		);
	} catch (error) {
		if (error.message === 'Input valid password')
			return res
				.status(400)
				.json({ message: 'Invalid password' + error });
		if (error.message.includes('unique'))
			return res
				.status(400)
				.json({ message: 'email must be unique' + error });
		return res
			.status(500)
			.json({ message: 'Internal Server Error' + error });
	}
});

server.post('/login', function (req, res, next) {
	passport.authenticate('local', function (err, user) {
		if (err) return next(err);
		else if (!user) return res.sendStatus(401);
		else {
			let loginUser = { ...user };
			loginUser.jwt = jwt.sign(user, SECRET);
			return res.json(loginUser);
		}
	})(req, res, next);
});

server.get(
	'/google',
	passport.authenticate('google', {
		scope: ['profile', 'email'],
	})
);

server.get(
	'/googleCallback',
	passport.authenticate('google'),
	function (req, res) {
		const {
			_id,
			firstName,
			lastName,
			email: userEmail,
			profilePic,
			countryCode,
			role,
			updatedAt,
			premium,
		} = req.user;
		const token = jwt.sign(
			{
				_id,
				firstName,
				lastName,
				email: userEmail,
				profilePic,
				countryCode,
				role,
				updatedAt,
				premium,
			},
			SECRET
		);
		res.redirect(`${FRONT}/?jwt=${token}`);
	}
);

server.get(
	'/facebook',
	passport.authenticate('facebook', {
		scope: ['email', 'user_photos'],
	})
);

server.get(
	'/facebookCallback',
	passport.authenticate('facebook'),
	function (req, res) {
		const {
			_id,
			firstName,
			lastName,
			email: userEmail,
			profilePic,
			countryCode,
			role,
			updatedAt,
			premium,
		} = req.user.dataValues;
		const token = jwt.sign(
			{
				_id,
				firstName,
				lastName,
				email: userEmail,
				profilePic,
				countryCode,
				role,
				updatedAt,
				premium,
			},
			SECRET
		);
		res.redirect(`${FRONT}/?jwt=${token}`);
	}
);

module.exports = server;
