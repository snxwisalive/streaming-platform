import React, { useRef, useEffect, useState } from "react";
import Hls from "hls.js";

export default function LivePlayer({ url }) {
    const videoRef = useRef(null);
    const [status, setStatus] = useState('idle');
    const [error, setError] = useState(null);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        let hls;
        setStatus('loading');
        setError(null);

        fetch(url, { method: 'HEAD', mode: 'cors' })
            .then((res) => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                setStatus('attached');

                if (Hls.isSupported()) {
                    hls = new Hls();
                    hls.attachMedia(video);
                    hls.on(Hls.Events.MEDIA_ATTACHED, () => {
                        hls.loadSource(url);
                    });

                    hls.on(Hls.Events.MANIFEST_PARSED, () => {
                        video.muted = true;
                        video.defaultMuted = true;
                        video.play().catch(() => {
                            setError('Autoplay was blocked. Press play to start the stream.');
                        });
                    });

                    hls.on(Hls.Events.ERROR, (event, data) => {
                        console.error('HLS error', event, data);
                        if (data && data.fatal) {
                            setError(`${data.type}: ${data.details}`);
                            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                                hls.startLoad();
                            } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
                                hls.recoverMediaError();
                            } else {
                                hls.destroy();
                            }
                        }
                    });
                } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                    video.src = url;
                    video.muted = true;
                    video.defaultMuted = true;
                    video.play().catch(() => {
                        setError('Autoplay was blocked. Press play to start the stream.');
                    });
                }
            })
            .catch((err) => {
                console.error('Playlist fetch failed', err);
                setError(`Unable to fetch playlist: ${err.message}`);
                setStatus('error');
            });

        return () => {
            if (hls) hls.destroy();
        };
    }, [url]);

    return (
        <div>
            <div style={{ marginBottom: 8 }}>
                <strong>Status:</strong> {status} {error && <span style={{ color: 'red' }}> — {error}</span>}
            </div>
            <video ref={videoRef} controls autoPlay playsInline style={{ width: '100%', maxWidth: 800 }} />
        </div>
    );
}
