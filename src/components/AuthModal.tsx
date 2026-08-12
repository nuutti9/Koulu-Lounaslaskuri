"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";

export default function AuthModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const supabase = createClient();

  if (!isOpen) return null;

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        onClose();
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setErrorMsg("Tarkista sähköpostisi vahvistaaksesi tilin.");
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.7)",
        backdropFilter: "blur(10px)",
        zIndex: 5000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        className="custom-alert-box"
        style={{
          width: "100%",
          maxWidth: 340,
          background: "var(--secondary-bg)",
          padding: 24,
          textAlign: "left",
          position: "relative",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            background: "transparent",
            border: "none",
            color: "var(--text-dim)",
            cursor: "pointer",
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <h2 style={{ marginBottom: 12, fontSize: 22, fontWeight: 800 }}>
          {isLogin ? "Kirjaudu sisään" : "Luo tili"}
        </h2>

        <div style={{ marginBottom: 24, padding: "10px 14px", background: "linear-gradient(135deg, rgba(0,122,255,0.15) 0%, rgba(0,122,255,0.05) 100%)", borderRadius: 12, border: "1px solid var(--accent)", color: "var(--text)", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18 }}>🎁</span> Jatka Googlella, saat 3 ilmaista tekoäly-analyysiä!
        </div>

        {errorMsg && (
          <div style={{ color: "var(--p)", fontSize: 13, marginBottom: 16, background: "rgba(255, 59, 48, 0.1)", padding: 10, borderRadius: 8 }}>
            {errorMsg}
          </div>
        )}

        <button
          onClick={handleGoogleAuth}
          style={{
            width: "100%",
            background: "var(--tertiary-bg)",
            color: "var(--text)",
            border: "var(--ios-border)",
            borderRadius: 14,
            padding: "14px 16px",
            fontSize: 16,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            marginBottom: 16,
            transition: "background 0.2s"
          }}
          onMouseOver={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
          onMouseOut={(e) => e.currentTarget.style.background = "var(--tertiary-bg)"}
        >
          <svg width="22" height="22" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.7 17.74 9.5 24 9.5z"></path>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
            <path fill="none" d="M0 0h48v48H0z"></path>
          </svg>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            Jatka Googlella
            <span style={{ fontSize: 11, background: "rgba(255,255,255,0.15)", padding: "3px 8px", borderRadius: 10, fontWeight: 800, textTransform: "uppercase" }}>3 Ilmaista</span>
          </div>
        </button>

        <div style={{ textAlign: "center", color: "var(--text-dim)", fontSize: 13, marginBottom: 16 }}>tai sähköpostilla</div>

        <form onSubmit={handleEmailAuth} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            type="email"
            placeholder="Sähköposti"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="school-search-input"
            style={{ marginBottom: 0, padding: "12px 16px", fontSize: 15 }}
            required
          />
          <input
            type="password"
            placeholder="Salasana"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="school-search-input"
            style={{ marginBottom: 0, padding: "12px 16px", fontSize: 15 }}
            required
          />
          <button type="submit" className={`btn-primary ${loading ? "loading" : ""}`} style={{ marginTop: 8 }}>
            {isLogin ? "Kirjaudu" : "Rekisteröidy"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 20, fontSize: 14 }}>
          <span style={{ color: "var(--text-dim)" }}>
            {isLogin ? "Eikö sinulla ole tiliä? " : "Onko sinulla jo tili? "}
          </span>
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setErrorMsg(null);
            }}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--accent)",
              fontWeight: 700,
              cursor: "pointer",
              padding: 0,
              fontSize: 14,
            }}
          >
            {isLogin ? "Luo tili" : "Kirjaudu"}
          </button>
        </div>
      </div>
    </div>
  );
}
