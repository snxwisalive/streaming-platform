import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { fetchAPI, getUploadsBaseUrl } from "../../services/api";
import useLiveStreams from "../../hooks/useLiveStreams";
import { useChat } from "../../context/chatContext";
import "../../styles/Sidebar.css";
import "../../styles/LiveStream.css";

const SIDEBAR_WIDTH = 240;
const SIDEBAR_COLLAPSED_WIDTH = 56;

export default function Sidebar({ open, onToggle }) {
    const [followedChannels, setFollowedChannels] = useState([]);
    const [popularTags, setPopularTags] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tagsLoading, setTagsLoading] = useState(true);
    const { socket } = useChat();
    const { liveStreams } = useLiveStreams(true);

    // Build a Set of currently live user_ids for quick lookup
    const liveUserIds = new Set(liveStreams.map((s) => s.user_id));

    const loadSubscriptions = React.useCallback(async () => {
        setLoading(true);
        try {
            const data = await fetchAPI("/subscriptions/me", { method: "GET" });
            if (data?.subscriptions) setFollowedChannels(data.subscriptions);
            else setFollowedChannels([]);
        } catch (err) {
            setFollowedChannels([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadSubscriptions();
    }, [loadSubscriptions]);

    // Real-time: update sidebar subscriptions when subscribe/unsubscribe happens.
    useEffect(() => {
        if (!socket) return;
        const handle = () => { loadSubscriptions(); };
        socket.on("subscriptions_changed", handle);
        return () => socket.off("subscriptions_changed", handle);
    }, [socket, loadSubscriptions]);

    useEffect(() => {
        if (!open) return;
        let cancelled = false;
        const load = async () => {
            try {
                const data = await fetchAPI("/videos/tags/popular?limit=10", { method: "GET" });
                if (!cancelled && data?.tags) {
                    setPopularTags(data.tags);
                }
            } catch (err) {
                if (!cancelled) setPopularTags([]);
            } finally {
                if (!cancelled) setTagsLoading(false);
            }
        };
        setTagsLoading(true);
        load();
        return () => { cancelled = true; };
    }, [open]);

    return (
        <aside
            className={`sidebar ${open ? "sidebar-open" : "sidebar-collapsed"}`}
            style={{
                width: open ? SIDEBAR_WIDTH : SIDEBAR_COLLAPSED_WIDTH,
            }}
        >
            <button
                type="button"
                className="sidebar-toggle"
                onClick={onToggle}
                aria-label={open ? "Згорнути" : "Розгорнути"}
            >
                <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ transform: open ? "rotate(0deg)" : "rotate(180deg)" }}
                >
                    <polyline points="15 18 9 12 15 6" />
                </svg>
            </button>

            {open && (
                <div className="sidebar-content">
                    <section className="sidebar-section">
                        <h3 className="sidebar-section-title">Відстежувані канали</h3>
                        {loading ? (
                            <p className="sidebar-placeholder">Завантаження...</p>
                        ) : followedChannels.length === 0 ? (
                            <p className="sidebar-placeholder">Немає каналів</p>
                        ) : (
                            <ul className="sidebar-channel-list">
                                {followedChannels.slice(0, 10).map((ch) => (
                                    <li key={ch.channel_id}>
                                        <Link
                                            to={`/profile/${ch.channel_id}`}
                                            className="sidebar-channel-item"
                                        >
                                            <span className="sidebar-channel-avatar">
                                                {ch.avatar_url ? (
                                                    <img
                                                        src={getUploadsBaseUrl() + ch.avatar_url}
                                                        alt=""
                                                    />
                                                ) : (
                                                    <span>?</span>
                                                )}
                                            </span>
                                            <span className="sidebar-channel-name">{ch.nickname}</span>
                                            {liveUserIds.has(ch.channel_id) ? (
                                                <span className="sidebar-live-dot" title="У прямому ефірі" />
                                            ) : (
                                                <span className="sidebar-channel-meta">• —</span>
                                            )}
                                        </Link>
                                    </li>
                                ))}
                                {followedChannels.length > 10 && (
                                    <li>
                                        <button type="button" className="sidebar-show-more">
                                            Показати ще
                                        </button>
                                    </li>
                                )}
                            </ul>
                        )}
                    </section>

                    <section className="sidebar-section">
                        <h3 className="sidebar-section-title sidebar-live-section-title">
                            Активні канали
                            {liveStreams.length > 0 && <span className="sidebar-live-dot" />}
                        </h3>
                        {liveStreams.length === 0 ? (
                            <p className="sidebar-placeholder">Поки що немає стримів</p>
                        ) : (
                            <ul className="sidebar-channel-list">
                                {liveStreams.map((s) => (
                                    <li key={s.user_id}>
                                        <Link
                                            to={`/profile/${s.user_id}`}
                                            className="sidebar-channel-item"
                                        >
                                            <span className="sidebar-channel-avatar">
                                                {s.avatar_url ? (
                                                    <img
                                                        src={getUploadsBaseUrl() + s.avatar_url}
                                                        alt=""
                                                    />
                                                ) : (
                                                    <span>?</span>
                                                )}
                                            </span>
                                            <span className="sidebar-channel-name">{s.nickname}</span>
                                            <span className="sidebar-live-dot" title="LIVE" />
                                            <span className="sidebar-live-label">LIVE</span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    <section className="sidebar-section">
                        <h3 className="sidebar-section-title">Популярні теги</h3>
                        {tagsLoading ? (
                            <p className="sidebar-placeholder">Завантаження...</p>
                        ) : popularTags.length === 0 ? (
                            <p className="sidebar-placeholder">Немає тегів</p>
                        ) : (
                            <ul className="sidebar-category-list">
                                {popularTags.map((tag) => (
                                    <li key={tag.tag_id}>
                                        <Link
                                            to={`/?q=${encodeURIComponent(tag.name)}`}
                                            className="sidebar-category-item"
                                        >
                                            <span className="sidebar-category-thumb" />
                                            <span className="sidebar-category-name">{tag.name}</span>
                                            <span className="sidebar-category-viewers">
                                                • {tag.video_count} відео
                                            </span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                </div>
            )}
        </aside>
    );
}
