import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import LoginForm from "../features/components/LoginForm";
import "../styles/LoginPage.css";

function useWindowWidth() {
  const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return width;
}

export default function LoginPage({ onLogin }) {
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const width = useWindowWidth();
  const isMobile = width < 768;

  const handleSuccess = (data) => {
    const user = data?.user || data;
    onLogin?.(user);
    if (data?.reactivated) {
      window.alert("Ваш акаунт було відновлено");
    }
    navigate("/");
  };

  const handleError = (msg) => {
    const m = String(msg || "");
    if (m === "account_deactivated") {
      navigate("/reactivate");
      return;
    }
    setError(msg);
  };

  if (isMobile) {
    // ===== МОБІЛЬНА ВЕРСІЯ =====
    return (
      <div className="login-mobile-container">
        {/* Назад */}
        <button className="login-mobile-back" onClick={() => navigate("/")}>
          <svg width="8" height="14" viewBox="0 0 8 14" fill="none">
            <path d="M7 1L1 7L7 13" stroke="#0C0C0C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Назад до першого екрана
        </button>

        {/* Заголовок */}
        <h1 className="login-mobile-title">Увійти</h1>

        {/* Форма */}
        {error && <div className="error">{error}</div>}
        <LoginForm onSuccess={handleSuccess} onError={handleError} />

        {/* Дії */}
        <div className="login-mobile-actions">
          <button
            type="button"
            className="login-forgot-btn"
            onClick={() => navigate("/password-reset")}
          >
            Забули пароль?
          </button>
          <button type="submit" form="login-form" className="submit-btn">
            Увійти
          </button>
        </div>

        <p className="login-register-text" style={{ marginTop: '16px' }}>
          Не маєте акаунту? <Link to="/register">Зареєструватися</Link>
        </p>
      </div>
    );
  }

  // ===== ДЕСКТОПНА ВЕРСІЯ =====
  return (
    <div className="loginContainer">
      <div className="star-background"/>
      <div className="login-left">
        <div className="text-content">
          <h1 className="main-title">
            Стань<br />
            частиною<br />
            живого<br />
            моменту.
          </h1>
          <p className="subtitle">
            Твій простір для живого відео.<br />
            Разом із мільйонами однодумців.
          </p>
        </div>
      </div>
      <div className="login-right">
        <img src="/logo-full.svg" alt="Logo" className="login-logo" />
        {error && <div className="error">{error}</div>}
        <h1 className="login-right-title">Увійти</h1>
        <LoginForm onSuccess={handleSuccess} onError={handleError} />
        <div className="login-actions">
          <button type="button" className="login-forgot-btn" onClick={() => navigate("/password-reset")}>
            Забули пароль?
          </button>
          <button type="submit" form="login-form" className="submit-btn">
            Увійти
          </button>
        </div>
        <p className="login-register-text">
          Не маєте акаунту? <Link to="/register">Зареєструватися</Link>
        </p>
      </div>
    </div>
  );
}