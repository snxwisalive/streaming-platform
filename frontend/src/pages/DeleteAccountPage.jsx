import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { fetchAPI } from "../services/api";
import "../styles/SettingsPage.css";

export default function DeleteAccountPage({ onLogin, onLogout }) {
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
            // To call DELETE /users/me/delete we need an auth token.
            // For deactivated accounts we first reactivate via credentials.
            const reactivate = await fetchAPI("/users/me/reactivate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: { email, password },
            });

            if (!reactivate?.token || !reactivate?.user) {
                throw new Error("Не вдалося підготувати видалення акаунту.");
            }

            localStorage.setItem("token", reactivate.token);
            localStorage.setItem("user", JSON.stringify(reactivate.user));
            onLogin?.(reactivate.user);

            const resp = await fetchAPI("/users/me/delete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: { password },
            });

            const deletionDate = resp?.deletion_date ? new Date(resp.deletion_date) : null;
            if (deletionDate) {
                window.alert(`Акаунт буде видалено через 30 днів (${deletionDate.toLocaleDateString("uk-UA")}).`);
            } else {
                window.alert("Акаунт буде видалено через 30 днів.");
            }

            localStorage.removeItem("token");
            localStorage.removeItem("user");
            onLogout?.();
            navigate("/login");
        } catch (err) {
            setError(err.message || "Не вдалося видалити акаунт.");
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
                <h1 style={{ margin: 0, fontSize: 20 }}>Видалити акаунт</h1>
                <p style={{ marginTop: 10, color: "#666", fontSize: 14 }}>
                    Акаунт буде видалено через 30 днів. Підтвердіть дані для входу.
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
                        className="settings-btn settings-btn-danger"
                        style={{ width: "100%" }}
                        disabled={loading}
                    >
                        {loading ? "Підготовка..." : "Видалити назавжди"}
                    </button>

                    <div style={{ marginTop: 12, textAlign: "center" }}>
                        <Link to="/reactivate" style={{ color: "#6046F6", fontWeight: 600, textDecoration: "none" }}>
                            Назад
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}

