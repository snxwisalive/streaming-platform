import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchAPI, getUploadsBaseUrl } from "../services/api";
import { authService } from "../services/authService";
import "../styles/SettingsPage.css";

const BIO_MAX_LENGTH = 500;

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

export default function SettingsPage({ onProfileUpdate, onLogout }) {
    const navigate = useNavigate();
    const width    = useWindowWidth();
    const isMobile = width < 768;

    const [activeTab,           setActiveTab          ] = useState("profile");
    const [user,                setUser               ] = useState(null);
    const [loading,             setLoading            ] = useState(true);
    const [saving,              setSaving             ] = useState(false);
    const [nickname,            setNickname           ] = useState("");
    const [bio,                 setBio                ] = useState("");
    const [avatarFile,          setAvatarFile         ] = useState(null);
    const [avatarPreview,       setAvatarPreview      ] = useState(null);
    const [bannerFile,          setBannerFile         ] = useState(null);
    const [bannerPreview,       setBannerPreview      ] = useState(null);
    const [error,               setError              ] = useState(null);
    const [success,             setSuccess            ] = useState(null);
    const [fieldError,          setFieldError         ] = useState({ nickname: "", bio: "" });
    const [streamKey,           setStreamKey          ] = useState(null);
    const [rtmpUrl,             setRtmpUrl            ] = useState(null);
    const [showStreamKey,       setShowStreamKey      ] = useState(false);
    const [streamTitle,         setStreamTitle        ] = useState("");
    const [streamDescription,   setStreamDescription  ] = useState("");
    const [streamInfoSaving,    setStreamInfoSaving   ] = useState(false);
    const [deactivationLoading, setDeactivationLoading] = useState(false);
    const [deletionLoading,     setDeletionLoading    ] = useState(false);
    const [showDeactivateModal, setShowDeactivateModal] = useState(false);
    const [showDeleteModal,     setShowDeleteModal    ] = useState(false);
    const [deletePassword,      setDeletePassword     ] = useState("");

    useEffect(() => {
        const load = async () => {
            if (!authService.getCurrentUser()) { navigate("/login"); return; }
            try {
                const data = await fetchAPI("/users/me", { method: "GET" });
                setUser(data);
                setNickname(data.nickname || "");
                setBio(data.bio || "");
                if (data.avatar_url) setAvatarPreview(getUploadsBaseUrl() + data.avatar_url);
                if (data.banner_url) setBannerPreview(getUploadsBaseUrl() + data.banner_url);
            } catch {
                setError("Не вдалося завантажити профіль.");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [navigate]);

    useEffect(() => {
        const loadStreamKey = async () => {
            try {
                const data = await fetchAPI("/streams/me/key", { method: "GET" });
                setStreamKey(data.stream_key || null);
                setRtmpUrl(data.rtmp_url || null);
            } catch { /* silent */ }
        };
        const loadStreamInfo = async () => {
            try {
                const me = authService.getCurrentUser();
                if (!me) return;
                const data = await fetchAPI(`/streams/status/${me.user_id}`, { method: "GET" });
                setStreamTitle(data.stream_title || "");
                setStreamDescription(data.stream_description || "");
            } catch { /* silent */ }
        };
        if (authService.getCurrentUser()) { loadStreamKey(); loadStreamInfo(); }
    }, []);

    const handleAvatarChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setAvatarFile(file);
        setAvatarPreview(URL.createObjectURL(file));
    };

    const handleBannerChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setBannerFile(file);
        setBannerPreview(URL.createObjectURL(file));
    };

    const handleSave = async () => {
        setError(null); setSuccess(null);
        setFieldError({ nickname: "", bio: "" });
        if (bio.length > BIO_MAX_LENGTH) {
            setFieldError((p) => ({ ...p, bio: `Біо не більше ${BIO_MAX_LENGTH} символів.` }));
            return;
        }
        setSaving(true);
        try {
            if (avatarFile) {
                const form = new FormData();
                form.append("avatar", avatarFile);
                const updated = await fetchAPI("/users/me/avatar", { method: "POST", body: form });
                setUser((u) => ({ ...u, ...updated }));
                const stored = authService.getCurrentUser();
                if (stored) {
                    localStorage.setItem("user", JSON.stringify({ ...stored, ...updated }));
                    onProfileUpdate?.({ ...stored, ...updated });
                }
                setAvatarFile(null);
            }
            if (bannerFile) {
                const form = new FormData();
                form.append("banner", bannerFile);
                const updated = await fetchAPI("/users/me/banner", { method: "POST", body: form });
                setUser((u) => ({ ...u, ...updated }));
                const stored = authService.getCurrentUser();
                if (stored) {
                    localStorage.setItem("user", JSON.stringify({ ...stored, ...updated }));
                    onProfileUpdate?.({ ...stored, ...updated });
                }
                setBannerFile(null);
            }
            const payload = {};
            if (nickname.trim() !== (user?.nickname || "")) payload.nickname = nickname.trim();
            if (bio !== (user?.bio || "")) payload.bio = bio;
            if (Object.keys(payload).length > 0) {
                const updated = await fetchAPI("/users/me", { method: "PATCH", body: payload });
                setUser((u) => ({ ...u, ...updated }));
                const stored = authService.getCurrentUser();
                if (stored) {
                    localStorage.setItem("user", JSON.stringify({ ...stored, ...updated }));
                    onProfileUpdate?.({ ...stored, ...updated });
                }
            }
            setSuccess("Зміни збережено.");
        } catch (err) {
            const msg = err.message || "Помилка збереження.";
            if (msg.includes("Nickname already exists")) {
                setFieldError((p) => ({ ...p, nickname: "Цей нікнейм вже зайнятий." }));
            } else if (msg.includes("Bio must be")) {
                setFieldError((p) => ({ ...p, bio: `Біо не більше ${BIO_MAX_LENGTH} символів.` }));
            } else {
                setError(msg);
            }
        } finally {
            setSaving(false);
        }
    };

    const handleSaveStreamInfo = async () => {
        setStreamInfoSaving(true);
        try {
            await fetchAPI("/streams/me/info", {
                method: "PATCH",
                body: JSON.stringify({ stream_title: streamTitle, stream_description: streamDescription }),
            });
            setSuccess("Інформацію про стрім збережено.");
        } catch (err) {
            setError(err.message || "Не вдалося зберегти інфо стріму.");
        } finally {
            setStreamInfoSaving(false);
        }
    };

    const handleLogout = () => {
        authService.logout();
        onLogout?.();
        navigate("/");
    };

    const handleConfirmDeactivate = async () => {
        if (deactivationLoading) return;
        setError(null);
        setDeactivationLoading(true);
        try {
            await fetchAPI("/users/me/deactivate", { method: "POST" });
            authService.logout();
            onLogout?.();
            navigate("/login");
        } catch (err) {
            setError(err.message || "Не вдалося деактивувати акаунт.");
        } finally {
            setDeactivationLoading(false);
            setShowDeactivateModal(false);
        }
    };

    const handleConfirmDelete = async () => {
        if (deletionLoading) return;
        if (!deletePassword.trim()) {
            setError("Введіть пароль для підтвердження видалення.");
            return;
        }
        setError(null);
        setDeletionLoading(true);
        try {
            const resp = await fetchAPI("/users/me/delete", {
                method: "POST",
                body: { password: deletePassword },
            });
            const deletionDate = resp?.deletion_date ? new Date(resp.deletion_date) : null;
            const humanDate = deletionDate ? deletionDate.toLocaleDateString("uk-UA") : null;
            window.alert(
                humanDate
                    ? `Акаунт буде видалено через 30 днів (${humanDate}).`
                    : "Акаунт буде видалено через 30 днів."
            );
            authService.logout();
            onLogout?.();
            navigate("/login");
        } catch (err) {
            setError(err.message || "Не вдалося видалити акаунт.");
        } finally {
            setDeletionLoading(false);
            setShowDeleteModal(false);
        }
    };

    if (loading) return <div className="settings-page"><p>Завантаження...</p></div>;

    /* ══════════════════════════════════════════════════════════════════════
       SHARED MODALS
    ══════════════════════════════════════════════════════════════════════ */
    const DeactivateModal = () => (
        <div className="settings-modal-backdrop" onClick={() => setShowDeactivateModal(false)}>
            <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
                <h3 className="settings-modal-title">Деактивувати акаунт?</h3>
                <p className="settings-modal-desc">
                    Ваш профіль та відео стануть недоступними. Ви зможете відновити акаунт при наступному вході.
                </p>
                <div className="settings-modal-actions">
                    <button type="button" className="settings-btn settings-modal-cancel"
                        onClick={() => setShowDeactivateModal(false)}>
                        Скасувати
                    </button>
                    <button type="button" className="settings-btn settings-btn-danger-outline"
                        disabled={deactivationLoading}
                        onClick={handleConfirmDeactivate}>
                        {deactivationLoading ? "Деактивація..." : "Деактивувати"}
                    </button>
                </div>
            </div>
        </div>
    );

    const DeleteModal = () => (
        <div className="settings-modal-backdrop" onClick={() => setShowDeleteModal(false)}>
            <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
                <h3 className="settings-modal-title">Видалити акаунт назавжди?</h3>
                <p className="settings-modal-desc">
                    Акаунт буде видалено через 30 днів. Якщо ви увійдете протягом цього часу — видалення буде скасовано автоматично.
                </p>
                <div className="settings-modal-field">
                    <label className="settings-modal-label">Введіть пароль для підтвердження</label>
                    <input
                        type="password"
                        className="settings-modal-input"
                        value={deletePassword}
                        onChange={(e) => setDeletePassword(e.target.value)}
                        placeholder="Пароль"
                    />
                </div>
                <div className="settings-modal-actions">
                    <button type="button" className="settings-btn settings-modal-cancel"
                        onClick={() => setShowDeleteModal(false)}
                        disabled={deletionLoading}>
                        Скасувати
                    </button>
                    <button type="button" className="settings-btn settings-btn-danger"
                        disabled={deletionLoading}
                        onClick={handleConfirmDelete}>
                        {deletionLoading ? "Видалення..." : "Видалити назавжди"}
                    </button>
                </div>
            </div>
        </div>
    );

    /* ══════════════════════════════════════════════════════════════════════
       MOBILE LAYOUT
    ══════════════════════════════════════════════════════════════════════ */
    if (isMobile) {
        return (
            <div className="s-page">

                {/* Topbar */}
                <div className="s-topbar">
                    <button className="s-back-btn" onClick={() => navigate(-1)} aria-label="Назад">←</button>
                    <h1 className="s-topbar-title">Налаштування</h1>
                    <div style={{ width: 36 }} />
                </div>

                {/* Tabs */}
                <div className="s-tabs">
                    <button
                        className={`s-tab ${activeTab === "profile" ? "s-tab--active" : ""}`}
                        onClick={() => setActiveTab("profile")}
                    >
                        Профіль
                    </button>
                    <button
                        className={`s-tab ${activeTab === "stream" ? "s-tab--active" : ""}`}
                        onClick={() => setActiveTab("stream")}
                    >
                        Трансляції та відео
                    </button>
                </div>

                <div className="s-body">

                    {error   && <div className="s-alert s-alert-error">{error}</div>}
                    {success && <div className="s-alert s-alert-success">{success}</div>}

                    {/* ── Profile Tab ── */}
                    {activeTab === "profile" && (
                        <>
                            {/* Profile Preview */}
                            <section className="s-section s-section--preview">
                                <h2 className="s-section-title">Ваш профіль видно всім ось так</h2>
                                <div className="s-preview-card">
                                    <div
                                        className="s-preview-banner-bg"
                                        style={bannerPreview ? { backgroundImage: `url(${bannerPreview})` } : {}}
                                    />
                                    <div className="s-preview-overlay">
                                        <div className="s-preview-info-card">
                                            <div className="s-preview-avatar-wrap">
                                                {avatarPreview
                                                    ? <img src={avatarPreview} alt="" className="s-preview-avatar" />
                                                    : <div className="s-preview-avatar s-preview-avatar--empty" />
                                                }
                                            </div>
                                            <div className="s-preview-title-block">
                                                <span className="s-preview-name">{nickname || user?.username || "—"}</span>
                                                {bio && <p className="s-preview-bio">{bio}</p>}
                                                <p className="s-preview-followers">{user?.subscriber_count ? Number(user.subscriber_count).toLocaleString("uk-UA") : "0"} фолловерів</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Avatar */}
                            <section className="s-section">
                                <h2 className="s-section-title">Зображення профілю</h2>
                                <p className="s-hint">Тут ви можете змінити фото профілю.</p>
                                <div className="s-avatar-upload-row">
                                    <label className="s-avatar-label">
                                        {avatarPreview
                                            ? <img src={avatarPreview} alt="Avatar" className="s-avatar-img" />
                                            : <div className="s-avatar-placeholder"><span className="s-upload-icon">👤</span></div>
                                        }
                                        <input type="file" accept="image/*" onChange={handleAvatarChange} hidden />
                                    </label>
                                    <label className="s-upload-btn-label">
                                        Змінити зображення профілю
                                        <input type="file" accept="image/*" onChange={handleAvatarChange} hidden />
                                    </label>
                                </div>
                                <p className="s-hint" style={{ marginTop: 8 }}>Формат що підтримується: JPEG, PNG або GIF. Макс. Розмір: 10 МБ.</p>
                            </section>

                            {/* Banner */}
                            <section className="s-section">
                                <h2 className="s-section-title">Зображення банеру профілю</h2>
                                <p className="s-hint">Тут ви можете змінити фото банера.</p>
                                <label className="s-banner-label">
                                    {bannerPreview
                                        ? <img src={bannerPreview} alt="Banner" className="s-banner-img" />
                                        : <div className="s-banner-placeholder">
                                            <span className="s-upload-icon">🖼</span>
                                            <span>Завантажити банер</span>
                                          </div>
                                    }
                                    <input type="file" accept="image/*" onChange={handleBannerChange} hidden />
                                </label>
                                <p className="s-hint" style={{ marginTop: 8 }}>Формат зображення: JPEG, PNG, GIF (рекомендована роздільність: 1920×480, максимальний розмір: 10 МБ).</p>
                            </section>

                            {/* Profile Info */}
                            <section className="s-section">
                                <h2 className="s-section-title">Інформація профілю</h2>
                                <p className="s-hint">Змініть персональні дані облікового запису.</p>

                                <div className="s-field">
                                    <label className="s-label" htmlFor="s-nickname">Ім'я, що відображається</label>
                                    <input
                                        id="s-nickname"
                                        className="s-input"
                                        type="text"
                                        value={nickname}
                                        onChange={(e) => { setNickname(e.target.value); setFieldError((p) => ({ ...p, nickname: "" })); }}
                                        placeholder="Введіть нікнейм"
                                    />
                                    <p className="s-char-hint">Ви можете оновити ваше ім'я користувача тут.</p>
                                    {fieldError.nickname && <p className="s-field-error">{fieldError.nickname}</p>}
                                </div>

                                <div className="s-field">
                                    <label className="s-label" htmlFor="s-bio">Про себе</label>
                                    <textarea
                                        id="s-bio"
                                        className="s-textarea"
                                        value={bio}
                                        onChange={(e) => { setBio(e.target.value); setFieldError((p) => ({ ...p, bio: "" })); }}
                                        placeholder="Розкажіть про себе"
                                        maxLength={BIO_MAX_LENGTH}
                                    />
                                    <p className="s-char-hint">{bio.length} / {BIO_MAX_LENGTH}</p>
                                    {fieldError.bio && <p className="s-field-error">{fieldError.bio}</p>}
                                </div>
                            </section>

                            {/* Actions */}
                            <div className="s-actions">
                                <button className="s-btn s-btn-primary s-btn-full"
                                    onClick={handleSave} disabled={saving}>
                                    {saving ? "Збереження…" : "Зберегти зміни"}
                                </button>
                                <button className="s-btn s-btn-danger s-btn-full"
                                    onClick={handleLogout}>
                                    Вийти з акаунту
                                </button>
                            </div>

                            {/* Deactivation */}
                            <section className="s-section" style={{ marginTop: 8 }}>
                                <h2 className="s-section-title">Деактивувати обліковий запис</h2>
                                <p className="s-hint">Тимчасово приховає ваш профіль та відео. Ви зможете відновити акаунт при наступному вході.</p>
                                <button className="s-btn s-btn-danger-outline s-btn-full" type="button"
                                    disabled={deactivationLoading}
                                    onClick={() => setShowDeactivateModal(true)}>
                                    {deactivationLoading ? "Деактивація..." : "Деактивувати акаунт"}
                                </button>
                            </section>

                            {/* Deletion */}
                            <section className="s-section">
                                <h2 className="s-section-title">Видалити обліковий запис</h2>
                                <p className="s-hint">Акаунт буде видалено через 30 днів. Якщо ви увійдете протягом цього часу — видалення буде скасовано автоматично.</p>
                                <button className="s-btn s-btn-danger-filled s-btn-full" type="button"
                                    disabled={deletionLoading}
                                    onClick={() => setShowDeleteModal(true)}>
                                    {deletionLoading ? "Підготовка видалення..." : "Видалити акаунт"}
                                </button>
                            </section>

                            {showDeactivateModal && <DeactivateModal />}
                            {showDeleteModal && <DeleteModal />}
                        </>
                    )}

                    {/* ── Stream Tab ── */}
                    {activeTab === "stream" && (
                        <>
                            <section className="s-section">
                                <h2 className="s-section-title">Стрім</h2>
                                <p className="s-hint">Для налаштування OBS або іншого стрім-софту.</p>

                                <div className="s-field">
                                    <label className="s-label">RTMP URL</label>
                                    <div className="s-copy-row">
                                        <input className="s-input s-mono" type="text" readOnly
                                            value={rtmpUrl || "Завантаження..."} onClick={(e) => e.target.select()} />
                                        <button className="s-copy-btn"
                                            onClick={() => rtmpUrl && navigator.clipboard.writeText(rtmpUrl)}>
                                            Копіювати
                                        </button>
                                    </div>
                                </div>

                                <div className="s-field">
                                    <label className="s-label">Ключ потоку</label>
                                    <div className="s-copy-row">
                                        <input className="s-input s-mono"
                                            type={showStreamKey ? "text" : "password"} readOnly
                                            value={streamKey || "Завантаження..."} onClick={(e) => e.target.select()} />
                                        <button className="s-copy-btn" onClick={() => setShowStreamKey((s) => !s)}>
                                            {showStreamKey ? "Сховати" : "Показати"}
                                        </button>
                                    </div>
                                    <button className="s-copy-btn" style={{ marginTop: 6, width: "100%" }}
                                        onClick={() => streamKey && navigator.clipboard.writeText(streamKey)}>
                                        Копіювати ключ
                                    </button>
                                </div>

                                <div className="s-field">
                                    <label className="s-label" htmlFor="s-stream-title">Назва стріму</label>
                                    <input id="s-stream-title" className="s-input" type="text"
                                        value={streamTitle}
                                        onChange={(e) => setStreamTitle(e.target.value)}
                                        placeholder="Наприклад: Граємо в Minecraft"
                                        maxLength={200} />
                                </div>

                                <div className="s-field">
                                    <label className="s-label" htmlFor="s-stream-desc">Опис стріму</label>
                                    <textarea id="s-stream-desc" className="s-textarea"
                                        value={streamDescription}
                                        onChange={(e) => setStreamDescription(e.target.value)}
                                        placeholder="Про що буде стрім..."
                                        maxLength={2000} />
                                    <p className="s-char-hint">{streamDescription.length} / 2000</p>
                                </div>

                                <button className="s-btn s-btn-primary s-btn-full"
                                    disabled={streamInfoSaving} onClick={handleSaveStreamInfo}>
                                    {streamInfoSaving ? "Збереження…" : "Зберегти інфо стріму"}
                                </button>
                            </section>
                        </>
                    )}

                </div>
            </div>
        );
    }

    /* ══════════════════════════════════════════════════════════════════════
       DESKTOP LAYOUT
    ══════════════════════════════════════════════════════════════════════ */
    return (
        <div className="settings-page">
            <h1>Налаштування</h1>

            {/* Tabs */}
            <div className="settings-tabs">
                <button
                    className={`settings-tab ${activeTab === "profile" ? "settings-tab--active" : ""}`}
                    onClick={() => setActiveTab("profile")}
                >
                    Профіль
                </button>
                <button
                    className={`settings-tab ${activeTab === "stream" ? "settings-tab--active" : ""}`}
                    onClick={() => setActiveTab("stream")}
                >
                    Трансляції та відео
                </button>
            </div>

            {error   && <div className="settings-error-box">{error}</div>}
            {success && <div className="settings-success">{success}</div>}

            {/* ── Profile Tab ── */}
            {activeTab === "profile" && (
                <>
                    {/* Profile Preview */}
                    <section className="settings-section">
                        <h2 className="settings-section-heading">Ваш профіль видно всім ось так</h2>
                        <div className="settings-preview-card">
                            <div
                                className="settings-preview-banner-bg"
                                style={bannerPreview ? { backgroundImage: `url(${bannerPreview})` } : {}}
                            />
                            <div className="settings-preview-overlay">
                                <div className="settings-preview-info-card">
                                    <div className="settings-preview-avatar-wrap">
                                        {avatarPreview
                                            ? <img src={avatarPreview} alt="" className="settings-preview-avatar" />
                                            : <div className="settings-preview-avatar settings-preview-avatar--empty" />
                                        }
                                    </div>
                                    <div className="settings-preview-title-block">
                                        <span className="settings-preview-name">{nickname || user?.username || "—"}</span>
                                        {bio && <p className="settings-preview-bio">{bio}</p>}
                                        <p className="settings-preview-followers">{user?.subscriber_count ? Number(user.subscriber_count).toLocaleString("uk-UA") : "0"} фолловерів</p>
                                    </div>
                                </div>
                                <div className="settings-preview-actions">
                                    <button className="settings-preview-follow-btn">+ Відстежувати</button>
                                    <button className="settings-preview-sub-btn">Підписатися</button>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Avatar */}
                    <section className="settings-section">
                        <h2 className="settings-section-heading">Зображення профілю</h2>
                        <p className="settings-hint">Тут ви можете змінити фото профілю.</p>
                        <div className="settings-avatar-wrap">
                            {avatarPreview
                                ? <img src={avatarPreview} alt="Avatar" className="settings-avatar-preview" />
                                : <div className="settings-avatar-placeholder">Фото</div>
                            }
                            <div className="settings-avatar-upload">
                                <label className="settings-upload-btn">
                                    Змінити зображення профілю
                                    <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleAvatarChange} hidden />
                                </label>
                                <p className="settings-hint" style={{ margin: 0 }}>Формат що підтримується: JPEG, PNG або GIF. Макс. Розмір: 10 МБ.</p>
                            </div>
                        </div>
                    </section>

                    {/* Banner */}
                    <section className="settings-section">
                        <h2 className="settings-section-heading">Зображення банеру профілю</h2>
                        <p className="settings-hint">Тут ви можете змінити фото банера.</p>
                        <div className="settings-banner-wrap">
                            {bannerPreview
                                ? <img src={bannerPreview} alt="Banner" className="settings-banner-preview" />
                                : <div className="settings-banner-placeholder">Банер</div>
                            }
                            <label className="settings-upload-btn" style={{ marginTop: 12, display: "inline-block" }}>
                                Змінити банер профілю
                                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleBannerChange} hidden />
                            </label>
                            <p className="settings-hint" style={{ marginTop: 8 }}>Формат зображення: JPEG, PNG, GIF (рекомендована роздільність: 1920×480, максимальний розмір: 10 МБ).</p>
                        </div>
                    </section>

                    {/* Profile Info */}
                    <section className="settings-section">
                        <h2 className="settings-section-heading">Інформація профілю</h2>
                        <p className="settings-hint">Змініть персональні дані облікового запису.</p>

                        <div className="settings-field settings-field--inline">
                            <label htmlFor="settings-nickname">Ім'я, що відображається</label>
                            <div className="settings-field-right">
                                <input
                                    id="settings-nickname" type="text" value={nickname}
                                    onChange={(e) => { setNickname(e.target.value); setFieldError((p) => ({ ...p, nickname: "" })); }}
                                    placeholder="Введіть нікнейм"
                                />
                                <div className="field-hint">Ви можете оновити ваше ім'я користувача тут. Це ім'я відображається лише для вас.</div>
                                {fieldError.nickname && <div className="field-error">{fieldError.nickname}</div>}
                            </div>
                        </div>

                        <div className="settings-field settings-field--inline">
                            <label htmlFor="settings-bio">Про себе</label>
                            <div className="settings-field-right">
                                <textarea
                                    id="settings-bio" value={bio}
                                    onChange={(e) => { setBio(e.target.value); setFieldError((p) => ({ ...p, bio: "" })); }}
                                    placeholder="Розкажіть про себе" maxLength={BIO_MAX_LENGTH}
                                />
                                <div className="field-hint">{bio.length} / {BIO_MAX_LENGTH}</div>
                                {fieldError.bio && <div className="field-error">{fieldError.bio}</div>}
                            </div>
                        </div>
                    </section>

                    <div className="settings-actions">
                        <button type="button" className="settings-btn settings-btn-primary"
                            onClick={handleSave} disabled={saving}>
                            {saving ? "Збереження…" : "Зберегти"}
                        </button>
                        <button type="button" className="settings-btn settings-btn-danger"
                            onClick={handleLogout}>
                            Вийти
                        </button>
                    </div>

                    {/* Account management */}
                    <section className="settings-section" style={{ marginTop: 32 }}>
                        <h2 className="settings-section-heading">Деактивувати обліковий запис</h2>
                        <p className="settings-hint">Повністю вимкнути обліковий запис</p>
                        <div className="settings-account-table">
                            <div className="settings-account-row">
                                <div className="settings-account-row-label">Вимкнути обліковий запис</div>
                                <div className="settings-account-row-desc">
                                    Щоб вимкнути обліковий запис, натисніть{" "}
                                    <button type="button" className="settings-link-btn"
                                        disabled={deactivationLoading}
                                        onClick={() => setShowDeactivateModal(true)}>
                                        «Деактивувати обліковий запис»
                                    </button>.
                                </div>
                            </div>
                            <div className="settings-account-row">
                                <div className="settings-account-row-label">Видалити обліковий запис</div>
                                <div className="settings-account-row-desc">
                                    Якщо потрібно видалити обліковий запис, натисніть{" "}
                                    <button type="button" className="settings-link-btn settings-link-btn--danger"
                                        disabled={deletionLoading}
                                        onClick={() => setShowDeleteModal(true)}>
                                        «Видалити обліковий запис»
                                    </button>.
                                </div>
                            </div>
                        </div>
                    </section>

                    {showDeactivateModal && <DeactivateModal />}
                    {showDeleteModal && <DeleteModal />}
                </>
            )}

            {/* ── Stream Tab ── */}
            {activeTab === "stream" && (
                <>
                    <section className="settings-section">
                        <h2 className="settings-section-heading">Стрім</h2>
                        <p className="settings-hint">Використовуйте ці дані для налаштування OBS або іншого стрім-софту.</p>

                        <div className="settings-field">
                            <label>RTMP URL</label>
                            <div className="settings-stream-row">
                                <input type="text" readOnly value={rtmpUrl || "Завантаження..."} onClick={(e) => e.target.select()} />
                                <button type="button" className="settings-copy-btn"
                                    onClick={() => rtmpUrl && navigator.clipboard.writeText(rtmpUrl)}>
                                    Копіювати
                                </button>
                            </div>
                        </div>

                        <div className="settings-field">
                            <label>Ключ потоку (Stream Key)</label>
                            <div className="settings-stream-row">
                                <input type={showStreamKey ? "text" : "password"} readOnly
                                    value={streamKey || "Завантаження..."} onClick={(e) => e.target.select()} />
                                <button type="button" className="settings-copy-btn"
                                    onClick={() => setShowStreamKey((s) => !s)}>
                                    {showStreamKey ? "Сховати" : "Показати"}
                                </button>
                                <button type="button" className="settings-copy-btn"
                                    onClick={() => streamKey && navigator.clipboard.writeText(streamKey)}>
                                    Копіювати
                                </button>
                            </div>
                        </div>

                        <div className="settings-field">
                            <label htmlFor="stream-title">Назва стріму</label>
                            <input id="stream-title" type="text" value={streamTitle}
                                onChange={(e) => setStreamTitle(e.target.value)}
                                placeholder="Наприклад: Граємо в Minecraft" maxLength={200} />
                        </div>

                        <div className="settings-field">
                            <label htmlFor="stream-desc">Опис стріму</label>
                            <textarea id="stream-desc" value={streamDescription}
                                onChange={(e) => setStreamDescription(e.target.value)}
                                placeholder="Про що буде стрім..." maxWidth={2000} />
                            <div className="field-hint">{streamDescription.length} / 2000</div>
                        </div>

                        <button type="button" className="settings-btn settings-btn-primary"
                            style={{ marginTop: 8, width: "auto" }}
                            disabled={streamInfoSaving} onClick={handleSaveStreamInfo}>
                            {streamInfoSaving ? "Збереження…" : "Зберегти інфо стріму"}
                        </button>
                    </section>
                </>
            )}
        </div>
    );
}