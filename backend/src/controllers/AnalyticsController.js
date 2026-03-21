import { pool } from "../db/db.js";

/**
 * GET /analytics/overview?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Returns channel analytics for the authenticated user.
 * Defaults to the last 30 days if no range is provided.
 */
export const getAnalyticsOverview = async (req, res) => {
    try {
        const userId = req.user.user_id;

        const now      = new Date();
        const toDate   = req.query.to   ? new Date(req.query.to)   : now;
        const fromDate = req.query.from ? new Date(req.query.from) : new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);

        // Clamp: max 1 year range
        const msRange     = toDate - fromDate;
        const clampedFrom = msRange > 365 * 24 * 60 * 60 * 1000
            ? new Date(toDate.getTime() - 365 * 24 * 60 * 60 * 1000)
            : fromDate;

        // Pass dates as ISO strings — pg will cast them correctly
        const fromStr = clampedFrom.toISOString().slice(0, 10);
        const toStr   = toDate.toISOString().slice(0, 10);

        const { rows } = await pool.query(
            `SELECT
                -- total subscribers (all time)
                (
                    SELECT COUNT(*)::int
                    FROM subscriptions
                    WHERE channel_id = $1
                ) AS subscriber_count,

                -- new subscribers per day within the selected range
                (
                    SELECT COALESCE(json_agg(day_data ORDER BY day_data->>'raw_date'), '[]'::json)
                    FROM (
                        SELECT json_build_object(
                            'date',     TO_CHAR(DATE_TRUNC('day', created_at AT TIME ZONE 'UTC'), 'DD Mon'),
                            'raw_date', TO_CHAR(DATE_TRUNC('day', created_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD'),
                            'count',    COUNT(*)::int
                        ) AS day_data
                        FROM subscriptions
                        WHERE channel_id = $1
                          AND created_at >= $2::date
                          AND created_at <  $3::date + INTERVAL '1 day'
                        GROUP BY DATE_TRUNC('day', created_at AT TIME ZONE 'UTC')
                    ) sub
                ) AS subscriber_history,

                -- new subscribers in range total
                (
                    SELECT COUNT(*)::int
                    FROM subscriptions
                    WHERE channel_id = $1
                      AND created_at >= $2::date
                      AND created_at <  $3::date + INTERVAL '1 day'
                ) AS new_subscribers_in_range,

                -- total videos
                (
                    SELECT COUNT(*)::int
                    FROM videos
                    WHERE user_id = $1
                ) AS video_count`,
            [userId, fromStr, toStr]
        );

        const data = rows[0];

        res.json({
            subscriber_count:         data.subscriber_count         ?? 0,
            subscriber_history:       data.subscriber_history       ?? [],
            new_subscribers_in_range: data.new_subscribers_in_range ?? 0,
            video_count:              data.video_count              ?? 0,
            range: {
                from: fromStr,
                to:   toStr,
            },
        });
    } catch (error) {
        console.error("getAnalyticsOverview error:", error);
        res.status(500).json({ message: "Failed to get analytics", error: error.message });
    }
};