import React, { useEffect, useState } from "react";
import { fetchAPI, getUploadsBaseUrl } from "../services/api";
import { useNavigate, useParams } from "react-router-dom";
import { authService } from "../services/authService";
import { useChat } from "../context/chatContext";
import VideoCard from "../features/components/VideoCard";
import VideoModal from "../features/components/VideoModal";
import VideoEditModal from "../features/components/VideoEditModal";
import LiveStreamPlayer from "../features/components/LiveStreamPlayer";
import "../styles/ProfilePage.css";

const BIO_TRUNCATE_LENGTH = 150;
const TABS = [
    { id: "home",    label: "Головна" },
    { id: "about",   label: "Опис" },
    { id: "video",   label: "Відео" },
    { id: "streams", label: "Стріми" },
    { id: "clips",   label: "Кліпи" },
];

function useWindowWidth() {
    const [width, setWidth] = useState(
        typeof window !== "undefined" ? window.innerWidth : 1024
    );
    useEffect(() => {
        if (typeof window === "undefined") return;
        const handle = () => setWidth(window.innerWidth);
        window.addEventListener("resize", handle);
        return () => window.removeEventListener("resize", handle);
    }, []);
    return width;
}

const fmtNum = (n) => {
    if (n == null) return "0";
    const v = Number(n);
    if (v >= 1_000_000) return (v / 1_000_000).toFixed(1).replace(".0", "") + " млн";
    if (v >= 1_000)     return (v / 1_000).toFixed(1).replace(".0", "") + " тис.";
    return String(v);
};

const CheckIcon = () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
         style={{ display: "inline", verticalAlign: "middle", flexShrink: 0 }}>
        <circle cx="7" cy="7" r="7" fill="#7c3aed"/>
        <path d="M4 7.2l2 2 4-4" stroke="#fff" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

/* ── Mobile video row component ──────────────────────────────────────────── */
const MobileVideoRow = ({ video, avatarSrc, nickname, isOwner, onClick, onEdit }) => {
    const thumb = video.thumbnail_url || null;
    return (
        <div className="m-video-row" onClick={() => onClick(video.video_id)}>
            <div className="m-video-thumb">
                {thumb
                    ? <img src={thumb} alt="" />
                    : <div className="m-video-thumb-placeholder" />
                }
                {video.views != null && (
                    <span className="m-video-viewers">+{fmtNum(video.views)} тис.</span>
                )}
            </div>
            <div className="m-video-info">
                <p className="m-video-title">{video.title || "Без назви"}</p>
                <div className="m-video-meta">
                    {avatarSrc
                        ? <img src={avatarSrc} alt="" className="m-video-avatar" />
                        : <div className="m-video-avatar" style={{ background: "#d0c8f0" }} />
                    }
                    <span className="m-video-channel">{nickname}</span>
                </div>
                {video.tags?.length > 0 && (
                    <div className="m-video-tags">
                        {video.tags.slice(0, 3).map((t, i) => (
                            <span key={i} className="m-video-tag">
                                {typeof t === "object" ? t.name : t}
                            </span>
                        ))}
                    </div>
                )}
            </div>
            {isOwner && (
                <button
                    className="m-video-more"
                    onClick={(e) => { e.stopPropagation(); onEdit(video); }}
                    aria-label="Більше"
                >⋮</button>
            )}
        </div>
    );
};

