import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { fetchAPI, getUploadsBaseUrl } from "../../services/api";
import useLiveStreams from "../../hooks/useLiveStreams";
import "../../styles/Sidebar.css";
import "../../styles/LiveStream.css";

const SIDEBAR_WIDTH = 240;
const SIDEBAR_COLLAPSED_WIDTH = 56;

/* ── Placeholder data so the sidebar never looks empty ───────────────────── */

const PH_FOLLOWED = [
  { channel_id: "ph-f1", nickname: "relaxcis",  avatar_url: "https://api.dicebear.com/9.x/pixel-art/svg?seed=relaxcis",  category: "Valorant",        viewers: "18.4 тис." },
  { channel_id: "ph-f2", nickname: "s0mcs",     avatar_url: "https://api.dicebear.com/9.x/pixel-art/svg?seed=s0mcs",     category: "Valorant",        viewers: "14.1 тис." },
  { channel_id: "ph-f3", nickname: "Singollo",  avatar_url: "https://api.dicebear.com/9.x/pixel-art/svg?seed=Singollo",  category: "Arknights: End…", viewers: "12.6 тис." },
  { channel_id: "ph-f4", nickname: "TenZ",      avatar_url: "https://api.dicebear.com/9.x/pixel-art/svg?seed=TenZ",      category: "Valorant",        viewers: "19.3 тис." },
  { channel_id: "ph-f5", nickname: "rxnexus",   avatar_url: "https://api.dicebear.com/9.x/pixel-art/svg?seed=rxnexus",   category: "Valorant",        viewers: "6.2 тис."  },
  { channel_id: "ph-f6", nickname: "Horcus",    avatar_url: "https://api.dicebear.com/9.x/pixel-art/svg?seed=Horcus",    category: "Valorant",        viewers: "12.6 тис." },
  { channel_id: "ph-f7", nickname: "chopper",   avatar_url: "https://api.dicebear.com/9.x/pixel-art/svg?seed=chopper",   category: "Counter-Strike…", viewers: "32.8 тис." },
];

const PH_ACTIVE = [
  { user_id: "ph-a1", nickname: "relaxcis",   avatar_url: "https://api.dicebear.com/9.x/pixel-art/svg?seed=relaxcis",  viewers: "20.3 тис.", _placeholder: true },
  { user_id: "ph-a2", nickname: "RedDragon…", avatar_url: "https://api.dicebear.com/9.x/pixel-art/svg?seed=RedDragon", viewers: "12.7 тис.", _placeholder: true },
  { user_id: "ph-a3", nickname: "Abdod",       avatar_url: "https://api.dicebear.com/9.x/pixel-art/svg?seed=Abdod",     viewers: "15.9 тис.", _placeholder: true },
  { user_id: "ph-a4", nickname: "mistahfeet",  avatar_url: "https://api.dicebear.com/9.x/pixel-art/svg?seed=mistahfeet",viewers: "26.3 тис.", _placeholder: true },
];

const PH_CATEGORIES = [
  { tag_id: "ph-c1", name: "Valorant", video_count: "72.3 тис." },
  { tag_id: "ph-c2", name: "Zenless…", video_count: "56.1 тис." },
];

const CATEGORY_IMAGES = {
        "Dead by Daylight": "https://cdn.cloudflare.steamstatic.com/steam/apps/381210/header.jpg",
        "Arena Breakout: Infinite": "https://static-cdn.jtvnw.net/ttv-boxart/Arena%20Breakout%3A%20Infinite.jpg",
        "Hogwarts Legacy": "https://cdn.cloudflare.steamstatic.com/steam/apps/990080/header.jpg",
        "World of Warcraft": "https://static-cdn.jtvnw.net/ttv-boxart/World%20of%20Warcraft-140x190.jpg",
        "Overwatch 2": "https://static-cdn.jtvnw.net/ttv-boxart/Overwatch%202-140x190.jpg",
        Fortnite: "https://static-cdn.jtvnw.net/ttv-boxart/Fortnite-140x190.jpg",
        Valorant: "https://static-cdn.jtvnw.net/ttv-boxart/VALORANT-140x190.jpg",
};

