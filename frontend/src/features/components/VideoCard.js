import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/VideoCard.css";

const VideoCard = ({ video, isOwner, onClick, onEdit, onDelete }) => {
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleUserClick = (e) => {
    e.stopPropagation();
    navigate(`/profile/${video.user_id}`);
  };

  return (
    <div className="vc" onClick={() => onClick(video.video_id)}>
      {/* Thumbnail */}
      <div className="vc__thumb">
        {video.thumbnail_url ? (
          <img src={video.thumbnail_url} alt={video.title} className="vc__thumb-img" />
        ) : (
          <div className="vc__thumb-placeholder">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </div>
        )}

        {/* Owner menu */}
        {isOwner && (
          <div ref={menuRef} className="vc__menu-wrap" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="vc__menu-btn"
              title="Інше"
            >
              <MenuIcon />
            </button>

            {menuOpen && (
              <div className="vc__menu-dropdown">
                <button
                  onClick={() => { setMenuOpen(false); onEdit?.(video); }}
                  className="vc__menu-item"
                >
                  Редагувати
                </button>
                <button
                  onClick={() => { setMenuOpen(false); onDelete?.(video.video_id); }}
                  className="vc__menu-item vc__menu-item--danger"
                >
                  Видалити
                </button>
              </div>
            )}
          </div>
        )}

        {/* Views overlay */}
        <span className="vc__views-badge">
          {formatViews(video.views_count)} переглядів
        </span>
      </div>

      {/* Info */}
      <div className="vc__body">
        <h4 className="vc__title">{video.title}</h4>

        {video.nickname && (
          <p className="vc__author" onClick={handleUserClick}>
            {video.nickname}
          </p>
        )}

        {/* Tags */}
        {video.tags && video.tags.length > 0 && (
          <div className="vc__tags" onClick={(e) => e.stopPropagation()}>
            {video.tags.slice(0, 3).map((tag) => (
              <span key={tag.tag_id || tag.name} className="vc__tag">
                {tag.name}
              </span>
            ))}
            {video.tags.length > 3 && (
              <span className="vc__tag-more">+{video.tags.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

function formatViews(n) {
  const num = Number(n) || 0;
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, "") + " тис.";
  return String(num);
}

const MenuIcon = () => {
  const [imgError, setImgError] = useState(false);

  if (imgError) {
    return <span style={{ lineHeight: 1 }}>⋮</span>;
  }

  return (
    <img
      src="/other.png"
      alt="menu"
      onError={() => setImgError(true)}
      style={{ width: "16px", height: "16px", objectFit: "contain" }}
    />
  );
};

export default VideoCard;