/* ════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════════════════════════ */
const ProfilePage = () => {
    const { userId }       = useParams();
    const navigate         = useNavigate();
    const { startNewChat } = useChat();
    const width            = useWindowWidth();
    const isMobile         = width < 768;

    const [currentUser] = useState(() => authService.getCurrentUser());
    const isOwnProfile  = !userId ||
        (currentUser && String(currentUser.user_id) === String(userId));

    const [videos,          setVideos         ] = useState([]);
    const [userInfo,        setUserInfo        ] = useState(null);
    const [selectedVideoId, setSelectedVideoId ] = useState(null);
    const [editingVideo,    setEditingVideo    ] = useState(null);
    const [loading,         setLoading         ] = useState(true);
    const [accountNotFound, setAccountNotFound ] = useState(false);
    const [activeTab,       setActiveTab       ] = useState("home");
    const [isSubscribed,    setIsSubscribed    ] = useState(false);
    const [subscribing,     setSubscribing     ] = useState(false);
    const [bioExpanded,     setBioExpanded     ] = useState(false);
    const [streamStatus,    setStreamStatus    ] = useState({ live: false, stream_key: null });
    const [menuOpen,        setMenuOpen        ] = useState(false);

    /* ── data load ── */
    useEffect(() => {
        if (!currentUser) { navigate("/login"); return; }
        const loadData = async () => {
            try {
                setLoading(true);
                setAccountNotFound(false);
                if (isOwnProfile) {
                    const [videosRes, meRes] = await Promise.all([
                        fetchAPI("/videos/me", { method: "GET" }),
                        fetchAPI("/users/me",  { method: "GET" }),
                    ]);
                    if (Array.isArray(videosRes))  setVideos(videosRes);
                    else if (videosRes?.videos)    setVideos(videosRes.videos);
                    else                           setVideos([]);
                    if (meRes) {
                        setUserInfo(meRes);
                    } else {
                        setAccountNotFound(true);
                        setUserInfo(null);
                        setVideos([]);
                        return;
                    }
                } else {
                    const userData = await fetchAPI(`/users/${userId}`,       { method: "GET" });
                    const data     = await fetchAPI(`/videos/user/${userId}`, { method: "GET" });
                    if (Array.isArray(data))             setVideos(data);
                    else if (Array.isArray(data.videos)) setVideos(data.videos);
                    else                                 setVideos([]);
                    setUserInfo(userData);
                    if (currentUser) {
                        try {
                            const status = await fetchAPI(
                                `/subscriptions/status?channelId=${userId}`, { method: "GET" }
                            );
                            setIsSubscribed(status.subscribed || false);
                        } catch { setIsSubscribed(false); }
                    }
                }
            } catch (err) {
                console.error("Failed to fetch data", err);
                const msg = String(err?.message || err);
                if (msg.includes("User not found")) {
                    setAccountNotFound(true);
                    setUserInfo(null);
                }
                setVideos([]);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [userId, isOwnProfile, currentUser, navigate]);

    /* ── stream poll ── */
    useEffect(() => {
        const profileId = isOwnProfile ? currentUser?.user_id : userId;
        if (!profileId) return;
        let cancelled = false;
        const check = async () => {
            try {
                const data = await fetchAPI(`/streams/status/${profileId}`, { method: "GET" });
                if (!cancelled) setStreamStatus(data);
            } catch {
                if (!cancelled) setStreamStatus({ live: false, stream_key: null });
            }
        };
        check();
        const id = setInterval(check, 15_000);
        return () => { cancelled = true; clearInterval(id); };
    }, [userId, isOwnProfile, currentUser]);

    /* ── handlers ── */
    const handleToggleSubscribe = async () => {
        if (!currentUser) { navigate("/login"); return; }
        setSubscribing(true);
        try {
            if (isSubscribed) {
                await fetchAPI("/subscriptions/unsubscribe", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ channelId: userId }),
                });
                setIsSubscribed(false);
            } else {
                await fetchAPI("/subscriptions/subscribe", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ channelId: userId }),
                });
                setIsSubscribed(true);
            }
        } catch (err) {
            console.error("Failed to update subscription", err);
        } finally {
            setSubscribing(false);
        }
    };

    const handleStartChat = async () => {
        if (!currentUser) { navigate("/login"); return; }
        if (!userId) return;
        const targetId = Number(userId);
        if (isNaN(targetId)) return;
        try {
            await startNewChat(targetId);
        } catch (err) {
            console.error("Failed to start chat", err);
            alert("Не вдалося почати чат");
        }
    };

    const handleVideoDelete = (video_id) => {
        setVideos((prev) => prev.filter((v) => v.video_id !== video_id));
        if (selectedVideoId === video_id) setSelectedVideoId(null);
    };

    /* ── derived ── */
    const bio         = userInfo?.bio || "";
    const showExpand  = bio.length > BIO_TRUNCATE_LENGTH;
    const bioDisplay  = showExpand && !bioExpanded ? bio.slice(0, BIO_TRUNCATE_LENGTH) + "…" : bio;
    const avatarSrc   = userInfo?.avatar_url ? getUploadsBaseUrl() + userInfo.avatar_url : null;
    const bannerSrc   = userInfo?.banner_url ? getUploadsBaseUrl() + userInfo.banner_url : null;
    const displayName = isOwnProfile
        ? (currentUser?.nickname || "Мій профіль")
        : (userInfo?.nickname || "Профіль");
    const subCount    = userInfo?.subscriber_count != null
        ? Number(userInfo.subscriber_count).toLocaleString("uk-UA") : "0";

    if (loading) return <p className="profile-loading">Завантаження...</p>;

    if (accountNotFound) {
        if (isMobile) {
            return (
                <div className="m-profile-page">
                    <div className="m-content">
                        <p className="m-empty">Акаунт не знайдено</p>
                    </div>
                </div>
            );
        }
        return (
            <div className="profile-page">
                <div className="profile-content">
                    <p className="profile-videos-empty">Акаунт не знайдено</p>
                </div>
            </div>
        );
    }

    /* ══════════════════════════════════════════════════════════════════════
       MOBILE LAYOUT  (< 768px)
    ══════════════════════════════════════════════════════════════════════ */
    if (isMobile) {
        return (
            <div className="m-profile-page">

                {/* Banner — rounded bottom corners */}
                <div className="m-banner-wrap">
                    <div
                        className="m-banner-bg"
                        style={bannerSrc ? { backgroundImage: `url(${bannerSrc})` } : {}}
                    />
                    <div className="m-banner-overlay" />
                    <div className="m-topbar">
                        <div className="m-topbar-spacer" />
                        <div className="m-menu-wrap">
                            <button
                                className="m-topbar-btn"
                                aria-label="Меню"
                                onClick={() => setMenuOpen((v) => !v)}
                            >⋮</button>
                            {menuOpen && (
                                <>
                                    <div className="profile-menu-backdrop" onClick={() => setMenuOpen(false)} />
                                    <div className="profile-menu-dropdown">
                                        <button className="profile-menu-item" onClick={() => setMenuOpen(false)}>
                                            <span className="profile-menu-icon">↗</span> Поділитися
                                        </button>
                                        {!isOwnProfile && (
                                            <>
                                                <button className="profile-menu-item" onClick={() => { setMenuOpen(false); handleStartChat(); }}>
                                                    <span className="profile-menu-icon">✉</span> Написати {displayName}
                                                </button>
                                                <div className="profile-menu-divider" />
                                                <button className="profile-menu-item profile-menu-item--danger" onClick={() => setMenuOpen(false)}>
                                                    <span className="profile-menu-icon">🚫</span> Заблокувати {displayName}
                                                </button>
                                                <button className="profile-menu-item profile-menu-item--danger" onClick={() => setMenuOpen(false)}>
                                                    <span className="profile-menu-icon">⚑</span> Поскаржитись на {displayName}
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Header — avatar overlaps banner */}
                <div className="m-header">
                    <div className="m-avatar-wrap">
                        {avatarSrc
                            ? <img src={avatarSrc} alt="" className="m-avatar" />
                            : <div className="m-avatar-placeholder">{displayName.charAt(0).toUpperCase()}</div>
                        }
                        {streamStatus.live && <div className="m-avatar-online" />}
                    </div>

                    <div className="m-name-row">
                        <h1 className="m-name">{displayName}</h1>
                    </div>

                    {userInfo?.last_stream_at && (
                        <p className="m-last-stream">Останній стрім {userInfo.last_stream_at}</p>
                    )}

                    {bio && (
                        <p className="m-bio">{bio}</p>
                    )}

                    <p className="m-followers">{subCount} фолловерів</p>

                    {(userInfo?.telegram || userInfo?.social_link) && (
                        <div className="m-socials">
                            {userInfo?.telegram && (
                                <a href={`https://t.me/${userInfo.telegram}`}
                                   className="m-social-link" target="_blank" rel="noreferrer">
                                    ✈ {userInfo.telegram}
                                </a>
                            )}
                            {userInfo?.social_link && (
                                <a href={userInfo.social_link}
                                   className="m-social-link" target="_blank" rel="noreferrer">
                                    🔗 {userInfo.social_link.replace(/^https?:\/\//, "").slice(0, 20)}
                                </a>
                            )}
                        </div>
                    )}

                    <div className="m-actions">
                        {isOwnProfile ? (
                            <>
                                <button
                                    className="m-btn m-btn-secondary"
                                    onClick={() => navigate("/settings")}
                                    aria-label="Налаштування"
                                    title="Налаштування"
                                >
                                    ⚙
                                </button>
                                <button
                                    className="m-btn m-btn-primary"
                                    onClick={() => navigate("/controlpanel")}
                                >
                                    Панель керування автора
                                </button>
                            </>
                        ) : (
                            <>
                                <button className="m-btn m-btn-icon">▾</button>
                                <button className="m-btn m-btn-icon">🔔</button>
                                <button
                                    className="m-btn m-btn-secondary"
                                    style={{ flex: 1 }}
                                    onClick={handleStartChat}
                                >
                                    Написати
                                </button>
                                <button
                                    className={`m-btn ${isSubscribed ? "m-btn-secondary" : "m-btn-primary"}`}
                                    style={{ flex: 2 }}
                                    onClick={handleToggleSubscribe}
                                    disabled={subscribing}
                                >
                                    {subscribing ? "…" : isSubscribed ? "Відстежується" : "Підписатися"}
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <nav className="m-tabs">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            className={`m-tab ${activeTab === tab.id ? "active" : ""}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>

                {/* Content */}
                <div className="m-content">

                    {activeTab === "home" && (
                        <section>
                            {streamStatus.live && streamStatus.stream_key && (
                                <div className="m-live-section">
                                    <h2 className="m-section-title">
                                        <span className="m-live-badge">В ЕФІРІ</span>
                                        {isOwnProfile ? "Ви у прямому ефірі" : `${displayName} у ефірі`}
                                    </h2>
                                    <div onClick={() => navigate(`/stream/${isOwnProfile ? currentUser?.user_id : userId}`)}>
                                        <LiveStreamPlayer
                                            streamKey={streamStatus.stream_key}
                                            nickname={isOwnProfile ? "Мій стрім" : displayName}
                                            compact
                                        />
                                    </div>
                                </div>
                            )}

                            {videos.length > 0 && (
                                <div className="m-section-header">
                                    <h2 className="m-section-title">Останні трансляції</h2>
                                    <button className="m-section-more">Всі ›</button>
                                </div>
                            )}

                            {videos.length === 0 ? (
                                <p className="m-empty">
                                    {isOwnProfile
                                        ? "У вас ще немає завантажених відео"
                                        : "Користувач ще не завантажив жодного відео"}
                                </p>
                            ) : (
                                <div className="m-videos-list">
                                    {videos.slice(0, 4).map((v) => (
                                        <MobileVideoRow key={v.video_id} video={v}
                                            avatarSrc={avatarSrc} nickname={displayName}
                                            isOwner={isOwnProfile}
                                            onClick={setSelectedVideoId} onEdit={setEditingVideo} />
                                    ))}
                                </div>
                            )}

                            {videos.length > 0 && (
                                <div className="m-section-header" style={{ marginTop: 20 }}>
                                    <h2 className="m-section-title">Трансляції {displayName} за категоріями</h2>
                                    <button className="m-section-more">Всі ›</button>
                                </div>
                            )}
                        </section>
                    )}

                    {activeTab === "about" && (
                        <section>
                            <h2 className="m-section-title" style={{ marginBottom: 12 }}>Опис</h2>
                            <p className="m-about-bio">{bio || "Немає опису."}</p>
                        </section>
                    )}

                    {activeTab === "video" && (
                        <section>
                            {videos.length > 0 && (
                                <h2 className="m-section-title" style={{ marginBottom: 4 }}>
                                    Відео ({videos.length})
                                </h2>
                            )}
                            {videos.length === 0
                                ? <p className="m-empty">Немає відео.</p>
                                : <div className="m-videos-list">
                                    {videos.map((v) => (
                                        <MobileVideoRow key={v.video_id} video={v}
                                            avatarSrc={avatarSrc} nickname={displayName}
                                            isOwner={isOwnProfile}
                                            onClick={setSelectedVideoId} onEdit={setEditingVideo} />
                                    ))}
                                  </div>
                            }
                        </section>
                    )}

                    {activeTab === "streams" && (
                        <section>
                            <h2 className="m-section-title" style={{ marginBottom: 4 }}>Стріми</h2>
                            {videos.length === 0
                                ? <p className="m-empty">Немає збережених стрімів.</p>
                                : <div className="m-videos-list">
                                    {videos.map((v) => (
                                        <MobileVideoRow key={v.video_id} video={v}
                                            avatarSrc={avatarSrc} nickname={displayName}
                                            isOwner={isOwnProfile}
                                            onClick={setSelectedVideoId} onEdit={setEditingVideo} />
                                    ))}
                                  </div>
                            }
                        </section>
                    )}

                    {activeTab === "clips" && (
                        <section>
                            <h2 className="m-section-title" style={{ marginBottom: 12 }}>Кліпи</h2>
                            <p className="m-empty">Кліпи поки недоступні.</p>
                        </section>
                    )}
                </div>

                {selectedVideoId && (
                    <VideoModal video_id={selectedVideoId}
                        onClose={() => setSelectedVideoId(null)}
                        onVideoDelete={handleVideoDelete} />
                )}
                {editingVideo && (
                    <VideoEditModal
                        video_id={editingVideo.video_id} video={editingVideo}
                        onClose={() => setEditingVideo(null)}
                        onDelete={handleVideoDelete}
                        onUpdate={(updated) => {
                            setVideos((prev) => prev.map((v) => v.video_id === updated.video_id ? updated : v));
                            setEditingVideo(null);
                        }} />
                )}
            </div>
        );
    }

    /* ══════════════════════════════════════════════════════════════════════
       DESKTOP LAYOUT
    ══════════════════════════════════════════════════════════════════════ */
    return (
        <div className="profile-page">
            {/* Banner */}
            <div className="profile-banner-wrap">
                <div
                    className="profile-banner-bg"
                    style={bannerSrc ? { backgroundImage: `url(${bannerSrc})` } : {}}
                />
                <div className="profile-banner-overlay">
                    <div className="profile-topbar">
                        <div className="profile-topbar-spacer" />
                        <div className="profile-menu-wrap">
                            <button
                                type="button"
                                className="profile-topbar-btn"
                                aria-label="Меню"
                                title="Меню"
                                onClick={() => setMenuOpen((v) => !v)}
                            >
                                <span aria-hidden>⋮</span>
                            </button>
                            {menuOpen && (
                                <>
                                    <div className="profile-menu-backdrop" onClick={() => setMenuOpen(false)} />
                                    <div className="profile-menu-dropdown">
                                        <button className="profile-menu-item" onClick={() => setMenuOpen(false)}>
                                            <span className="profile-menu-icon">↗</span> Поділитися
                                        </button>
                                        {!isOwnProfile && (
                                            <>
                                                <button className="profile-menu-item" onClick={() => { setMenuOpen(false); handleStartChat(); }}>
                                                    <span className="profile-menu-icon">✉</span> Написати {displayName}
                                                </button>
                                                <div className="profile-menu-divider" />
                                                <button className="profile-menu-item profile-menu-item--danger" onClick={() => setMenuOpen(false)}>
                                                    <span className="profile-menu-icon">🚫</span> Заблокувати {displayName}
                                                </button>
                                                <button className="profile-menu-item profile-menu-item--danger" onClick={() => setMenuOpen(false)}>
                                                    <span className="profile-menu-icon">⚑</span> Поскаржитись на {displayName}
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="profile-info-card">
                        <div className="profile-avatar-wrap">
                            {avatarSrc ? (
                                <img src={avatarSrc} alt="" className="profile-avatar" />
                            ) : (
                                <div className="profile-avatar-placeholder">?</div>
                            )}
                        </div>
                        <div className="profile-title-block">
                            <h1 className="profile-name">
                                {isOwnProfile ? "Мій профіль" : userInfo?.nickname || "Профіль"}
                            </h1>
                            {bio && <p className="profile-bio">{bio}</p>}
                            <p className="profile-followers">{subCount} фолловерів</p>
                        </div>
                    </div>

                    {isOwnProfile && (
                        <div className="profile-actions-own">
                            <button
                                type="button"
                                className="profile-btn profile-btn-follow"
                                onClick={() => navigate("/controlpanel")}
                            >
                                Панель керування автора
                            </button>
                            <button
                                type="button"
                                className="profile-btn-icon-square"
                                onClick={() => navigate("/settings")}
                                aria-label="Налаштування"
                                title="Налаштування"
                            >
                                ⚙
                            </button>
                        </div>
                    )}

                    {!isOwnProfile && currentUser && (
                        <div className="profile-actions">
                            <div className="profile-actions-secondary">
                                <button
                                    type="button"
                                    className="profile-btn profile-btn-subscribe-alt"
                                    onClick={handleStartChat}
                                >
                                    Написати
                                </button>
                                <button
                                    type="button"
                                    className="profile-btn profile-btn-subscribe-alt"
                                    onClick={handleToggleSubscribe}
                                    disabled={subscribing}
                                >
                                    {subscribing ? "…" : isSubscribed ? "Відстежується" : "Відстежувати"}
                                </button>
                            </div>
                            <div className="profile-actions-primary">
                                <button
                                    type="button"
                                    className="profile-btn profile-btn-follow"
                                    onClick={handleToggleSubscribe}
                                    disabled={subscribing}
                                >
                                    {subscribing ? "…" : isSubscribed ? "Відписатися" : "Підписатися"}
                                </button>
                            </div>
                        </div>
                    )}
                </div>{/* end .profile-banner-overlay */}
            </div>{/* end .profile-banner-wrap */}

            {/* Tabs */}
            <nav className="profile-tabs">
                {TABS.map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        className={`profile-tab ${activeTab === tab.id ? "active" : ""}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </nav>

            {/* Tab content */}
            <div className="profile-content">
                {activeTab === "home" && (
                    <section className="profile-home-section">
                        {streamStatus.live && streamStatus.stream_key && (
                            <div className="profile-live-section">
                                <h2 className="profile-section-title">
                                    <span className="ls-player__badge">LIVE</span>
                                    {isOwnProfile ? "Ви у прямому ефірі" : `${userInfo?.nickname || "Канал"} у ефірі`}
                                </h2>
                                <div
                                    className="profile-live-player-link"
                                    onClick={() => navigate(`/stream/${isOwnProfile ? currentUser?.user_id : userId}`)}
                                    title="Відкрити стрім"
                                >
                                    <LiveStreamPlayer
                                        streamKey={streamStatus.stream_key}
                                        nickname={isOwnProfile ? "Мій стрім" : userInfo?.nickname}
                                        compact
                                    />
                                </div>
                            </div>
                        )}
                        {videos.length > 0 && (
                            <h2 className="profile-section-title">Останні трансляції</h2>
                        )}
                        {videos.length === 0 ? (
                            <p className="profile-videos-empty">
                                {isOwnProfile
                                    ? "У вас ще немає завантажених відео"
                                    : "Користувач ще не завантажив жодного відео"}
                            </p>
                        ) : (
                            <div className="profile-videos-grid">
                                {videos.map((v) => (
                                    <VideoCard
                                        key={v.video_id}
                                        video={v}
                                        isOwner={isOwnProfile}
                                        onClick={setSelectedVideoId}
                                        onEdit={setEditingVideo}
                                        onDelete={handleVideoDelete}
                                    />
                                ))}
                            </div>
                        )}
                    </section>
                )}
                {activeTab === "about" && (
                    <section className="profile-about-section">
                        <h2 className="profile-section-title">Опис</h2>
                        <p className="profile-about-bio">{bio || "Немає опису."}</p>
                    </section>
                )}
                {activeTab === "video" && (
                    <section className="profile-video-section">
                        <h2 className="profile-section-title">
                            Відео {videos.length > 0 && `(${videos.length})`}
                        </h2>
                        {videos.length === 0 ? (
                            <p className="profile-videos-empty">Немає відео.</p>
                        ) : (
                            <div className="profile-videos-grid">
                                {videos.map((v) => (
                                    <VideoCard
                                        key={v.video_id}
                                        video={v}
                                        isOwner={isOwnProfile}
                                        onClick={setSelectedVideoId}
                                        onEdit={setEditingVideo}
                                        onDelete={handleVideoDelete}
                                    />
                                ))}
                            </div>
                        )}
                    </section>
                )}
                {activeTab === "clips" && (
                    <section className="profile-clips-section">
                        <h2 className="profile-section-title">Кліпи</h2>
                        <p className="profile-videos-empty">Кліпи поки недоступні.</p>
                    </section>
                )}
            </div>

            {selectedVideoId && (
                <VideoModal
                    video_id={selectedVideoId}
                    onClose={() => setSelectedVideoId(null)}
                    onVideoDelete={handleVideoDelete}
                />
            )}
            {editingVideo && (
                <VideoEditModal
                    video_id={editingVideo.video_id}
                    video={editingVideo}
                    onClose={() => setEditingVideo(null)}
                    onDelete={handleVideoDelete}
                    onUpdate={(updated) => {
                        setVideos((prev) =>
                            prev.map((v) => (v.video_id === updated.video_id ? updated : v))
                        );
                        setEditingVideo(null);
                    }}
                />
            )}
        </div>
    );
};

export default ProfilePage;