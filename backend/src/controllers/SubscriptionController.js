import {
    subscribe,
    unsubscribe,
    isSubscribed,
    getUserSubscriptions,
    getSubscribedVideos
} from '../db/subscription.repository.js';
import { getUserById } from '../db/user.repository.js';
import { getIo } from "../socket.js";

export const subscribeToUser = async (req, res) => {
    try {
        const subscriberId = req.user.user_id;
        const { channelId } = req.body;

        if (!channelId) {
            return res.status(400).json({ message: 'channelId is required' });
        }

        if (subscriberId === parseInt(channelId)) {
            return res.status(400).json({ message: 'You cannot subscribe to yourself' });
        }

        const channel = await getUserById(channelId);
        if (!channel) {
            return res.status(404).json({ message: 'User not found' });
        }

        const subscription = await subscribe(subscriberId, channelId);

        getIo()?.emit("subscriptions_changed", { channelId, subscriberId });

        res.status(200).json({
            message: 'Subscribed successfully',
            subscribed: true,
            subscription
        });
    } catch (error) {
        console.error('Subscribe error:', error);
        res.status(500).json({ message: 'Failed to subscribe', error: error.message });
    }
};

export const unsubscribeFromUser = async (req, res) => {
    try {
        const subscriberId = req.user.user_id;
        const { channelId } = req.body;

        if (!channelId) {
            return res.status(400).json({ message: 'channelId is required' });
        }

        const removed = await unsubscribe(subscriberId, channelId);

        getIo()?.emit("subscriptions_changed", { channelId, subscriberId });

        res.status(200).json({
            message: 'Unsubscribed successfully',
            subscribed: false,
            removed: !!removed
        });
    } catch (error) {
        console.error('Unsubscribe error:', error);
        res.status(500).json({ message: 'Failed to unsubscribe', error: error.message });
    }
};

export const getSubscriptionStatus = async (req, res) => {
    try {
        const subscriberId = req.user.user_id;
        const { channelId } = req.query;

        if (!channelId) {
            return res.status(400).json({ message: 'channelId is required' });
        }

        const subscribed = await isSubscribed(subscriberId, channelId);

        res.json({ subscribed });
    } catch (error) {
        console.error('Get subscription status error:', error);
        res.status(500).json({ message: 'Failed to get subscription status', error: error.message });
    }
};

export const getMySubscriptions = async (req, res) => {
    try {
        const subscriberId = req.user.user_id;

        const subscriptions = await getUserSubscriptions(subscriberId);

        res.json({ subscriptions });
    } catch (error) {
        console.error('Get my subscriptions error:', error);
        res.status(500).json({ message: 'Failed to get subscriptions', error: error.message });
    }
};

export const getSubscribedFeed = async (req, res) => {
    try {
        const subscriberId = req.user.user_id;
        const { limit = 20, offset = 0 } = req.query;

        const videos = await getSubscribedVideos(subscriberId, parseInt(limit), parseInt(offset));

        res.json({
            videos,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
    } catch (error) {
        console.error('Get subscribed feed error:', error);
        res.status(500).json({ message: 'Failed to get subscribed videos', error: error.message });
    }
};