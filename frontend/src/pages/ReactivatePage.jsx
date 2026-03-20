import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { fetchAPI } from "../services/api";
import "../styles/SettingsPage.css";

export default function ReactivatePage({ onLogin }) {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (loading) return;
        setError(null);
        setLoading(true);
        try {
            const data = await fetchAPI("/users/me/reactivate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: { email, password },
            });

            if (data?.token && data?.user) {
                localStorage.setItem("token", data.token);
                localStorage.setItem("user", JSON.stringify(data.user));
                onLogin?.(data.user);
                navigate("/");
            } else {
                throw new Error("Reactivation failed");
            }
        } catch (err) {
            setError(err.message || "Не вдалося відновити акаунт.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            style={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 16,
                background: "#FAFAFA",
                fontFamily: "inherit",
                color: "#1f1f23",
            }}
        >
            <div
                style={{
                    width: "100%",
                    maxWidth: 420,
                    background: "#fff",
                    borderRadius: 12,
                    padding: 18,
                    boxShadow: "0 10px 24px rgba(0,0,0,0.06)",
                }}
            >
                <h1 style={{ margin: 0, fontSize: 20 }}>Ваш акаунт деактивовано</h1>
                <p style={{ marginTop: 10, color: "#666", fontSize: 14 }}>
                    Щоб відновити акаунт, введіть свої дані для входу
                </p>

                {error && <div className="settings-error-box" style={{ marginTop: 12 }}>{error}</div>}

                <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
                    <div style={{ marginBottom: 12 }}>
                        <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600 }}>Email</label>
                        <input
                            className="s-input"
                            style={{ width: "100%" }}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            type="email"
                            required
                            placeholder="example@email.com"
                        />
                    </div>
                    <div style={{ marginBottom: 12 }}>
                        <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600 }}>Пароль</label>
                        <input
                            className="s-input"
                            style={{ width: "100%" }}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            type="password"
                            required
                            placeholder="Пароль"
                        />
                    </div>

                    <button
                        type="submit"
                        className="settings-btn settings-btn-primary"
                        style={{ width: "100%" }}
                        disabled={loading}
                    >
                        {loading ? "Відновлення..." : "Відновити акаунт"}
                    </button>

                    <div style={{ marginTop: 12, textAlign: "center" }}>
                        <Link to="/delete-account" style={{ color: "#6046F6", fontWeight: 600, textDecoration: "none" }}>
                            Натомість видалити акаунт
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}

