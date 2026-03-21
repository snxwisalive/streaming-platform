import React from "react";
import { useNavigate } from "react-router-dom";
import { getUploadsBaseUrl } from "../../services/api";
import "../../styles/LiveStream.css";

/**
 * A card that represents a live channel in the recommendations grid.
 *
 * Props:
 *   stream — { user_id, nickname, avatar_url, stream_key, stream_title }
 *   placeholder — if true, the card is decorative and non-clickable
 */
export default function LiveStreamCard({ stream, placeholder }) {
  const navigate = useNavigate();

  const avatarSrc = stream.avatar_url
    ? (stream.avatar_url.startsWith('http') ? stream.avatar_url : getUploadsBaseUrl() + stream.avatar_url)
    : null;
  const previewSrc = stream.preview_img || null;

  const handleClick = () => {
    if (!placeholder) navigate(`/stream/${stream.user_id}`);
  };

  return (
    <div
      className={`ls-card${placeholder ? " ls-card--placeholder" : ""}`}
      onClick={handleClick}
    >
      {/* thumbnail */}
      <div className="ls-card__thumb">
        {previewSrc && (
          <img src={previewSrc} alt="" className="ls-card__thumb-img" />
        )}
        <span className="ls-card__badge">В Ефірі</span>
      </div>

      {/* info row: avatar + text */}
      <div className="ls-card__info">
        <div className="ls-card__avatar">
          {avatarSrc ? (
            <img src={avatarSrc} alt="" />
          ) : (
            <span>{stream.nickname?.charAt(0).toUpperCase() || "?"}</span>
          )}
        </div>
        <div className="ls-card__text">
          <p className="ls-card__title">
            {stream.stream_title || stream.nickname}
          </p>
          <p className="ls-card__name">{stream.nickname}</p>
        </div>
      </div>
    </div>
  );
}
