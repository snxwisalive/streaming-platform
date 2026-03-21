import React, { useRef, useEffect, useState } from "react";
import Hls from "hls.js";
import "../../styles/LiveStream.css";

const STREAM_BASE =
  process.env.REACT_APP_STREAM_URL || "http://localhost:8081/hls";

export default function LiveStreamPlayer({ streamKey, nickname, compact = false }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [error, setError] = useState("");
  const [waiting, setWaiting] = useState(false);

  const url = `${STREAM_BASE}/${streamKey}.m3u8`;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    setError("");
    setWaiting(false);

    // Fix: React does NOT properly set the muted HTML attribute on <video>.
    // Setting it imperatively ensures the browser allows autoplay.
    video.muted = true;
    video.defaultMuted = true;

    const handlePlaying = () => {
      setWaiting(false);
      setError("");
    };

    const handleWaiting = () => {
      setWaiting(true);
    };

    const handleLoadedData = () => {
      setWaiting(false);
    };

    const handleVideoError = () => {
      const mediaError = video.error;
      if (!mediaError) {
        setError("Playback failed");
        return;
      }

      const messages = {
        1: "Playback aborted",
        2: "Network error while loading stream",
        3: "Browser could not decode the stream",
        4: "Stream format is not supported by the browser",
      };

      setError(messages[mediaError.code] || "Playback failed");
      setWaiting(false);
    };

    video.addEventListener("playing", handlePlaying);
    video.addEventListener("waiting", handleWaiting);
    video.addEventListener("loadeddata", handleLoadedData);
    video.addEventListener("error", handleVideoError);

    if (Hls.isSupported()) {
      const hls = new Hls({
        liveDurationInfinity: true,
        lowLatencyMode: false,
        backBufferLength: 30,
      });
      hlsRef.current = hls;

      hls.attachMedia(video);

      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        hls.loadSource(url);
      });

      // Fix: must explicitly call play() after manifest is parsed.
      // The autoPlay prop alone is not reliable when hls.js uses MSE.
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setWaiting(true);
        video.play().catch(() => {
          setError("Autoplay was blocked. Press play to start the stream.");
        });
      });

      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          // Stream may not have started yet — retry in 3 s
          setWaiting(true);
          setTimeout(() => {
            if (hlsRef.current) {
              hlsRef.current.loadSource(url);
              hlsRef.current.startLoad();
            }
          }, 3000);
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          setWaiting(true);
          hls.recoverMediaError();
        } else {
          hls.destroy();
          setError(data.details || "Fatal HLS playback error");
          setWaiting(false);
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari native HLS
      video.src = url;
      video.play().catch(() => {});
    } else {
      setError("HLS is not supported in this browser");
    }

    return () => {
      video.removeEventListener("playing", handlePlaying);
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("loadeddata", handleLoadedData);
      video.removeEventListener("error", handleVideoError);

      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [url]);

  return (
    <div className={`ls-player ${compact ? "ls-player--compact" : ""}`}>
      <div className="ls-player__header">
        <span className="ls-player__badge">LIVE</span>
        {nickname && <span className="ls-player__nickname">{nickname}</span>}
      </div>
      <div className="ls-player__video-wrap">
        {waiting && (
          <div className="ls-player__waiting">
            <div className="ls-player__waiting-spinner" />
            <span>Waiting for stream...</span>
          </div>
        )}
        {error && !waiting && (
          <div className="ls-player__error">
            <span>{error}</span>
          </div>
        )}
        <video
          ref={videoRef}
          className="ls-player__video"
          controls
          autoPlay
          playsInline
        />
      </div>
    </div>
  );
}
