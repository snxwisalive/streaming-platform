import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import HomePage from "./pages/HomePage";
import ProfilePage from "./pages/ProfilePage";
import LivePage from "./pages/LivePage";
import StreamPage from "./pages/StreamPage";
import SettingsPage from "./pages/SettingsPage";
import { authService } from "./services/authService";
import { fetchAPI } from "./services/api";
import UploadVideoPage from "./pages/UploadVideoPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import VerifyCodePage from "./pages/VerifyCodePage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import { ChatProvider } from "./context/chatContext";
import FloatingChatButton from "./features/components/FloatingChatButton";
import NavBar from "./features/components/NavBar";
import Sidebar from "./features/components/Sidebar";
import LandingPage from "./pages/LandingPage";
import ReactivatePage from "./pages/ReactivatePage";
import DeleteAccountPage from "./pages/DeleteAccountPage";

const AUTH_PATHS = ["/login", "/register", "/password-reset"];

function isAuthPath(pathname) {
    return AUTH_PATHS.some((path) => pathname.startsWith(path));
}

function ChatComponents({ user }) {
    const location = useLocation();
    if (!user || isAuthPath(location.pathname)) return null;
    return <FloatingChatButton />;
}

function LayoutWithNav({ user, children, onUserUpdate }) {
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = React.useState(true);
    const showNav = user && !isAuthPath(location.pathname);
    return (
        <div className="app-layout">
            {showNav && <NavBar user={user} onUserUpdate={onUserUpdate} />}
            {showNav ? (
                <div className="app-body">
                    <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen((o) => !o)} />
                    <main className="app-main">{children}</main>
                </div>
            ) : (
                children
            )}
        </div>
    );
}

export default function App() {
    const [user, setUser] = useState(() => authService.getCurrentUser());

    useEffect(() => {
        const handleStorage = () => setUser(authService.getCurrentUser());
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    // Після логіну / перезавантаження оновлюємо дані користувача з бекенду,
    // щоб у стейті (і навбарі) були актуальні avatar_url тощо.
    useEffect(() => {
        const token = authService.getToken?.();
        if (!token) return;

        (async () => {
            try {
                const me = await fetchAPI("/users/me", { method: "GET" });
                if (me) {
                    setUser((prev) => ({ ...(prev || {}), ...me }));
                    const stored = authService.getCurrentUser() || {};
                    localStorage.setItem("user", JSON.stringify({ ...stored, ...me }));
                }
            } catch (err) {
                console.error("Failed to refresh current user", err);
            }
        })();
    }, []);

    return (
        <ChatProvider>
            <Router>
                <LayoutWithNav user={user} onUserUpdate={setUser}>
                    <Routes>
                        <Route path="/login" element={<LoginPage onLogin={(u) => setUser(u)} />} />
                        <Route path="/register" element={<RegisterPage onRegister={(u) => setUser(u)} />} />
                        <Route path="/profile/:userId" element={<ProfilePage />} />
                        <Route path="/profile" element={user ? <ProfilePage /> : <Navigate to="/login" replace />} />
                        <Route path="/settings" element={user ? <SettingsPage onProfileUpdate={setUser} onLogout={() => setUser(null)} /> : <Navigate to="/login" replace />} />
                        <Route path="/reactivate" element={<ReactivatePage onLogin={setUser} />} />
                        <Route path="/delete-account" element={<DeleteAccountPage onLogin={setUser} onLogout={() => setUser(null)} />} />
                        <Route path="/live" element={<LivePage />} />
                        <Route path="/stream/:userId" element={<StreamPage />} />
                        <Route path="/upload" element={<UploadVideoPage />} />
                        <Route path="/" element={user ? <HomePage user={user} /> : <LandingPage />} />
                        <Route path="/password-reset" element={<ForgotPasswordPage />} />
                        <Route path="/password-reset/verify" element={<VerifyCodePage />} />
                        <Route path="/password-reset/new-password" element={<ResetPasswordPage />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </LayoutWithNav>
                <ChatComponents user={user} />
            </Router>
        </ChatProvider>
    );
}