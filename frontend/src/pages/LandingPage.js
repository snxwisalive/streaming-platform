import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaApple, FaDiscord, FaXbox, FaPlaystation } from "react-icons/fa";
import "../styles/LandingPage.css";

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

export default function LandingPage() {
  const navigate = useNavigate();
  const width = useWindowWidth();
  const isMobile = width < 768;
  const [mobileStarted, setMobileStarted] = useState(false);

  return (
    <div className="landing-container">

      {isMobile ? (
        // ===== МОБІЛЬНА ВЕРСІЯ =====
        <div className="mobile-layout">

          {!mobileStarted ? (
            // Початковий екран — зірка + текст + кнопка Розпочати
            <>
              <div className="star-background" />
              <div className="mobile-top" />

              <div className="mobile-content">
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

              <div className="mobile-footer">
                <button
                  className="start-button"
                  onClick={() => setMobileStarted(true)}
                >
                  <span>Розпочати</span>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M7 17L17 7M17 7H7M17 7v10"/>
                  </svg>
                </button>
              </div>
            </>
          ) : (
            // Екран після натискання — новий текст + кнопки авторизації
            <div className="mobile-auth-screen">
              <p className="auth-screen-label">Ми знайшли для вас щось цікаве! Але для початку треба увійти.</p>

              <div className="mobile-auth">
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="login-button"
                >
                  Увійти
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/register")}
                  className="register-button"
                >
                  Реєстрація
                </button>

                <div className="social-buttons">
                  <button className="social-button apple">  <FaApple size={26} color="#fff" />  </button>
                  <button className="social-button discord"><FaDiscord size={26} color="#fff" /></button>
                  <button className="social-button xbox">   <FaXbox size={26} color="#fff" />   </button>
                  <button className="social-button playstation"><FaPlaystation size={26} color="#fff" /></button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        // ===== ДЕСКТОПНА ВЕРСІЯ =====
        <>
          <div className="star-background" />

          <div className="landing-left">
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

          <div className="landing-right">
            <div className="auth-buttons">
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="login-button"
              >
                Увійти
              </button>
              <button
                type="button"
                onClick={() => navigate("/register")}
                className="register-button"
              >
                Реєстрація
              </button>
            </div>

            <div className="social-buttons">
                  <button className="social-button apple">  <FaApple size={26} color="#fff" />  </button>
                  <button className="social-button discord"><FaDiscord size={26} color="#fff" /></button>
                  <button className="social-button xbox">   <FaXbox size={26} color="#fff" />   </button>
                  <button className="social-button playstation"><FaPlaystation size={26} color="#fff" /></button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}