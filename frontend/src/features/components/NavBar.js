import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { getUploadsBaseUrl, fetchAPI } from "../../services/api";
import "../../styles/NavBar.css";
import { useChat } from "../../context/chatContext";
import { authService } from "../../services/authService";

function useWindowWidth() {
  const [width, setWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1024);
  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return width;
}

export default function NavBar({ user, onUserUpdate }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchInput, setSearchInput] = useState("");
    const width = useWindowWidth();
    const isMobile = width < 768;
    const { isChatOpen, socket } = useChat();

    const searchParams = new URLSearchParams(location.search || "");
    const isFollowing = searchParams.get("feed") === "subscriptions" && location.pathname === "/";
    const isRecommendations = location.pathname === "/" && !searchParams.get("feed") && !searchParams.get("q");
    const isSearch = location.pathname === "/" && !!searchParams.get("q") || location.pathname === "/search";
    const isChat = location.pathname === "/chat" || location.pathname.startsWith("/chat");
    const isProfile = location.pathname === "/profile" || location.pathname.startsWith("/profile");

    const handleSearch = (e) => {
        e.preventDefault();
        const q = searchInput.trim();
        if (q) {
            navigate(`/?q=${encodeURIComponent(q)}`);
            setSearchInput("");
        } else {
            navigate("/");
        }
    };

    const profilePath = "/profile";
    const avatarSrc = user?.avatar_url ? getUploadsBaseUrl() + user.avatar_url : null;

    // Realtime update of avatar_url in navbar (other tabs).
    useEffect(() => {
        if (!socket || !user?.user_id || !onUserUpdate) return;

        const handler = async ({ userId } = {}) => {
            if (String(userId) !== String(user?.user_id)) return;
            try {
                const me = await fetchAPI("/users/me", { method: "GET" });
                if (!me) return;

                onUserUpdate((prev) => ({ ...(prev || {}), ...me }));
                const stored = authService.getCurrentUser() || {};
                localStorage.setItem("user", JSON.stringify({ ...stored, ...me }));
            } catch (err) {
                // fetchAPI already clears token for auth-related failures.
                console.error("Failed to refresh user after avatar update", err);
            }
        };

        socket.on("user_profile_changed", handler);
        return () => socket.off("user_profile_changed", handler);
    }, [socket, user?.user_id, onUserUpdate]);

    if (!user) return null;

    // ===== МОБІЛЬНИЙ НАВБАР (знизу) =====
    if (isMobile) {
        return (
            <nav className="mobile-navbar">
                {/* Головна */}
                <Link
                    to="/"
                    className={`mobile-nav-item ${isRecommendations ? "active" : ""}`}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                        <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                    <span>Головна</span>
                </Link>

                {/* Пошук */}
                <Link
                    to="/?search=1"
                    className={`mobile-nav-item ${isSearch ? "active" : ""}`}
                    onClick={(e) => {
                        e.preventDefault();
                        // Якщо вже на головній — просто скидаємо до пошуку
                        navigate("/");
                        // Очищаємо параметри щоб показати мобільний пошук
                        setTimeout(() => navigate("/?mobile-search=1"), 0);
                    }}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.35-4.35" />
                    </svg>
                    <span>Пошук</span>
                </Link>

                {/* Кнопка додати (центральна) */}
                <button
                    type="button"
                    className="mobile-nav-add"
                    onClick={() => navigate("/upload")}
                    aria-label="Завантажити"
                >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 5v14M5 12h14" />
                    </svg>
                </button>

                {/* Чат */}
                <button
                    type="button"
                    className={`mobile-nav-item ${isChatOpen ? "active" : ""}`}
                    onClick={() => window.dispatchEvent(new Event("openChatPanel"))}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    <span>Чат</span>
                </button>

                {/* Профіль */}
                <Link
                    to={profilePath}
                    className={`mobile-nav-item ${isProfile ? "active" : ""}`}
                >
                    {avatarSrc ? (
                        <img src={avatarSrc} alt="" className="mobile-nav-avatar" />
                    ) : (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                        </svg>
                    )}
                    <span>Профіль</span>
                </Link>
            </nav>
        );
    }

    // ===== ДЕСКТОПНИЙ НАВБАР =====
    return (
        <nav className="navbar">
            <div className="navbar-left">
                <Link to="/" className="navbar-logo" aria-label="Головна">
                    <img src="/logo-cut.svg" alt="Logo" className="navbar-logo-img" />
                </Link>
                <Link
                    to="/?feed=subscriptions"
                    className={"navbar-link" + (isFollowing ? " active" : "")}
                >
                    Відстежуванні
                </Link>
                <Link
                    to="/"
                    className={"navbar-link" + (isRecommendations ? " active" : "")}
                >
                    Рекомендації
                </Link>
            </div>

            <form className="navbar-search" onSubmit={handleSearch}>
                <input
                    type="text"
                    placeholder="Пошук..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="navbar-search-input"
                />
                <button type="submit" className="navbar-search-btn" aria-label="Пошук">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.35-4.35" />
                    </svg>
                </button>
            </form>

            <div className="navbar-right">
                <button
                    type="button"
                    className={`navbar-icon-btn ${isChatOpen ? "active" : ""}`}
                    aria-label="Чат"
                    onClick={() => window.dispatchEvent(new Event("openChatPanel"))}
                >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                </button>
                <button
                    type="button"
                    className="navbar-icon-btn"
                    aria-label="Сповіщення"
                >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                </button>
                <Link to={profilePath} className="navbar-profile-link" aria-label="Профіль">
                    {avatarSrc ? (
                        <img src={avatarSrc} alt="" className="navbar-profile" />
                    ) : (
                        <span className="navbar-profile-placeholder">?</span>
                    )}
                </Link>
            </div>
        </nav>
    );
}