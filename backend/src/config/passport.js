import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as DiscordStrategy } from 'passport-discord';
import { pool } from '../db/db.js';

async function handleOAuthLogin(provider, providerId, email, avatar, displayName, accessToken, refreshToken, done) {
    try {
        const { rows: existing } = await pool.query(
            `SELECT oa.*, u.* 
             FROM oauth_accounts oa
             JOIN users u ON u.user_id = oa.user_id
             WHERE oa.provider = $1 AND oa.provider_user_id = $2`,
            [provider, providerId]
        );

        if (existing.length > 0) {
            return done(null, { user: existing[0], isNew: false });
        }

        const { rows: byEmail } = email ? await pool.query(
            `SELECT * FROM users WHERE email = $1`, [email]
        ) : { rows: [] };

        if (byEmail.length > 0) {
            const user = byEmail[0];
            await pool.query(
                `INSERT INTO oauth_accounts (user_id, provider, provider_user_id, access_token, refresh_token)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (provider, provider_user_id) DO NOTHING`,
                [user.user_id, provider, providerId, accessToken, refreshToken || null]
            );
            return done(null, { user, isNew: false });
        }

        const nickname = await generateUniqueNickname(displayName || (email ? email.split('@')[0] : 'user'));

        const { rows: newUser } = await pool.query(
            `INSERT INTO users (email, nickname, avatar_url, is_active, created_at, updated_at)
             VALUES ($1, $2, $3, true, NOW(), NOW())
             RETURNING *`,
            [email || null, nickname, avatar || null]
        );
        const user = newUser[0];

        await pool.query(
            `INSERT INTO oauth_accounts (user_id, provider, provider_user_id, access_token, refresh_token)
             VALUES ($1, $2, $3, $4, $5)`,
            [user.user_id, provider, providerId, accessToken, refreshToken || null]
        );

        return done(null, { user, isNew: false });

    } catch (err) {
        return done(err, null);
    }
}

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
}, async (accessToken, refreshToken, profile, done) => {
    const email = profile.emails?.[0]?.value;
    const avatar = profile.photos?.[0]?.value;
    return handleOAuthLogin('google', profile.id, email, avatar, profile.displayName, accessToken, refreshToken, done);
}));

passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: process.env.DISCORD_CALLBACK_URL,
    scope: ['identify', 'email'],
}, async (accessToken, refreshToken, profile, done) => {
    const email = profile.email || null;
    const avatar = profile.avatar
        ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
        : null;
    return handleOAuthLogin('discord', profile.id, email, avatar, profile.username, accessToken, refreshToken, done);
}));

async function generateUniqueNickname(base) {
    const clean = base.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 40) || 'user';
    let nickname = clean;
    let attempts = 0;
    while (attempts < 10) {
        const { rows } = await pool.query(
            `SELECT 1 FROM users WHERE nickname = $1`, [nickname]
        );
        if (rows.length === 0) return nickname;
        nickname = `${clean}${Math.floor(Math.random() * 9000) + 1000}`;
        attempts++;
    }
    return `${clean}${Date.now()}`;
}

export { generateUniqueNickname };
export default passport;