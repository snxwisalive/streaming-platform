import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip,
    ResponsiveContainer, CartesianGrid
} from "recharts";
import { fetchAPI, getUploadsBaseUrl } from "../services/api";
import { authService } from "../services/authService";
import VideoCard from "../features/components/VideoCard";
import VideoModal from "../features/components/VideoModal";
import VideoEditModal from "../features/components/VideoEditModal";
import LiveStreamPlayer from "../features/components/LiveStreamPlayer";
import UploadVideoPage from "./UploadVideoPage";
import "../styles/ControlPanelPage.css";

/* ══════════════════════════════════════════════════════════════════════════
   HOOKS
══════════════════════════════════════════════════════════════════════════ */
function useWindowWidth() {
    const [width, setWidth] = useState(
        typeof window !== "undefined" ? window.innerWidth : 1024
    );
    useEffect(() => {
        const handle = () => setWidth(window.innerWidth);
        window.addEventListener("resize", handle);
        return () => window.removeEventListener("resize", handle);
    }, []);
    return width;
}

/* ══════════════════════════════════════════════════════════════════════════
   ICONS
══════════════════════════════════════════════════════════════════════════ */
const IconHome = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
);
const IconAnalytics = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
    </svg>
);
const IconMaterials = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2"/><polyline points="8 21 12 17 16 21"/>
    </svg>
);
const IconBroadcast = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="2"/>
        <path d="M16.24 7.76a6 6 0 0 1 0 8.49"/><path d="M7.76 16.24a6 6 0 0 1 0-8.49"/>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M4.93 19.07a10 10 0 0 1 0-14.14"/>
    </svg>
);
const IconChannel = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
);
const IconIRL = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
);
const IconUpload = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
        <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
    </svg>
);
const IconClock = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
);
const IconEye = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
);
const IconCopy = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
);
const IconEyeOff = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
        <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
);

/* ══════════════════════════════════════════════════════════════════════════
   SIDEBAR NAV
══════════════════════════════════════════════════════════════════════════ */
const NAV_SECTIONS = [
    {
        items: [
            { id: "home",      label: "Головна",    icon: <IconHome /> },
            { id: "analytics", label: "Аналітика",  icon: <IconAnalytics /> },
            { id: "materials", label: "Матеріали",  icon: <IconMaterials /> },
            { id: "channel",   label: "Канал",      icon: <IconChannel /> },
            { id: "upload",      label: "Нове відео",     icon: <IconUpload />,    sub: "Завантажте відео на канал" },
        ],
    },
];

/* ══════════════════════════════════════════════════════════════════════════
   CALENDAR
══════════════════════════════════════════════════════════════════════════ */
const UA_MONTHS = [
    "Січень","Лютий","Березень","Квітень","Травень","Червень",
    "Липень","Серпень","Вересень","Жовтень","Листопад","Грудень"
];
const UA_DAYS = ["Пн","Вт","Ср","Чт","Пт","Сб","Нд"];

function toDateStr(d) { return d.toISOString().slice(0, 10); }

