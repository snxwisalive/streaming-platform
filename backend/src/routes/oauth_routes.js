import express from 'express';
import passport from '../config/passport.js';
import { generateToken } from '../utils/auth.utils.js';

const router = express.Router();

function handleOAuthCallback(req, res) {
    const result = req.user;

    if (result.isNew) {
        const data = encodeURIComponent(JSON.stringify(result.googleProfile));
        return res.redirect(`${process.env.FRONTEND_URL}/auth/complete-profile?data=${data}`);
    }

    const { user } = result;
    const token = generateToken({
        user_id: user.user_id,
        nickname: user.nickname,
        email: user.email,
    });

    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify({
        user_id: user.user_id,
        nickname: user.nickname,
        email: user.email,
    }))}`);
}

router.get('/google', passport.authenticate('google', {
    scope: ['openid', 'email', 'profile'],
    session: false,
}));

router.get('/google/callback',
    passport.authenticate('google', {
        session: false,
        failureRedirect: `${process.env.FRONTEND_URL}/login?error=google_failed`,
    }),
    handleOAuthCallback
);

router.get('/discord', passport.authenticate('discord', { session: false }));

router.get('/discord/callback',
    passport.authenticate('discord', {
        session: false,
        failureRedirect: `${process.env.FRONTEND_URL}/login?error=discord_failed`,
    }),
    handleOAuthCallback
);

export default router;