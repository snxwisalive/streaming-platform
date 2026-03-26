import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { fetchAPI, getUploadsBaseUrl } from "../../services/api";
import "../../styles/MobileSearchModal.css";

export default function MobileSearchModal({ onClose, initialQuery = "" }) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [searchStreams, setSearchStreams] = useState([]);
  const [searchVideos, setSearchVideos] = useState([]);
  const [searchUsers, setSearchUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchStreams([]);
      setSearchVideos([]);
      setSearchUsers([]);
      setSearched(false);
      return;
    }

    const run = async () => {
      try {
        setLoading(true);
        setSearched(true);
        const q = encodeURIComponent(searchQuery.trim());
        const [videoRes, streamRes, userRes] = await Promise.all([
          fetchAPI(`/videos/search?q=${q}`, { method: "GET" }),
          fetchAPI(`/streams/live?q=${q}`, { method: "GET" }),
          fetchAPI(`/users/search?q=${q}`, { method: "GET" }),
        ]);
        setSearchVideos(videoRes.videos || []);
        setSearchStreams(streamRes.streams || []);
        setSearchUsers(Array.isArray(userRes) ? userRes : []);
      } catch (err) {
        console.error("Search error:", err);
        setSearchVideos([]);
        setSearchStreams([]);
        setSearchUsers([]);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(run, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleClose = () => {
    navigate("/");
    onClose?.();
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/?q=${encodeURIComponent(searchQuery.trim())}`);
      onClose?.();
    }
  };

  return (
    <div className="mobile-search-modal">
      <div className="mobile-search-modal__header">
        <button
          type="button"
          className="mobile-search-modal__close"
          onClick={handleClose}
          aria-label="Закрити"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
        <form className="mobile-search-modal__form" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Введіть пошановий запит..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mobile-search-modal__input"
            autoFocus
          />
          <button type="submit" className="mobile-search-modal__submit" aria-label="Пошук">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
          </button>
        </form>
      </div>

      <div className="mobile-search-modal__content">
        {loading && (
          <div className="mobile-search-modal__loading">
            <div className="mobile-search-modal__spinner" />
          </div>
        )}

        {!loading && searched && searchQuery.trim() && (
          <>
            {searchStreams.length > 0 && (
              <div className="mobile-search-modal__section">
                <h3 className="mobile-search-modal__section-title">Активні канали</h3>
                <div className="mobile-search-modal__streams">
                  {searchStreams.map((stream) => (
                    <Link
                      key={stream.user_id}
                      to={`/live/${stream.user_id}`}
                      className="mobile-search-modal__stream-card"
                      onClick={onClose}
                    >
                      <img
                        src={getUploadsBaseUrl() + stream.avatar_url}
                        alt={stream.nickname}
                        className="mobile-search-modal__stream-avatar"
                      />
                      <div className="mobile-search-modal__stream-info">
                        <div className="mobile-search-modal__stream-nickname">{stream.nickname}</div>
                        <div className="mobile-search-modal__stream-title">{stream.stream_title}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {searchVideos.length > 0 && (
              <div className="mobile-search-modal__section">
                <h3 className="mobile-search-modal__section-title">Відео</h3>
                <div className="mobile-search-modal__videos">
                  {searchVideos.map((video) => (
                    <Link
                      key={video.video_id}
                      to={`/?video=${video.video_id}`}
                      className="mobile-search-modal__video-card"
                      onClick={onClose}
                    >
                      <img
                        src={video.thumbnail_url}
                        alt={video.title}
                        className="mobile-search-modal__video-thumbnail"
                      />
                      <div className="mobile-search-modal__video-info">
                        <div className="mobile-search-modal__video-title">{video.title}</div>
                        <div className="mobile-search-modal__video-uploader">{video.uploader_nickname}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {searchUsers.length > 0 && (
              <div className="mobile-search-modal__section">
                <h3 className="mobile-search-modal__section-title">Користувачі</h3>
                <div className="mobile-search-modal__users">
                  {searchUsers.map((user) => (
                    <Link
                      key={user.user_id}
                      to={`/profile/${user.user_id}`}
                      className="mobile-search-modal__user-card"
                      onClick={onClose}
                    >
                      <div className="mobile-search-modal__user-avatar">
                        {user.avatar_url ? (
                          <img src={getUploadsBaseUrl() + user.avatar_url} alt="" />
                        ) : (
                          <span>{user.nickname?.charAt(0).toUpperCase() || "?"}</span>
                        )}
                      </div>
                      <div className="mobile-search-modal__user-info">
                        <div className="mobile-search-modal__user-nickname">{user.nickname}</div>
                        <div className="mobile-search-modal__user-subs">
                          {Number(user.subscriber_count || 0).toLocaleString("uk-UA")} підписників
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {searchStreams.length === 0 && searchVideos.length === 0 && searchUsers.length === 0 && (
              <div className="mobile-search-modal__empty">
                <p>Нічого не знайдено за вашим запитом.</p>
              </div>
            )}
          </>
        )}

        {!searched && !loading && (
          <div className="mobile-search-modal__placeholder">
            <p>Введіть текст для пошуку</p>
          </div>
        )}
      </div>
    </div>
  );
}