function Calendar({ from, to, onChange }) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [viewYear,  setViewYear ] = useState(today.getFullYear());
    const [viewMonth, setViewMonth] = useState(today.getMonth());
    const [selecting, setSelecting] = useState(null);
    const firstDay    = new Date(viewYear, viewMonth, 1);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(viewYear, viewMonth, d));
    const fromD = from ? new Date(from) : null;
    const toD   = to   ? new Date(to)   : null;
    const prevMonth = () => { if (viewMonth === 0) { setViewYear(y => y-1); setViewMonth(11); } else setViewMonth(m => m-1); };
    const nextMonth = () => { if (viewMonth === 11) { setViewYear(y => y+1); setViewMonth(0); } else setViewMonth(m => m+1); };
    const handleDay = (d) => {
        if (!d || d > today) return;
        const s = toDateStr(d);
        if (!selecting || selecting === "from") {
            onChange({ from: s, to: toD && s <= toDateStr(toD) ? toDateStr(toD) : s });
            setSelecting("to");
        } else {
            if (fromD && d < fromD) onChange({ from: s, to: toDateStr(fromD) });
            else onChange({ from: toDateStr(fromD || d), to: s });
            setSelecting(null);
        }
    };
    const isFrom    = (d) => d && fromD && toDateStr(d) === toDateStr(fromD);
    const isTo      = (d) => d && toD   && toDateStr(d) === toDateStr(toD);
    const isInRange = (d) => d && fromD && toD && d > fromD && d < toD;
    const isToday   = (d) => d && toDateStr(d) === toDateStr(today);
    const isFuture  = (d) => d && d > today;
    return (
        <div className="cp-calendar">
            <div className="cp-calendar-header">
                <button className="cp-cal-nav" onClick={prevMonth}>‹</button>
                <span className="cp-cal-title">{UA_MONTHS[viewMonth]} {viewYear}</span>
                <button className="cp-cal-nav" onClick={nextMonth}>›</button>
            </div>
            <div className="cp-calendar-grid">
                {UA_DAYS.map(d => <div key={d} className="cp-cal-weekday">{d}</div>)}
                {cells.map((d, i) => (
                    <div key={i} className={["cp-cal-day", !d?"cp-cal-day--empty":"", d&&isFuture(d)?"cp-cal-day--future":"", d&&isToday(d)?"cp-cal-day--today":"", d&&isFrom(d)?"cp-cal-day--from":"", d&&isTo(d)?"cp-cal-day--to":"", d&&isInRange(d)?"cp-cal-day--range":""].filter(Boolean).join(" ")} onClick={() => handleDay(d)}>
                        {d ? d.getDate() : ""}
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════════
   CUSTOM TOOLTIP
══════════════════════════════════════════════════════════════════════════ */
function CustomTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="cp-tooltip">
            <p className="cp-tooltip-label">{label}</p>
            <p className="cp-tooltip-value">+{payload[0].value} підписників</p>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════════
   HOME TAB
══════════════════════════════════════════════════════════════════════════ */
function HomeTab() {
    const currentUser = authService.getCurrentUser();
    const userId = currentUser?.user_id;
    const nickname = currentUser?.nickname || "Автор";

    const [streamStatus, setStreamStatus] = useState(null);
    const [streamKey,    setStreamKey   ] = useState(null);
    const [rtmpUrl,      setRtmpUrl     ] = useState(null);
    const [subCount,     setSubCount    ] = useState(null);
    const [loading,      setLoading     ] = useState(true);
    const [showKey,      setShowKey     ] = useState(false);
    const [copied,       setCopied      ] = useState(null); // "key" | "url" | null
    const [editOpen,     setEditOpen    ] = useState(false);
    const [editTitle,    setEditTitle   ] = useState("");
    const [editDesc,     setEditDesc    ] = useState("");
    const [saving,       setSaving      ] = useState(false);

    const load = useCallback(async () => {
        if (!userId) return;
        try {
            setLoading(true);
            const [statusRes, keyRes, meRes] = await Promise.all([
                fetchAPI(`/streams/status/${userId}`, { method: "GET" }),
                fetchAPI("/streams/me/key",           { method: "GET" }),
                fetchAPI("/users/me",                 { method: "GET" }),
            ]);
            setStreamStatus(statusRes);
            setStreamKey(keyRes?.stream_key || null);
            setRtmpUrl(keyRes?.rtmp_url || null);
            setSubCount(meRes?.subscriber_count ?? null);
            setEditTitle(statusRes?.stream_title || "");
            setEditDesc(statusRes?.stream_description || "");
        } catch (err) {
            console.error("HomeTab load error:", err);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => { load(); }, [load]);

    // Poll stream status every 15s
    useEffect(() => {
        if (!userId) return;
        const id = setInterval(async () => {
            try {
                const s = await fetchAPI(`/streams/status/${userId}`, { method: "GET" });
                setStreamStatus(s);
            } catch {}
        }, 15_000);
        return () => clearInterval(id);
    }, [userId]);

    const handleCopy = (text, type) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(type);
            setTimeout(() => setCopied(null), 2000);
        });
    };

    const handleSaveInfo = async () => {
        setSaving(true);
        try {
            await fetchAPI("/streams/me/info", {
                method: "PATCH",
                body: { stream_title: editTitle, stream_description: editDesc },
            });
            setStreamStatus(prev => ({ ...prev, stream_title: editTitle, stream_description: editDesc }));
            setEditOpen(false);
        } catch (err) {
            alert("Не вдалося зберегти");
        } finally {
            setSaving(false);
        }
    };

    const isLive = streamStatus?.live;

    if (loading) return <p className="cp-loading">Завантаження...</p>;

    return (
        <div className="cp-home">
            <h1 className="cp-page-title">Ласкаво просимо, {nickname}!</h1>

            <div className="cp-home-body">
                {/* ── Left: stream preview ── */}
                <div className="cp-home-preview">
                    {isLive && streamKey ? (
                        <LiveStreamPlayer
                            streamKey={streamKey}
                            nickname={nickname}
                        />
                    ) : (
                        <div className="cp-home-offline">
                            <span className="cp-home-offline-badge">НЕ В ЕФІРІ</span>
                            {streamStatus?.stream_title && (
                                <p className="cp-home-offline-title">{streamStatus.stream_title}</p>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Right: stats + controls ── */}
                <div className="cp-home-right">
                    {/* Stat cards */}
                    <div className="cp-home-stats">
                        <div className="cp-home-stat">
                            <span className="cp-home-stat-value">—</span>
                            <span className="cp-home-stat-label">Тривалість трансляції</span>
                        </div>
                        <div className="cp-home-stat">
                            <span className="cp-home-stat-value">—</span>
                            <span className="cp-home-stat-label">Глядачі</span>
                        </div>
                        <div className="cp-home-stat">
                            <span className="cp-home-stat-value">
                                {subCount != null ? Number(subCount).toLocaleString("uk-UA") : "—"}
                            </span>
                            <span className="cp-home-stat-label">Фолловери</span>
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="cp-home-actions">
                        <button
                            className="cp-home-btn cp-home-btn--primary"
                            onClick={() => window.open(`/stream/${userId}`, "_blank")}
                        >
                            Управління трансляцією
                        </button>
                        <button
                            className="cp-home-btn cp-home-btn--secondary"
                            onClick={() => setEditOpen(true)}
                        >
                            Змінити дані
                        </button>
                    </div>

                    {/* Stream key / RTMP */}
                    <div className="cp-home-obs">
                        <p className="cp-home-obs-title">Налаштування OBS</p>
                        <div className="cp-home-obs-row">
                            <span className="cp-home-obs-label">RTMP URL</span>
                            <div className="cp-home-obs-value-wrap">
                                <span className="cp-home-obs-value">{rtmpUrl || "rtmp://localhost:1935/stream"}</span>
                                <button className="cp-home-obs-copy" onClick={() => handleCopy(rtmpUrl || "rtmp://localhost:1935/stream", "url")}>
                                    {copied === "url" ? "✓" : <IconCopy />}
                                </button>
                            </div>
                        </div>
                        <div className="cp-home-obs-row">
                            <span className="cp-home-obs-label">Stream Key</span>
                            <div className="cp-home-obs-value-wrap">
                                <span className="cp-home-obs-value cp-home-obs-value--key">
                                    {showKey ? (streamKey || "—") : "••••••••••••••••"}
                                </span>
                                <button className="cp-home-obs-copy" onClick={() => setShowKey(v => !v)}>
                                    <IconEyeOff />
                                </button>
                                <button className="cp-home-obs-copy" onClick={() => handleCopy(streamKey || "", "key")}>
                                    {copied === "key" ? "✓" : <IconCopy />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit stream info modal */}
            {editOpen && (
                <div className="cp-modal-backdrop" onClick={() => setEditOpen(false)}>
                    <div className="cp-modal" onClick={e => e.stopPropagation()}>
                        <div className="cp-modal-header">
                            <h2 className="cp-modal-title">Дані трансляції</h2>
                            <button className="cp-modal-close" onClick={() => setEditOpen(false)}>✕</button>
                        </div>
                        <div className="cp-modal-body">
                            <label className="cp-modal-label">Назва трансляції</label>
                            <input
                                className="cp-modal-input"
                                value={editTitle}
                                onChange={e => setEditTitle(e.target.value)}
                                placeholder="Введіть назву..."
                                maxLength={200}
                            />
                            <label className="cp-modal-label">Опис</label>
                            <textarea
                                className="cp-modal-textarea"
                                value={editDesc}
                                onChange={e => setEditDesc(e.target.value)}
                                placeholder="Введіть опис..."
                                maxLength={2000}
                                rows={4}
                            />
                        </div>
                        <div className="cp-modal-footer">
                            <button className="cp-home-btn cp-home-btn--secondary" onClick={() => setEditOpen(false)}>
                                Скасувати
                            </button>
                            <button className="cp-home-btn cp-home-btn--primary" onClick={handleSaveInfo} disabled={saving}>
                                {saving ? "Збереження..." : "Зберегти"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════════
   ANALYTICS TAB
══════════════════════════════════════════════════════════════════════════ */
function AnalyticsTab() {
    const today    = new Date();
    const monthAgo = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000);
    const [range, setRange] = useState({ from: toDateStr(monthAgo), to: toDateStr(today) });
    const [data,    setData   ] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error,   setError  ] = useState(null);
    const load = useCallback(async () => {
        try {
            setLoading(true); setError(null);
            const res = await fetchAPI(`/analytics/overview?from=${range.from}&to=${range.to}`, { method: "GET" });
            setData(res);
        } catch { setError("Не вдалося завантажити аналітику"); }
        finally { setLoading(false); }
    }, [range]);
    useEffect(() => { load(); }, [load]);
    const formatRangeLabel = () => {
        const fmt = (s) => { const d = new Date(s); const m = ["січ","лют","бер","квіт","трав","черв","лип","серп","вер","жовт","лист","груд"]; return `${d.getDate()} ${m[d.getMonth()]}. ${d.getFullYear()} р.`; };
        const days = Math.round((new Date(range.to) - new Date(range.from)) / (1000*60*60*24)) + 1;
        return { label: `${fmt(range.from)} — ${fmt(range.to)}`, days };
    };
    const { label: rangeLabel, days: rangeDays } = formatRangeLabel();
    const chartData = data?.subscriber_history ?? [];
    if (error) return <p className="cp-error">{error}</p>;
    return (
        <div className="cp-analytics">
            <h1 className="cp-page-title">Аналітика</h1>
            <div className="cp-analytics-body">
                <div className="cp-analytics-left">
                    <div className="cp-stat-cards">
                        <div className="cp-stat-card cp-stat-card--primary">
                            <span className="cp-stat-value">{loading ? "—" : (data?.subscriber_count ?? 0).toLocaleString("uk-UA")}</span>
                            <span className="cp-stat-label">Підписники</span>
                        </div>
                        <div className="cp-stat-card">
                            <span className="cp-stat-value">{loading ? "—" : `+${(data?.new_subscribers_in_range ?? 0).toLocaleString("uk-UA")}`}</span>
                            <span className="cp-stat-label">Нових за період</span>
                        </div>
                        <div className="cp-stat-card">
                            <span className="cp-stat-value">{loading ? "—" : (data?.video_count ?? 0).toLocaleString("uk-UA")}</span>
                            <span className="cp-stat-label">Відео</span>
                        </div>
                    </div>
                    <div className="cp-section">
                        <h2 className="cp-section-title">Нові підписники</h2>
                        {loading ? <div className="cp-chart-loading">Завантаження...</div>
                        : chartData.length === 0 ? <p className="cp-chart-empty">Немає підписників за вибраний період</p>
                        : (
                            <ResponsiveContainer width="100%" height={280}>
                                <BarChart data={chartData} barSize={32} margin={{ top: 16, right: 8, left: -10, bottom: 0 }}>
                                    <CartesianGrid vertical={false} stroke="rgba(0,0,0,0.05)" />
                                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#8888a0" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                                    <YAxis tick={{ fontSize: 11, fill: "#8888a0" }} axisLine={false} tickLine={false} allowDecimals={false} />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(124,58,237,0.06)" }} />
                                    <Bar dataKey="count" name="Підписники" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
                <div className="cp-analytics-right">
                    <div className="cp-range-label">
                        <span className="cp-range-text">{rangeLabel}</span>
                        <span className="cp-range-days">{rangeDays} {rangeDays === 1 ? "день" : rangeDays < 5 ? "дні" : "днів"}</span>
                    </div>
                    <Calendar from={range.from} to={range.to} onChange={setRange} />
                </div>
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════════
   MOBILE VIDEO ROW
══════════════════════════════════════════════════════════════════════════ */
function fmtDuration(sec) {
    if (!sec) return null;
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    if (h > 0) return `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
    return `${m}:${String(s).padStart(2,"0")}`;
}
function fmtDate(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    const m = ["січ","лют","бер","квіт","трав","черв","лип","серп","вер","жовт","лист","груд"];
    return `${d.getDate()} ${m[d.getMonth()]}. ${d.getFullYear()} р.`;
}
function fmtViews(n) {
    if (n == null) return "0";
    if (n >= 1_000_000) return (n/1_000_000).toFixed(1).replace(".0","") + " млн";
    if (n >= 1_000) return (n/1_000).toFixed(1).replace(".0","") + " тис.";
    return String(n);
}
function MobileVideoRow({ video, onClick, onEdit }) {
    return (
        <div className="cpm-row" onClick={() => onClick(video.video_id)}>
            <div className="cpm-thumb">
                {video.thumbnail_url ? <img src={video.thumbnail_url} alt="" /> : <div className="cpm-thumb-placeholder" />}
            </div>
            <div className="cpm-info">
                <p className="cpm-title">{video.title || "Без назви"}</p>
                <p className="cpm-date">{fmtDate(video.created_at)}</p>
                <div className="cpm-meta">
                    {video.duration && <span className="cpm-meta-item"><IconClock /> {fmtDuration(video.duration)}</span>}
                    {(video.views_count ?? video.views) != null && (
                        <span className="cpm-meta-item"><IconEye /> {fmtViews(video.views_count ?? video.views)}</span>
                    )}
                </div>
            </div>
            <button className="cpm-more" onClick={e => { e.stopPropagation(); onEdit(video); }} aria-label="Редагувати">⋮</button>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════════
   MATERIALS TAB
══════════════════════════════════════════════════════════════════════════ */
function MaterialsTab({ onUpload }) {
    const width    = useWindowWidth();
    const isMobile = width < 768;
    const [subTab,          setSubTab         ] = useState("videos");
    const [videos,          setVideos         ] = useState([]);
    const [loading,         setLoading        ] = useState(true);
    const [error,           setError          ] = useState(null);
    const [selectedVideoId, setSelectedVideoId] = useState(null);
    const [editingVideo,    setEditingVideo   ] = useState(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                setLoading(true);
                const res = await fetchAPI("/videos/me", { method: "GET" });
                if (!cancelled) {
                    const base = getUploadsBaseUrl();
                    const normalize = (v) => ({ ...v, thumbnail_url: v.thumbnail_url ? (v.thumbnail_url.startsWith("http") ? v.thumbnail_url : base + v.thumbnail_url) : null });
                    if (Array.isArray(res))              setVideos(res.map(normalize));
                    else if (Array.isArray(res?.videos)) setVideos(res.videos.map(normalize));
                    else                                 setVideos([]);
                }
            } catch { if (!cancelled) setError("Не вдалося завантажити відео"); }
            finally  { if (!cancelled) setLoading(false); }
        })();
        return () => { cancelled = true; };
    }, []);

    const handleVideoDelete = (video_id) => { setVideos(prev => prev.filter(v => v.video_id !== video_id)); if (selectedVideoId === video_id) setSelectedVideoId(null); };
    const handleVideoUpdate = (updated) => {
        const base = getUploadsBaseUrl();
        const n = { ...updated, thumbnail_url: updated.thumbnail_url ? (updated.thumbnail_url.startsWith("http") ? updated.thumbnail_url : base + updated.thumbnail_url) : null };
        setVideos(prev => prev.map(v => v.video_id === n.video_id ? n : v));
        setEditingVideo(null);
    };

    const renderVideos = () => {
        if (loading) return <p className="cp-loading">Завантаження...</p>;
        if (error)   return <p className="cp-error">{error}</p>;
        if (videos.length === 0) return (
            <div className="cp-materials-empty">
                <p>У вас ще немає відео</p>
                <button className="cp-upload-btn" onClick={onUpload}><IconUpload /> Завантажити перше відео</button>
            </div>
        );
        if (isMobile) return (
            <div className="cpm-list">
                {videos.map(v => <MobileVideoRow key={v.video_id} video={v} onClick={id => setSelectedVideoId(id)} onEdit={video => setEditingVideo(video)} />)}
            </div>
        );
        return (
            <div className="cp-videocard-grid">
                {videos.map(v => <VideoCard key={v.video_id} video={v} isOwner={true} onClick={id => setSelectedVideoId(id)} onEdit={video => setEditingVideo(video)} onDelete={handleVideoDelete} />)}
            </div>
        );
    };

    return (
        <div className="cp-materials">
            <div className="cp-materials-header">
                <div className="cp-subtabs">
                    <button className={`cp-subtab ${subTab === "videos" ? "active" : ""}`} onClick={() => setSubTab("videos")}>Відеостудія</button>
                    <button className={`cp-subtab ${subTab === "clips"  ? "active" : ""}`} onClick={() => setSubTab("clips")}>Кліпи</button>
                </div>
                {!isMobile ? (
                    <button className="cp-upload-btn" onClick={onUpload}><IconUpload /> Завантажити відео</button>
                ) : (
                    <button className="cp-filter-btn" aria-label="Фільтр">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/>
                        </svg>
                    </button>
                )}
            </div>
            {subTab === "videos" && renderVideos()}
            {subTab === "clips"  && <div className="cp-placeholder"><p className="cp-placeholder-text">Кліпи поки недоступні</p></div>}
            {selectedVideoId && <VideoModal video_id={selectedVideoId} onClose={() => setSelectedVideoId(null)} onVideoUpdate={handleVideoUpdate} onVideoDelete={handleVideoDelete} />}
            {editingVideo    && <VideoEditModal video_id={editingVideo.video_id} video={editingVideo} onClose={() => setEditingVideo(null)} onDelete={handleVideoDelete} onUpdate={handleVideoUpdate} />}
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════════
   PLACEHOLDER TAB
══════════════════════════════════════════════════════════════════════════ */
function PlaceholderTab({ label }) {
    return <div className="cp-placeholder"><p className="cp-placeholder-text">{label} — скоро буде доступно</p></div>;
}

/* ══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════════════════ */
export default function ControlPanelPage({ user }) {
    const navigate = useNavigate();
    const location = useLocation();
    const hash     = location.hash.replace("#", "") || "home";
    const [activeTab, setActiveTab] = useState(hash);

    useEffect(() => {
        const newHash = location.hash.replace("#", "") || "home";
        setActiveTab(newHash);
    }, [location.hash]);

    const goTo = (id) => {
        if (id === "channel") { navigate("/profile"); return; }
        setActiveTab(id);
        navigate(`/controlpanel#${id}`, { replace: true });
    };

    const renderContent = () => {
        switch (activeTab) {
            case "home":        return <HomeTab />;
            case "analytics":   return <AnalyticsTab />;
            case "materials":   return <MaterialsTab onUpload={() => navigate("/upload")} />;
            case "channel":     return <PlaceholderTab label="Канал" />;
            case "upload": return <UploadVideoPage />;
            default:            return <HomeTab />;
        }
    };

    return (
        <div className="cp-layout">
            <aside className="cp-sidebar">
                <div className="cp-sidebar-header">
                    <span className="cp-sidebar-logo">Панель керування</span>
                </div>
                <nav className="cp-nav">
                    {NAV_SECTIONS.map((section, si) => (
                        <div key={si} className="cp-nav-section">
                            {section.label && <p className="cp-nav-section-label">{section.label}</p>}
                            {section.items.map((item) => (
                                <button key={item.id} className={`cp-nav-item ${activeTab === item.id ? "active" : ""}`} onClick={() => goTo(item.id)}>
                                    <span className="cp-nav-icon">{item.icon}</span>
                                    <span className="cp-nav-text">
                                        <span className="cp-nav-label">{item.label}</span>
                                        {item.sub && <span className="cp-nav-sub">{item.sub}</span>}
                                    </span>
                                </button>
                            ))}
                        </div>
                    ))}
                </nav>
            </aside>
            <main className="cp-main">
                {renderContent()}
            </main>
        </div>
    );
}