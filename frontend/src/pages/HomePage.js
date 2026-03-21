import React, { useEffect, useState, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { fetchAPI, getUploadsBaseUrl } from "../services/api";
import VideoCard from "../features/components/VideoCard";
import VideoModal from "../features/components/VideoModal";
import LiveStreamCard from "../features/components/LiveStreamCard";
import useLiveStreams from "../hooks/useLiveStreams";
import "../styles/HomePage.css";

/* ── placeholder data (shown when real content is sparse) ────────────────── */

const PLACEHOLDER_STREAMS = [
  { user_id: "ph-1", nickname: "s0mcs",    stream_title: "green astra main in 2026 | !sens !aim !val...", avatar_url: "https://api.dicebear.com/9.x/pixel-art/svg?seed=s0mcs",    preview_img: "https://picsum.photos/seed/s0mcs-val/600/338",    _placeholder: true },
  { user_id: "ph-2", nickname: "ELVI",     stream_title: "[DROPS] ◆ !1440p ◆ !ae ◆ New Gacha...",           avatar_url: "https://api.dicebear.com/9.x/pixel-art/svg?seed=ELVI",     preview_img: "https://picsum.photos/seed/elvi-gacha/600/338",    _placeholder: true },
  { user_id: "ph-3", nickname: "relaxcis", stream_title: "TH ComeBack Sa Ranked playing radi...",           avatar_url: "https://api.dicebear.com/9.x/pixel-art/svg?seed=relaxcis", preview_img: "https://picsum.photos/seed/relaxcis-th/600/338", _placeholder: true },
  { user_id: "ph-4", nickname: "TenZ",     stream_title: "Ranked grind | !settings !crosshair",             avatar_url: "https://api.dicebear.com/9.x/pixel-art/svg?seed=TenZ",     preview_img: "https://picsum.photos/seed/tenz-ranked/600/338", _placeholder: true },
  { user_id: "ph-5", nickname: "Horcus",   stream_title: "FPL PRACTICE | !coach !rank",                    avatar_url: "https://api.dicebear.com/9.x/pixel-art/svg?seed=Horcus",   preview_img: "https://picsum.photos/seed/horcus-fpl/600/338",  _placeholder: true },
];

const PLACEHOLDER_CATEGORIES = [
  { id: "cat-1", name: "Clash Royale",            viewers: "2.6 тис.",  img_url: "https://static-cdn.jtvnw.net/ttv-boxart/Clash%20Royale-140x190.jpg" },
  { id: "cat-2", name: "Dead by Daylight",        viewers: "23 тис.",   img_url: "https://cdn.cloudflare.steamstatic.com/steam/apps/381210/header.jpg" },
  { id: "cat-3", name: "World of Warcraft",       viewers: "101 тис.",  img_url: "https://static-cdn.jtvnw.net/ttv-boxart/World%20of%20Warcraft-140x190.jpg" },
  { id: "cat-4", name: "Arena Breakout: Infinite",viewers: "18 тис.",   img_url: "https://static-cdn.jtvnw.net/ttv-boxart/Arena%20Breakout%3A%20Infinite.jpg" },
  { id: "cat-5", name: "Overwatch 2",             viewers: "9.6 тис.",  img_url: "https://static-cdn.jtvnw.net/ttv-boxart/Overwatch%202-140x190.jpg" },
  { id: "cat-6", name: "Fortnite",                viewers: "17 тис.",   img_url: "https://static-cdn.jtvnw.net/ttv-boxart/Fortnite-140x190.jpg" },
  { id: "cat-7", name: "Hogwarts Legacy",         viewers: "24 тис.",   img_url: "https://cdn.cloudflare.steamstatic.com/steam/apps/990080/header.jpg" },
];

/* ── helpers ─────────────────────────────────────────────────────────────── */

function SectionHeader({ accent, title, showMore, onShowMore }) {
  return (
    <div className="home-section-header">
      <h2 className="home-section-title">
        {accent && <span className="home-section-accent">{accent}</span>}
        {title}
      </h2>
      {showMore && (
        <button type="button" className="home-show-more" onClick={onShowMore}>
          показати ще
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      )}
    </div>
  );
}

function HScrollRow({ children }) {
  const ref = useRef(null);
  return (
    <div className="home-hscroll-wrap">
      <div className="home-hscroll" ref={ref}>
        {children}
      </div>
    </div>
  );
}

function CategoryCard({ category }) {
  const [imgError, setImgError] = useState(false);
  return (
    <div className="cat-card">
      <div className="cat-card__cover">
        {category.img_url && !imgError ? (
          <img
            src={category.img_url}
            alt={category.name}
            className="cat-card__img"
            onError={() => setImgError(true)}
          />
        ) : (
          <span className="cat-card__letter">{category.name.charAt(0)}</span>
        )}
      </div>
      <p className="cat-card__name">{category.name}</p>
      <p className="cat-card__viewers">
        <span className="cat-card__dot" />
        {category.viewers}
      </p>
    </div>
  );
}

/* ── main component ──────────────────────────────────────────────────────── */

export default function HomePage({ user }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlFeed = searchParams.get("feed");
  const urlQ = searchParams.get("q");

  const [videos, setVideos] = useState([]);
  const [searchStreams, setSearchStreams] = useState([]);
  const [searchUsers, setSearchUsers] = useState([]);
  const [selectedVideoId, setSelectedVideoId] = useState(null);
  const [feedType, setFeedType] = useState(urlFeed === "subscriptions" ? "subscriptions" : "all");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(urlQ || "");
  const [isSearching, setIsSearching] = useState(!!urlQ);

  const [liveExpanded, setLiveExpanded] = useState(false);
  const [videosExpanded, setVideosExpanded] = useState(false);

  const { liveStreams } = useLiveStreams(!!user);

  const LIVE_PREVIEW = 4;
  const VIDEOS_PREVIEW = 8;

  const loadVideos = async (type = "all") => {
    try {
      setLoading(true);
      let data;

      if (type === "subscriptions") {
        data = await fetchAPI("/subscriptions/feed", { method: "GET" });
      } else {
        data = await fetchAPI("/videos/public", { method: "GET" });
      }

      setVideos(data.videos || []);
      setIsSearching(false);
    } catch (err) {
      console.error("Failed to fetch videos", err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setIsSearching(false);
    setSearchParams({});
    loadVideos(feedType);
  };

  useEffect(() => {
    const feed = urlFeed === "subscriptions" ? "subscriptions" : "all";
    setFeedType(feed);
  }, [urlFeed]);

  useEffect(() => {
    if (urlQ != null && urlQ !== searchQuery) {
      setSearchQuery(urlQ);
      setIsSearching(!!urlQ);
    }
  }, [urlQ]);

  useEffect(() => {
    if (isSearching && searchQuery.trim()) {
      const run = async () => {
        try {
          setLoading(true);
          const q = encodeURIComponent(searchQuery.trim());
          const [videoRes, streamRes, userRes] = await Promise.all([
            fetchAPI(`/videos/search?q=${q}`, { method: "GET" }),
            fetchAPI(`/streams/live?q=${q}`, { method: "GET" }),
            fetchAPI(`/users/search?q=${q}`, { method: "GET" }),
          ]);
          setVideos(videoRes.videos || []);
          setSearchStreams(streamRes.streams || []);
          setSearchUsers(Array.isArray(userRes) ? userRes : []);
        } catch (err) {
          console.error("Failed to search", err);
          setVideos([]);
          setSearchStreams([]);
          setSearchUsers([]);
        } finally {
          setLoading(false);
        }
      };
      run();
    } else {
      setSearchStreams([]);
      setSearchUsers([]);
      loadVideos(feedType);
    }
  }, [feedType, isSearching, searchQuery]);

  const handleVideoClick = (video_id) => {
    setSelectedVideoId(video_id);
  };

  const handleCloseModal = () => {
    setSelectedVideoId(null);
  };

  const visibleLive = liveExpanded ? liveStreams : liveStreams.slice(0, LIVE_PREVIEW);
  const visibleVideos = videosExpanded ? videos : videos.slice(0, VIDEOS_PREVIEW);

  // Merge real live streams (first) with placeholders to fill the row
  const mergedStreams = [
    ...liveStreams,
    ...PLACEHOLDER_STREAMS.filter(
      (ph) => !liveStreams.some((r) => r.user_id === ph.user_id)
    ),
  ];
  const visibleMergedStreams = liveExpanded
    ? mergedStreams
    : mergedStreams.slice(0, Math.max(LIVE_PREVIEW, liveStreams.length));

  return (
    <div className="home-container">
      {loading && (
        <div className="home-loading">
          <div className="home-spinner" />
        </div>
      )}

      {/* ── Search results ────────────────────────────────────────────── */}
      {!loading && isSearching && (
        <>
          <div className="home-section-header home-search-sticky-header">
            <h2 className="home-section-title">
              Результати пошуку: <span className="home-section-accent">"{searchQuery}"</span>
            </h2>
            <button type="button" className="home-clear-search-btn" onClick={handleClearSearch}>
              Очистити пошук
            </button>
          </div>

          {searchStreams.length > 0 && (
            <section className="home-section">
              <SectionHeader accent="Активні канали" title="" />
              <HScrollRow>
                {searchStreams.map((s) => (
                  <LiveStreamCard key={s.user_id} stream={s} />
                ))}
              </HScrollRow>
            </section>
          )}

          {videos.length > 0 && (
            <section className="home-section">
              <SectionHeader accent="Відео" title="" />
              <div className="home-videos-grid">
                {videos.map((v) => (
                  <VideoCard key={v.video_id} video={v} onClick={handleVideoClick} />
                ))}
              </div>
            </section>
          )}

          {searchUsers.length > 0 && (
            <section className="home-section">
              <SectionHeader accent="Користувачі" title="" />
              <div className="home-search-users">
                {searchUsers.map((u) => (
                  <Link key={u.user_id} to={`/profile/${u.user_id}`} className="home-search-user-card">
                    <div className="home-search-user-avatar">
                      {u.avatar_url ? (
                        <img src={getUploadsBaseUrl() + u.avatar_url} alt="" />
                      ) : (
                        <span>{u.nickname?.charAt(0).toUpperCase() || "?"}</span>
                      )}
                    </div>
                    <div className="home-search-user-info">
                      <span className="home-search-user-nickname">{u.nickname}</span>
                      <span className="home-search-user-subs">
                        {Number(u.subscriber_count || 0).toLocaleString("uk-UA")} підписників
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {searchStreams.length === 0 && videos.length === 0 && searchUsers.length === 0 && (
            <p className="home-search-empty">Нічого не знайдено за вашим запитом.</p>
          )}
        </>
      )}

      {/* ── Feed (non-search) ─────────────────────────────────────────── */}
      {!loading && !isSearching && (
        <>
          {/* Active channels — real streams first, then placeholders */}
          <section className="home-section">
            <SectionHeader
              accent="Активні канали"
              title=", які можуть вам сподобатися"
              showMore={!liveExpanded && mergedStreams.length > LIVE_PREVIEW}
              onShowMore={() => setLiveExpanded(true)}
            />
            <HScrollRow>
              {visibleMergedStreams.map((s) => (
                <LiveStreamCard key={s.user_id} stream={s} placeholder={!!s._placeholder} />
              ))}
            </HScrollRow>
          </section>

          {/* Categories */}
          <section className="home-section">
            <SectionHeader
              accent="Категорії"
              title=", які можуть вам сподобатися"
              showMore
              onShowMore={() => {}}
            />
            <HScrollRow>
              {PLACEHOLDER_CATEGORIES.map((c) => (
                <CategoryCard key={c.id} category={c} />
              ))}
            </HScrollRow>
          </section>

          {/* Videos */}
          {videos.length > 0 && (
            <section className="home-section">
              <SectionHeader
                accent={feedType === "subscriptions" ? "Відео з підписок" : "Рекомендовані відео"}
                title=""
                showMore={!videosExpanded && videos.length > VIDEOS_PREVIEW}
                onShowMore={() => setVideosExpanded(true)}
              />
              <div className="home-videos-grid">
                {visibleVideos.map((v) => (
                  <VideoCard key={v.video_id} video={v} onClick={handleVideoClick} />
                ))}
              </div>
            </section>
          )}

          {videos.length === 0 && liveStreams.length === 0 && (
            <p className="home-empty">
              {feedType === "subscriptions"
                ? "Немає відео з каналів, на які ви підписані."
                : "Немає доступних відео."}
            </p>
          )}
        </>
      )}

      {selectedVideoId && (
        <VideoModal
          video_id={selectedVideoId}
          onClose={handleCloseModal}
          onVideoUpdate={() => loadVideos(feedType)}
          onVideoDelete={() => {
            setVideos((prev) => prev.filter((v) => v.video_id !== selectedVideoId));
            handleCloseModal();
          }}
        />
      )}
    </div>
  );
}