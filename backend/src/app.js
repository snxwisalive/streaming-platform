import express from 'express';
import cors from 'cors';
import path from 'path';
import authRoutes from './routes/auth_routes.js';
import userRoutes from './routes/user_routes.js';
import videoRoutes from './routes/video_routes.js';
import subscriptionRoutes from './routes/subscription_routes.js';
import chatRoutes from "./routes/chat_routes.js";
import streamRoutes from "./routes/stream_routes.js";
import analyticsRoutes from './routes/analytics_routes.js';
import passport from './config/passport.js';
import oauthRoutes from './routes/oauth_routes.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use(passport.initialize());

app.use('/uploads', express.static(path.resolve('uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/streams", streamRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/auth', oauthRoutes);

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});

export default app;