function getCategoryImage(name) {
        if (!name) return null;
        if (CATEGORY_IMAGES[name]) return CATEGORY_IMAGES[name];
        const normalized = encodeURIComponent(name.trim());
        return `https://static-cdn.jtvnw.net/ttv-boxart/${normalized}-140x190.jpg`;
}

export default function Sidebar({ open, onToggle }) {
    const [followedChannels, setFollowedChannels] = useState([]);
    const [popularTags, setPopularTags] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tagsLoading, setTagsLoading] = useState(true);
    const [showAllFollowed, setShowAllFollowed] = useState(false);
    const [showAllActive, setShowAllActive] = useState(false);
    const { liveStreams } = useLiveStreams(true);

    // Build a Set of currently live user_ids for quick lookup
    const liveUserIds = new Set(liveStreams.map((s) => s.user_id));

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const data = await fetchAPI("/subscriptions/me", { method: "GET" });
                if (!cancelled && data?.subscriptions) {
                    setFollowedChannels(data.subscriptions);
                }
            } catch (err) {
                if (!cancelled) setFollowedChannels([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, []);

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

    /* Merge real followed channels with placeholders (real first) */
    const mergedFollowed = [
        ...followedChannels,
        ...PH_FOLLOWED.filter(
            (ph) => !followedChannels.some((r) => r.channel_id === ph.channel_id)
        ),
    ];
    const visibleFollowed = showAllFollowed ? mergedFollowed : mergedFollowed.slice(0, 7);

    /* Active channels: real live streams first, then placeholders */
    const mergedActive = [
        ...liveStreams,
        ...PH_ACTIVE.filter(
            (ph) => !liveStreams.some((r) => r.user_id === ph.user_id)
        ),
    ];
    const visibleActive = showAllActive ? mergedActive : mergedActive.slice(0, 5);

    /* Merge real tags with placeholder categories */
    const mergedCategories = [
        ...popularTags,
        ...PH_CATEGORIES.filter(
            (ph) => !popularTags.some((r) => r.tag_id === ph.tag_id || r.name === ph.name)
        ),
    ];

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
                    {/* ── Followed channels ──────────────────────────────────── */}
                    <section className="sidebar-section">
                        <h3 className="sidebar-section-title">Відстежувані канали</h3>
                        <ul className="sidebar-channel-list">
                            {visibleFollowed.map((ch) => {
                                const isReal = !!followedChannels.find((r) => r.channel_id === ch.channel_id);
                                const isLive = liveUserIds.has(ch.channel_id);
                                return (
                                    <li key={ch.channel_id}>
                                        {isReal ? (
                                            <Link
                                                to={`/profile/${ch.channel_id}`}
                                                className="sidebar-channel-item"
                                            >
                                                <span className="sidebar-channel-avatar">
                                                    {ch.avatar_url ? (
                                                        <img src={getUploadsBaseUrl() + ch.avatar_url} alt="" />
                                                    ) : (
                                                        <span>{ch.nickname?.charAt(0).toUpperCase() || "?"}</span>
                                                    )}
                                                </span>
                                                <span className="sidebar-channel-name">
                                                    {ch.nickname}
                                                    {ch.category && (
                                                        <span className="sidebar-channel-category">{ch.category}</span>
                                                    )}
                                                </span>
                                                {isLive ? (
                                                    <span className="sidebar-live-dot" title="У прямому ефірі" />
                                                ) : (
                                                    <span className="sidebar-channel-meta">
                                                        {ch.viewers || "• —"}
                                                    </span>
                                                )}
                                            </Link>
                                        ) : (
                                            <span className="sidebar-channel-item sidebar-channel-item--ph">
                                                <span className="sidebar-channel-avatar">
                                                    {ch.avatar_url
                                                        ? <img src={ch.avatar_url} alt="" />
                                                        : <span>{ch.nickname?.charAt(0).toUpperCase() || "?"}</span>}
                                                </span>
                                                <span className="sidebar-channel-name">
                                                    {ch.nickname}
                                                    {ch.category && (
                                                        <span className="sidebar-channel-category">{ch.category}</span>
                                                    )}
                                                </span>
                                                <span className="sidebar-channel-meta">{ch.viewers || ""}</span>
                                            </span>
                                        )}
                                    </li>
                                );
                            })}
                            {mergedFollowed.length > 7 && (
                                <li>
                                    <button
                                        type="button"
                                        className="sidebar-show-more"
                                        onClick={() => setShowAllFollowed((v) => !v)}
                                    >
                                        {showAllFollowed ? "Сховати" : "Показати ще"}
                                    </button>
                                </li>
                            )}
                        </ul>
                    </section>

                    {/* ── Active channels ────────────────────────────────────── */}
                    <section className="sidebar-section">
                        <h3 className="sidebar-section-title sidebar-live-section-title">
                            Активні канали
                            {(liveStreams.length > 0 || PH_ACTIVE.length > 0) && (
                                <span className="sidebar-live-dot" />
                            )}
                        </h3>
                        <ul className="sidebar-channel-list">
                            {visibleActive.map((s) => {
                                const isReal = !s._placeholder;
                                return (
                                    <li key={s.user_id}>
                                        {isReal ? (
                                            <Link
                                                to={`/stream/${s.user_id}`}
                                                className="sidebar-channel-item"
                                            >
                                                <span className="sidebar-channel-avatar">
                                                    {s.avatar_url ? (
                                                        <img src={getUploadsBaseUrl() + s.avatar_url} alt="" />
                                                    ) : (
                                                        <span>{s.nickname?.charAt(0).toUpperCase() || "?"}</span>
                                                    )}
                                                </span>
                                                <span className="sidebar-channel-name">{s.nickname}</span>
                                                <span className="sidebar-live-dot" title="LIVE" />
                                                <span className="sidebar-live-label">
                                                    {s.viewers || "LIVE"}
                                                </span>
                                            </Link>
                                        ) : (
                                            <span className="sidebar-channel-item sidebar-channel-item--ph">
                                                <span className="sidebar-channel-avatar">
                                                    {s.avatar_url
                                                        ? <img src={s.avatar_url} alt="" />
                                                        : <span>{s.nickname?.charAt(0).toUpperCase() || "?"}</span>}
                                                </span>
                                                <span className="sidebar-channel-name">{s.nickname}</span>
                                                <span className="sidebar-live-dot" title="LIVE" />
                                                <span className="sidebar-live-label">
                                                    {s.viewers || "LIVE"}
                                                </span>
                                            </span>
                                        )}
                                    </li>
                                );
                            })}
                            {mergedActive.length > 5 && (
                                <li>
                                    <button
                                        type="button"
                                        className="sidebar-show-more"
                                        onClick={() => setShowAllActive((v) => !v)}
                                    >
                                        {showAllActive ? "Сховати" : "Показати ще"}
                                    </button>
                                </li>
                            )}
                        </ul>
                    </section>

                    {/* ── Recommended categories ─────────────────────────────── */}
                    <section className="sidebar-section">
                        <h3 className="sidebar-section-title">Рекомендовані категорії</h3>
                        <ul className="sidebar-category-list">
                            {mergedCategories.map((tag) => (
                                <SidebarCategoryItem key={tag.tag_id} tag={tag} />
                            ))}
                        </ul>
                    </section>
                </div>
            )}
        </aside>
    );
}

function SidebarCategoryItem({ tag }) {
    const [imgError, setImgError] = useState(false);
    const imageUrl = getCategoryImage(tag.name);

    return (
        <li>
            <Link
                to={`/?q=${encodeURIComponent(tag.name)}`}
                className="sidebar-category-item"
            >
                <span className="sidebar-category-thumb">
                    {imageUrl && !imgError ? (
                        <img
                            src={imageUrl}
                            alt={tag.name}
                            className="sidebar-category-thumb-img"
                            onError={() => setImgError(true)}
                        />
                    ) : (
                        <span className="sidebar-category-letter">
                            {tag.name.charAt(0)}
                        </span>
                    )}
                </span>
                <span className="sidebar-category-name">{tag.name}</span>
                <span className="sidebar-category-viewers">
                    • {tag.video_count} {typeof tag.video_count === "number" ? "відео" : ""}
                </span>
            </Link>
        </li>
    );
}
