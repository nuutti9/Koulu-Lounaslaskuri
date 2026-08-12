import React, { useState, useEffect } from 'react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: string;
  toggleTheme: () => void;
  user: any;
  schoolsList: any[];
  hasSubscription: boolean | null;
  defaultOpenFaq?: boolean;
}

export default function SettingsModal({ isOpen, onClose, theme, toggleTheme, user, schoolsList, hasSubscription, defaultOpenFaq }: SettingsModalProps) {
  const [isFaqOpen, setIsFaqOpen] = useState(false);
  const [isLoadingCheckout, setIsLoadingCheckout] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'yearly' | 'monthly'>('yearly');

  // Placeholder prices - user will provide actuals
  const MONTHLY_PRICE = "4,99 €";
  const YEARLY_PRICE = "24,99 €";
  const YEARLY_PER_MONTH_PRICE = "2,08 €";

  useEffect(() => {
    if (isOpen && defaultOpenFaq) {
      setIsFaqOpen(true);
    } else if (isOpen) {
      setIsFaqOpen(false);
    }
  }, [isOpen, defaultOpenFaq]);

  const handleSubscribe = async (priceId: string) => {
    setIsLoadingCheckout(true);
    try {
      const res = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ priceId }) });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Virhe: " + (data.error || "Tuntematon virhe"));
      }
    } catch (e) {
      alert("Virhe yhdistettäessä maksuvälittäjään.");
    } finally {
      setIsLoadingCheckout(false);
    }
  };
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.7)",
        backdropFilter: "blur(5px)",
        WebkitBackdropFilter: "blur(5px)",
        zIndex: 3000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: isOpen ? 1 : 0,
        pointerEvents: isOpen ? "auto" : "none",
        transition: "opacity 0.3s",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--secondary-bg)",
          width: "90%",
          maxWidth: 400,
          borderRadius: 24,
          padding: 24,
          position: "relative",
          border: "var(--ios-border)",
          transform: isOpen ? "scale(1)" : "scale(0.95)",
          transition: "transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)",
          maxHeight: "85vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            background: "var(--tertiary-bg)",
            border: "none",
            borderRadius: "50%",
            width: 32,
            height: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "var(--text)",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24, color: "var(--text)" }}>Asetukset</h2>

        {/* Theme Toggle */}
        <div style={{ marginBottom: 24, padding: 16, background: "var(--tertiary-bg)", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: "var(--text)" }}>Tumma tila</span>
          <div 
            onClick={toggleTheme}
            style={{ 
              width: 50, 
              height: 30, 
              background: theme === "dark" ? "var(--accent)" : "rgba(0,0,0,0.2)", 
              borderRadius: 15, 
              position: "relative", 
              cursor: "pointer",
              transition: "0.3s"
            }}
          >
            <div 
              style={{ 
                width: 26, 
                height: 26, 
                background: "#fff", 
                borderRadius: "50%", 
                position: "absolute", 
                top: 2, 
                left: theme === "dark" ? 22 : 2, 
                transition: "0.3s",
                boxShadow: "0 2px 5px rgba(0,0,0,0.2)"
              }}
            />
          </div>
        </div>

        {/* Subscription Info */}
        <div style={{ marginBottom: 24, padding: 16, background: "var(--tertiary-bg)", borderRadius: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: "var(--text)" }}>Tilaus & Tekoäly</h3>
          {user ? (
            hasSubscription ? (
              <p style={{ fontSize: 14, color: "var(--text-dim)", marginBottom: 12 }}>
                Tilauksesi on <strong style={{ color: "var(--accent)" }}>aktiivinen</strong>. Voit käyttää tekoälyä rajattomasti.
              </p>
            ) : (
              <>
                <p style={{ fontSize: 14, color: "var(--text-dim)", marginBottom: 16 }}>
                  Tilaa tekoälyominaisuudet käyttöösi, niin voit skannata ja tunnistaa ruoat automaattisesti!
                </p>
                <div style={{ display: "flex", gap: 12, flexDirection: "column" }}>
                  
                  {/* Yearly (Expandable) */}
                  <div 
                    onClick={() => setSelectedPlan('yearly')}
                    style={{ 
                      padding: 16, 
                      background: selectedPlan === 'yearly' ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.02)", 
                      borderRadius: 16, 
                      border: selectedPlan === 'yearly' ? "1px solid var(--accent)" : "1px solid var(--ios-border)", 
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      textAlign: "center"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, flexDirection: "column" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <h4 style={{ margin: 0, fontSize: 16, color: "var(--text)", fontWeight: 600 }}>Vuositilaus</h4>
                        <span style={{ background: "var(--accent)", color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, textTransform: "uppercase" }}>Suositeltu</span>
                      </div>
                      <div style={{ color: "var(--text-dim)", fontSize: 13, fontWeight: 500 }}>
                        {YEARLY_PRICE} / vuosi <span style={{ opacity: 0.7 }}>(vain {YEARLY_PER_MONTH_PRICE} / kk)</span>
                      </div>
                    </div>
                    
                    {selectedPlan === 'yearly' && (
                      <div style={{ marginTop: 12 }}>
                        <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--text-dim)", lineHeight: 1.4 }}>Rajaton tekoäly kokonaiseksi vuodeksi edullisemmin.</p>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSubscribe(process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID || ""); }}
                          disabled={isLoadingCheckout}
                          style={{ width: "100%", padding: "12px 16px", borderRadius: 12, background: "var(--accent)", color: "#fff", fontWeight: 600, border: "none", cursor: "pointer", opacity: isLoadingCheckout ? 0.7 : 1, fontSize: 15, transition: "0.2s" }}
                        >
                          {isLoadingCheckout ? "Avataan..." : "Tilaa Vuositilaus"}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Monthly (Expandable) */}
                  <div 
                    onClick={() => setSelectedPlan('monthly')}
                    style={{ 
                      padding: 16, 
                      background: selectedPlan === 'monthly' ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.02)", 
                      borderRadius: 16, 
                      border: selectedPlan === 'monthly' ? "1px solid var(--text-dim)" : "1px solid var(--ios-border)", 
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      textAlign: "center"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", flexDirection: "column", gap: 4 }}>
                      <h4 style={{ margin: 0, fontSize: 16, color: "var(--text)", fontWeight: 600 }}>Kuukausitilaus</h4>
                      <div style={{ color: "var(--text-dim)", fontSize: 13, fontWeight: 500 }}>{MONTHLY_PRICE} / kk</div>
                    </div>
                    
                    {selectedPlan === 'monthly' && (
                      <div style={{ marginTop: 12 }}>
                        <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--text-dim)", lineHeight: 1.4 }}>Maksa kuukausi kerrallaan. Peru milloin tahansa.</p>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSubscribe(process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID || ""); }}
                          disabled={isLoadingCheckout}
                          style={{ width: "100%", padding: "12px 16px", borderRadius: 12, background: "var(--text)", color: "var(--bg)", fontWeight: 600, border: "none", cursor: "pointer", opacity: isLoadingCheckout ? 0.7 : 1, fontSize: 15, transition: "0.2s" }}
                        >
                          {isLoadingCheckout ? "Avataan..." : "Tilaa Kuukausitilaus"}
                        </button>
                      </div>
                    )}
                  </div>
                  
                </div>
              </>
            )
          ) : (
            <p style={{ fontSize: 14, color: "var(--text-dim)", marginBottom: 12 }}>
              Kirjaudu sisään hallitaksesi tekoäly-tilaustasi.
            </p>
          )}
        </div>

        {/* FAQ Accordion */}
        <div>
          <button 
            onClick={() => setIsFaqOpen(!isFaqOpen)}
            style={{
              width: "100%",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "16px",
              background: "var(--tertiary-bg)",
              border: "none",
              borderRadius: isFaqOpen ? "16px 16px 0 0" : 16,
              color: "var(--text)",
              fontSize: 16,
              fontWeight: 600,
              cursor: "pointer",
              transition: "0.2s"
            }}
          >
            Tietoa sovelluksesta (FAQ)
            <svg 
              width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: isFaqOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "0.3s" }}
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
          
          {isFaqOpen && (
            <div style={{ padding: 16, background: "var(--tertiary-bg)", borderTop: "1px solid var(--ios-border)", borderRadius: "0 0 16px 16px" }}>
              {/* Tekoälyn hyödyt */}
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 15, color: "var(--text)", marginBottom: 8 }}>Mitä hyötyä tekoälystä on?</h3>
                <p style={{ fontSize: 13, color: "var(--text-dim)", lineHeight: 1.5 }}>
                  Tekoälyn avulla sinun ei tarvitse kantaa ruokavaakaa kouluun! Voit vain ottaa kuvan annoksestasi tai kuvailla sitä sanallisesti, ja tekoäly arvioi automaattisesti lautasellasi olevan ruoan grammamäärän. Tämä tekee makrojen ja kaloreiden seurannasta nopeaa ja helppoa, sillä arvioidut ruoat yhdistetään suoraan koulusi viralliseen ruokalistaan ja ravintosisältöihin.
                </p>
              </div>

              {/* Mihin tiedot perustuvat */}
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 15, color: "var(--text)", marginBottom: 8 }}>Mihin tiedot perustuvat?</h3>
                <p style={{ fontSize: 13, color: "var(--text-dim)", lineHeight: 1.5 }}>
                  Otamme tiedot suoraan koulujen virallisilta ruokalistoilta.
                </p>
              </div>

              {/* SEO Links */}
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", marginBottom: 12 }}>Tuetut koulut ja ruokalistat</h2>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, fontSize: 13 }}>
                  {schoolsList.map((school, i) => (
                    <a key={i} href={`/?school=${school.id}`} style={{ color: "var(--text-dim)", textDecoration: "none", padding: "4px 8px", background: "rgba(255,255,255,0.05)", borderRadius: 8 }}>
                      {school.name} ruokalista
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
