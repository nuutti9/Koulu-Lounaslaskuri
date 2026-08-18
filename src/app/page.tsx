"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import AuthModal from "@/components/AuthModal";
import SettingsModal from "@/components/SettingsModal";
import { User } from "@supabase/supabase-js";

declare global {
  interface Window {
    CONFIG?: { API_KEY: string };
  }
}

type MealData = {
  name: string;
  kcal: number;
  p: number;
  h: number;
  r: number;
};

function useCountUp(end: number, duration: number = 800) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    let animationFrame: number;
    const startValue = count;
    
    if (startValue === end) return;
    
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCount(Math.round(startValue + (end - startValue) * ease));
      
      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(step);
      } else {
        setCount(end);
      }
    };
    
    animationFrame = window.requestAnimationFrame(step);
    
    return () => {
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
    };
  }, [end]);

  return count;
}

export default function Home() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [schoolsList, setSchoolsList] = useState<any[]>([]);
  const [activeMenuData, setActiveMenuData] = useState<any[] | null>(null);
  const [isLoadingMenu, setIsLoadingMenu] = useState(false);
  
  const [currentSchoolId, setCurrentSchoolId] = useState<string | null>(null);
  const [currentDateIndex, setCurrentDateIndex] = useState<number>(0);
  const [tempSelectedSchool, setTempSelectedSchool] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [aiInput, setAiInput] = useState("");
  const [uploadedImageData, setUploadedImageData] = useState<string | null>(null);
  
  // Persist AI input state across OAuth redirects
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedInput = sessionStorage.getItem("aiInput");
      if (savedInput) setAiInput(savedInput);
      
      const savedImage = sessionStorage.getItem("aiImage");
      if (savedImage) setUploadedImageData(savedImage);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("aiInput", aiInput);
    }
  }, [aiInput]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (uploadedImageData) {
        try {
          sessionStorage.setItem("aiImage", uploadedImageData);
        } catch (e) {
          console.warn("Could not save image to sessionStorage (likely too large)");
        }
      } else {
        sessionStorage.removeItem("aiImage");
      }
    }
  }, [uploadedImageData]);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const aiAbortControllerRef = useRef<AbortController | null>(null);

  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const [confirmData, setConfirmData] = useState<{ msg: string; onConfirm: () => void } | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [isHeaderScrolled, setIsHeaderScrolled] = useState(false);
  const [isDateMenuOpen, setIsDateMenuOpen] = useState(false);

  const [foodQuantities, setFoodQuantities] = useState<Record<number, string>>({});

  const [user, setUser] = useState<User | null>(null);
  const [hasSubscription, setHasSubscription] = useState<boolean | null>(null);
  const [freeAnalysesUsed, setFreeAnalysesUsed] = useState<number>(0);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [openFaqSettings, setOpenFaqSettings] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const supabase = createClient();

  const checkSubscription = async (userId: string) => {
    const { data } = await supabase.from('subscriptions').select('status, free_analyses_used').eq('user_id', userId).maybeSingle();
    setHasSubscription(data?.status === 'active');
    setFreeAnalysesUsed(data?.free_analyses_used || 0);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) checkSubscription(session.user.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
          setUser(session?.user ?? null);
          setIsAuthModalOpen(false);
          if (session?.user) checkSubscription(session.user.id);
          // Close the window if it's the OAuth popup
          if (typeof window !== "undefined" && window.name === 'GoogleLogin') {
            window.close();
          }
        } else if (event === "SIGNED_OUT") {
          setUser(null);
          setHasSubscription(false);
        }
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  const dateMenuRef = useRef<HTMLDivElement>(null);
  const dateDropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedTheme = (localStorage.getItem("kr_theme") as "light" | "dark") || "dark";
    setTheme(savedTheme);
    document.documentElement.setAttribute("data-theme", savedTheme);

    async function init() {
      try {
        let loadedSchools = [];
        const sr = await fetch("/schools.json");
        if (sr.ok) {
          loadedSchools = await sr.json();
          setSchoolsList(loadedSchools);
        }

        const urlParams = new URLSearchParams(window.location.search);
        const urlSchoolId = urlParams.get("school");
        
        let storedSchoolId = localStorage.getItem("kr_school_id");
        
        if (urlSchoolId && loadedSchools.find((s: any) => s.id === urlSchoolId)) {
          storedSchoolId = urlSchoolId;
          localStorage.setItem("kr_school_id", urlSchoolId);
        }

        if (!storedSchoolId || !loadedSchools.find((s: any) => s.id === storedSchoolId)) {
          setShowWelcome(true);
        } else {
          setCurrentSchoolId(storedSchoolId);
        }
      } catch (e) {
        console.error("Error init:", e);
      }
    }
    init();
  }, []);

  // Fetch menu data live when school changes
  useEffect(() => {
    if (!currentSchoolId) return;
    let cancelled = false;
    setIsLoadingMenu(true);
    setActiveMenuData(null);
    setCurrentDateIndex(0);
    
    fetch(`/api/menu?school=${encodeURIComponent(currentSchoolId)}`)
      .then(res => res.json())
      .then(data => {
        if (!cancelled) {
          setActiveMenuData(Array.isArray(data) ? data : []);
          setIsLoadingMenu(false);
        }
      })
      .catch(err => {
        console.error("Menu fetch error:", err);
        if (!cancelled) {
          setActiveMenuData([]);
          setIsLoadingMenu(false);
        }
      });
    
    return () => { cancelled = true; };
  }, [currentSchoolId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dateMenuRef.current &&
        !dateMenuRef.current.contains(event.target as Node) &&
        dateDropdownRef.current &&
        !dateDropdownRef.current.contains(event.target as Node)
      ) {
        setIsDateMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("kr_theme", newTheme);
    vibrateHaptic(50);
  };

  const vibrateHaptic = (pattern: number | number[] = 50) => {
    if (navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {}
    }
  };

  const activeSchool = schoolsList.find((s) => s.id === currentSchoolId);

  const mealData: MealData[] = useMemo(() => {
    if (!activeMenuData || !activeMenuData[currentDateIndex]) return [];
    
    const dayData = activeMenuData[currentDateIndex];
    const items: MealData[] = [];

    // Aromi parsing (Helsinki schools)
    if (dayData?.meals) {
      dayData.meals.forEach((meal: any) => {
        if (meal.dishes) {
          meal.dishes.forEach((dish: any) => {
            items.push({
              name: dish.name || 'Tuntematon',
              kcal: meal.macros?.kcal || 0,
              p: meal.macros?.p || 0,
              h: meal.macros?.h || 0,
              r: meal.macros?.r || 0,
            });
          });
        }
      });
    }
    // Poweresta parsing
    else if (dayData?.data?.mealOptions) {
      dayData.data.mealOptions.forEach((option: any) => {
        if (option.rows) {
          option.rows.forEach((row: any) => {
            const factors = row.nutritiveItem?.factors || [];
            const getVal = (lbl: string, isK: boolean = false) => {
              const f = factors.find(
                (fact: any) =>
                  fact.nutritiveFactorNames?.[0]?.name === (isK ? "Energia" : lbl) &&
                  (!isK || fact.values?.[0]?.value100?.includes("kcal"))
              );
              if (!f) return 0;
              const valStr = f.values?.[0]?.value100;
              if (!valStr) return 0;
              if (isK) {
                const match = valStr.match(/([\d,.]+)\s*kcal/i);
                if (match) return parseFloat(match[1].replace(',', '.'));
              }
              const match = valStr.match(/([\d,.]+)/);
              return match ? parseFloat(match[1].replace(',', '.')) : 0;
            };
            items.push({
              name: (row.names?.[0]?.name || 'Tuntematon').replace(/:$/, ''),
              kcal: getVal("Energia", true),
              p: getVal("Proteiini"),
              h: getVal("Hiilihydraatit"),
              r: getVal("Rasva"),
            });
          });
        }
      });
    }

    if (items.length === 0) return [];

    const extraItems = [
      { name: "Kasvirasva", kcal: 540, p: 0.1, h: 0.5, r: 60 },
      { name: "Rasvaton maito", kcal: 33, p: 3.3, h: 4.8, r: 0 },
      { name: "Maito", kcal: 46, p: 3.3, h: 4.8, r: 1.5 },
      { name: "Piimä", kcal: 33, p: 3.3, h: 4.8, r: 0 },
      { name: "Ketsuppi", kcal: 110, p: 1.5, h: 25, r: 0 },
      { name: "Sinappi", kcal: 150, p: 5.5, h: 15, r: 5 },
      { name: "Thousand island salaatinkastike", kcal: 370, p: 1, h: 10, r: 35 },
      { name: "Koulunäkki", kcal: 360, p: 10, h: 60, r: 2.5 },
      { name: "Koulu kuntonäkki", kcal: 360, p: 10, h: 60, r: 2.5 },
      { name: "Leipä", kcal: 250, p: 8, h: 50, r: 3 },
      { name: "Levite", kcal: 450, p: 0.5, h: 0.5, r: 50 },
      { name: "Juomat", kcal: 20, p: 1.5, h: 3, r: 0 },
    ];
    
    return [...items, ...extraItems];
  }, [activeMenuData, currentDateIndex]);

  // Reset inputs when day or school changes
  useEffect(() => {
    setFoodQuantities({});
  }, [currentSchoolId, currentDateIndex]);

  let totalKcal = 0;
  let totalP = 0;
  let totalH = 0;
  let totalR = 0;

  mealData.forEach((item, i) => {
    const val = parseFloat(foodQuantities[i] || "0");
    if (val > 0) {
      totalKcal += (val * item.kcal) / 100;
      totalP += (val * item.p) / 100;
      totalH += (val * item.h) / 100;
      totalR += (val * item.r) / 100;
    }
  });

  const rtK = Math.round(totalKcal);
  const rtP = Math.round(totalP);
  const rtH = Math.round(totalH);
  const rtR = Math.round(totalR);

  const animK = useCountUp(rtK);
  const animP = useCountUp(rtP);
  const animH = useCountUp(rtH);
  const animR = useCountUp(rtR);

  const handleDateChange = (idx: number) => {
    setCurrentDateIndex(idx);
    setIsDateMenuOpen(false);
  };

  const handleSchoolSelect = () => {
    if (!tempSelectedSchool) {
      setAlertMsg("Valitse ensin koulu listasta.");
      return;
    }
    setCurrentSchoolId(tempSelectedSchool);
    localStorage.setItem("kr_school_id", tempSelectedSchool);
    window.history.replaceState(null, "", "?school=" + tempSelectedSchool);
    setShowWelcome(false);
    setCurrentDateIndex(0);
  };

  const openWelcomeScreen = () => {
    setTempSelectedSchool(currentSchoolId);
    setSearchQuery("");
    setShowWelcome(true);
  };

  const handlePreviewImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setUploadedImageData(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setUploadedImageData(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    vibrateHaptic(20);
  };

  const runAI = async () => {
    setIsAnalyzing(true);
    aiAbortControllerRef.current = new AbortController();

    try {
      let imageData = null;
      let mimeType = null;
      
      if (uploadedImageData) {
        mimeType = uploadedImageData.match(/data:(.*?);/)?.[1] || null;
        imageData = uploadedImageData.split(",")[1];
      }

      const resp = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          text: aiInput, 
          imageData, 
          mimeType,
          menuItems: mealData.map((m) => m.name)
        }),
        signal: aiAbortControllerRef.current.signal,
      });

      const d = await resp.json();
      if (!resp.ok) {
        if (resp.status === 403) {
          setHasSubscription(false);
          setFreeAnalysesUsed(3);
        }
        throw new Error(d.error || "Tekoäly ei osannut analysoida kuvaa tai tekstiä kunnolla.");
      }

      if (d.freeAnalysesRemaining !== undefined && d.freeAnalysesRemaining !== null) {
        setFreeAnalysesUsed(3 - d.freeAnalysesRemaining);
      }

      const results = d;

      let anyFound = false;
      const newQuantities = { ...foodQuantities };

      if (results.menuResults) {
        mealData.forEach((item, i) => {
          const val = results.menuResults[item.name] || 0;
          if (val > 0) {
            newQuantities[i] = val.toString();
            anyFound = true;
          }
        });
        setFoodQuantities(newQuantities);
      }

      if (anyFound) {
        vibrateHaptic([100, 50, 100]);
        if (results.notFound && results.notFound.length > 0) {
          setAlertMsg('Analyysi valmis!\n\nSeuraavia ruokia ei löytynyt valikosta ja ne jätettiin pois:\n' + results.notFound.join(', '));
        }
      } else {
        vibrateHaptic([200, 100, 200]);
        let msg = "Kuvasta tai tekstistä ei tunnistettu yhtään ruokaa joka kuuluisi koulun valikkoon.";
        if (results.notFound && results.notFound.length > 0) {
          msg += "\n\nTekoäly kuitenkin löysi seuraavia asioita:\n" + results.notFound.join(', ');
        }
        setAlertMsg(msg);
      }
    } catch (e: any) {
      if (e.name === "AbortError") {
        setIsAnalyzing(false);
        return;
      }
      let msg = e.message;
      if (msg.includes("is not an object") || msg.includes("undefined")) {
        msg = "Analysointi epäonnistui yhteysvirheen tai tekstin kuvailun puutteen takia. Kokeile uudelleen!";
      }
      setAlertMsg(msg);
    }
    setIsAnalyzing(false);
    removeImage();
  };

  const confirmCancelAnalysis = () => {
    setConfirmData({
      msg: "Haluatko varmasti perua analyysin?",
      onConfirm: () => {
        if (aiAbortControllerRef.current) {
          aiAbortControllerRef.current.abort();
        }
      },
    });
  };

  let formattedDateLabel = isLoadingMenu ? "LADATAAN..." : "EI TIETOJA";
  const days = ['SUNNUNTAI', 'MAANANTAI', 'TIISTAI', 'KESKIVIIKKO', 'TORSTAI', 'PERJANTAI', 'LAUANTAI'];
  const months = ['TAMMIKUUTA', 'HELMIKUUTA', 'MAALISKUUTA', 'HUHTIKUUTA', 'TOUKOKUUTA', 'KESÄKUUTA', 'HEINÄKUUTA', 'ELOKUUTA', 'SYYSKUUTA', 'LOKAKUUTA', 'MARRASKUUTA', 'JOULUKUUTA'];

  if (activeMenuData && activeMenuData[currentDateIndex]) {
    const d = new Date(activeMenuData[currentDateIndex].date);
    formattedDateLabel = `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
  } else if (activeMenuData && activeMenuData.length > 0) {
    const d = new Date(activeMenuData[0].date);
    formattedDateLabel = `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
  }

  // Handle Swipe logic
  const touchStartX = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.changedTouches[0].screenX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].screenX;
    if (!activeMenuData) return;
    
    if (touchEndX < touchStartX.current - 70) {
      if (currentDateIndex < activeMenuData.length - 1) {
        vibrateHaptic(40);
        setCurrentDateIndex(currentDateIndex + 1);
      }
    } else if (touchEndX > touchStartX.current + 70) {
      if (currentDateIndex > 0) {
        vibrateHaptic(40);
        setCurrentDateIndex(currentDateIndex - 1);
      }
    }
  };

  return (
    <>
      {alertMsg && (
        <div id="custom-alert-overlay" style={{ display: "flex" }}>
          <div className="custom-alert-box">
            <div className="custom-alert-msg">{alertMsg}</div>
            <button className="custom-alert-btn" onClick={() => setAlertMsg(null)}>Selvä</button>
          </div>
        </div>
      )}

      {confirmData && (
        <div id="custom-confirm-overlay" style={{ display: "flex", position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(10px)", zIndex: 5000, alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div className="custom-alert-box">
            <div className="custom-alert-msg">{confirmData.msg}</div>
            <div style={{ display: "flex", width: "100%" }}>
              <button className="custom-alert-btn" style={{ flex: 1, borderRight: "var(--ios-border)" }} onClick={() => setConfirmData(null)}>Ei</button>
              <button className="custom-alert-btn" style={{ flex: 1, fontWeight: 700 }} onClick={() => { confirmData.onConfirm(); setConfirmData(null); }}>Kyllä</button>
            </div>
          </div>
        </div>
      )}

      {showWelcome && (
        <div id="welcome-screen" style={{ display: "flex" }}>
          <h1 style={{ marginBottom: 15, textAlign: "center" }}>Tervetuloa!</h1>
          <p style={{ color: "var(--text-dim)", marginBottom: 35, textAlign: "center", fontSize: 16, maxWidth: 300 }}>
            Valitse koulu tai oppilaitos aloittaaksesi lounaslaskurin käytön.
          </p>
          <div style={{ width: "100%", maxWidth: 320 }}>
            <input 
              type="text" 
              className="school-search-input" 
              placeholder="Hae koulua..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)} 
            />
            <div className="custom-school-list">
              {schoolsList
                .filter((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((s) => (
                  <div 
                    key={s.id} 
                    className={`custom-school-item ${tempSelectedSchool === s.id ? 'selected' : ''}`}
                    onClick={() => setTempSelectedSchool(s.id)}
                  >
                    {s.name}
                  </div>
                ))}
            </div>
          </div>
          <button className="btn-primary" style={{ maxWidth: 320, width: "100%", padding: 16, fontSize: 17 }} onClick={handleSchoolSelect}>
            Valitse ja jatka
          </button>
          <div style={{ marginTop: 30, textAlign: "center", fontSize: 14, color: "var(--text-dim)" }}>
            Eikö kouluasi ole listalla tai onko sinulla jotain muuta kysyttävää?<br/>
            <a href="mailto:Koululounaslaskuri@gmail.com" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600, display: "inline-block", marginTop: 8 }}>
              Ota yhteyttä
            </a>
          </div>
        </div>
      )}

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        theme={theme} 
        toggleTheme={toggleTheme} 
        user={user} 
        schoolsList={schoolsList}
        hasSubscription={hasSubscription}
        defaultOpenFaq={openFaqSettings}
      />

      <header className={isHeaderScrolled ? "scrolled" : ""}>
        <div style={{ position: "absolute", inset: 0, maxWidth: 414, margin: "0 auto", pointerEvents: "none" }}>
          
          <div id="header-actions">
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, position: "relative" }}>
              <button 
                id="auth-btn" 
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)} 
                style={{ background: "var(--tertiary-bg)", border: "var(--ios-border)", color: "var(--text)", fontWeight: 600, fontSize: 14, cursor: "pointer", padding: (user?.user_metadata?.avatar_url || user?.user_metadata?.picture) ? "0" : "8px 14px", borderRadius: (user?.user_metadata?.avatar_url || user?.user_metadata?.picture) ? "50%" : 22, display: "flex", alignItems: "center", gap: 6, transition: "0.2s" }}
              >
                {(user?.user_metadata?.avatar_url || user?.user_metadata?.picture) ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={user.user_metadata.avatar_url || user.user_metadata.picture} alt="Profile" style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover", display: "block" }} />
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                )}
                {!user && <span className="auth-btn-text">Kirjaudu</span>}
              </button>
              {user && (
                <span className="auth-status-label" style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", color: hasSubscription ? "var(--accent)" : "var(--text-dim)", letterSpacing: 0.5 }}>
                  {hasSubscription ? "Plus" : "Ilmainen"}
                </span>
              )}
            </div>

            {isProfileMenuOpen && (
              <>
                <div style={{ position: "fixed", inset: 0, zIndex: 2999 }} onClick={() => setIsProfileMenuOpen(false)} />
                <div className="profile-dropdown">
                  {user ? (
                    <div className="profile-dropdown-item" onClick={() => { setIsProfileMenuOpen(false); supabase.auth.signOut(); }} style={{ color: "#ff453a" }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                        <polyline points="16 17 21 12 16 7"></polyline>
                        <line x1="21" y1="12" x2="9" y2="12"></line>
                      </svg>
                      Kirjaudu ulos
                    </div>
                  ) : (
                    <div className="profile-dropdown-item" onClick={() => { setIsProfileMenuOpen(false); setIsAuthModalOpen(true); }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                        <polyline points="10 17 15 12 10 7"></polyline>
                        <line x1="15" y1="12" x2="3" y2="12"></line>
                      </svg>
                      Kirjaudu sisään
                    </div>
                  )}
                  <div className="profile-dropdown-item" onClick={() => { setOpenFaqSettings(false); setIsProfileMenuOpen(false); setIsSettingsOpen(true); }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="3"></circle>
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                    </svg>
                    Asetukset
                  </div>
                </div>
              </>
            )}
          </div>
          
        </div>
        <div className="header-content" style={{ position: "relative" }}>
          <div className="header-titles">
            <div style={{ position: "relative" }}>
              <div className="date-dropdown" ref={dateDropdownRef} onClick={() => setIsDateMenuOpen(!isDateMenuOpen)}>
                <span>{formattedDateLabel}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>
              
              <div ref={dateMenuRef} className="custom-date-menu" style={{ display: isDateMenuOpen ? "flex" : "none" }}>
                {activeMenuData && activeMenuData.length > 0 ? (
                  activeMenuData.map((dayData: any, idx: number) => {
                    const d = new Date(dayData.date);
                    const formatted = `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
                    return (
                      <div 
                        key={idx} 
                        className={`custom-date-item ${idx === currentDateIndex ? 'selected' : ''}`}
                        onClick={() => handleDateChange(idx)}
                      >
                        {formatted}
                      </div>
                    );
                  })
                ) : (
                  <div className="custom-date-item">Ei tietoja</div>
                )}
              </div>
            </div>
            <h1>
              <div className="school-header-selector" onClick={openWelcomeScreen}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: 25, height: 25, color: "var(--accent)", flexShrink: 0 }}>
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                </svg>
                <span style={{ fontSize: 28, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 220 }}>
                  {activeSchool?.name || "Lataus..."}
                </span>
                <svg style={{ width: 20, height: 20, color: "var(--text-dim)", flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </h1>
          </div>
          <div className="sticky-stats">
            <div className="s-item"><span className="s-val">{animK}</span><span className="s-lbl">kcal</span></div>
            <div className="s-item"><span className="s-val" style={{ color: "var(--p)" }}>{animP}g</span><span className="s-lbl">P</span></div>
            <div className="s-item"><span className="s-val" style={{ color: "var(--f)" }}>{animR}g</span><span className="s-lbl">R</span></div>
            <div className="s-item"><span className="s-val" style={{ color: "var(--c)" }}>{animH}g</span><span className="s-lbl">H</span></div>
          </div>
        </div>
      </header>

      <div 
        className="scroll-area" 
        onScroll={(e) => setIsHeaderScrolled((e.target as HTMLDivElement).scrollTop > 180)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="container">
          <div className={`hero ${(schoolsList.length === 0 || isLoadingMenu) ? 'skeleton' : ''}`}>
            <div className="kcal-box">
              <div className="kcal-val">{animK}</div>
              <div className="kcal-lbl">KCAL</div>
            </div>
            <div className="macro-list">
              <div className="m-row"><span className="m-lbl">PROTEIINI</span><span className="m-val" style={{ color: "var(--p)" }}>{animP}g</span></div>
              <div className="m-row"><span className="m-lbl">RASVA</span><span className="m-val" style={{ color: "var(--f)" }}>{animR}g</span></div>
              <div className="m-row"><span className="m-lbl">HIILIHYDRAATIT</span><span className="m-val" style={{ color: "var(--c)" }}>{animH}g</span></div>
            </div>
          </div>

          <div className={`section-label ${(schoolsList.length === 0 || isLoadingMenu) ? 'skeleton' : ''}`}>Päivän valikko</div>
          <div className={`list-group ${(schoolsList.length === 0 || isLoadingMenu) ? 'skeleton' : ''}`}>
            {(schoolsList.length === 0 || isLoadingMenu) ? (
              <>
                <div className="list-item"><div className="skeleton-text"></div></div>
                <div className="list-item"><div className="skeleton-text"></div></div>
                <div className="list-item"><div className="skeleton-text"></div></div>
              </>
            ) : mealData.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-dim)" }}>
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16, opacity: 0.5 }}>
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                      <polyline points="9 22 9 12 15 12 15 22"></polyline>
                  </svg><br/>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>Ei kouluruokaa tänään!</div>
                  <div style={{ fontSize: 14 }}>Hyvää viikonloppua tai lomaa. Muista syödä hyvin myös kotona!</div>
              </div>
            ) : (
              mealData.map((item, i) => (
                <div className="list-item" key={i}>
                  <div className="food-name">{item.name}</div>
                  <div className="qty-input">
                    <input 
                      type="number" 
                      placeholder="0" 
                      value={foodQuantities[i] || ""}
                      onChange={(e) => {
                        vibrateHaptic(10);
                        setFoodQuantities({ ...foodQuantities, [i]: e.target.value });
                      }}
                      inputMode="decimal" 
                    />
                    <span className="unit">g</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className={`section-label ${(schoolsList.length === 0 || isLoadingMenu) ? 'skeleton' : ''}`} style={{ marginTop: 24 }}>AI-analyysi</div>

          <div className="ai-zone" style={{ position: "relative", overflow: "hidden", minHeight: (!user || (hasSubscription === false && freeAnalysesUsed >= 3)) ? 320 : "auto" }}>
            {(!user || (hasSubscription === false && freeAnalysesUsed >= 3)) && (
              <div style={{
                position: "absolute",
                inset: 0,
                backdropFilter: "blur(4px)",
                WebkitBackdropFilter: "blur(4px)",
                background: "rgba(0,0,0,0.4)",
                zIndex: 10,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                gap: 12,
                borderRadius: 24,
                opacity: 1,
                padding: 16,
                textAlign: "center"
              }}>
                <div style={{ background: "rgba(255,255,255,0.1)", padding: 16, borderRadius: "50%", marginBottom: 8 }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 600, color: "var(--text)", margin: 0 }}>Tekoäly lukittu</h3>
                {!user ? (
                  <>
                    <p style={{ fontSize: 14, color: "var(--text-dim)", maxWidth: 250, margin: 0, lineHeight: 1.4 }}>
                      Kirjaudu sisään käyttääksesi älykästä ruoan tunnistusta ja automaattista grammamäärän arviointia.
                    </p>
                    <button 
                      onClick={() => setIsAuthModalOpen(true)}
                      style={{ background: "var(--text)", color: "var(--bg)", border: "none", padding: "12px 24px", borderRadius: 20, fontWeight: 600, fontSize: 15, cursor: "pointer", marginTop: 8 }}
                    >
                      Kirjaudu sisään
                    </button>
                    <button 
                      onClick={() => { setOpenFaqSettings(true); setIsSettingsOpen(true); }}
                      style={{ background: "transparent", color: "var(--text-dim)", border: "none", textDecoration: "underline", fontSize: 13, cursor: "pointer", marginTop: 4 }}
                    >
                      Lue lisää tekoälyn hyödyistä
                    </button>
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: 14, color: "var(--text-dim)", maxWidth: 250, margin: 0, lineHeight: 1.4 }}>
                      Osta tilaus avataksesi rajattoman tekoälyn ja automaattisen ruoan tunnistuksen.
                    </p>
                    <button 
                      onClick={() => { setOpenFaqSettings(false); setIsSettingsOpen(true); }}
                      style={{ background: "var(--accent)", color: "#fff", border: "none", padding: "12px 24px", borderRadius: 20, fontWeight: 600, fontSize: 15, cursor: "pointer", marginTop: 8 }}
                    >
                      Tilaa nyt
                    </button>
                    <button 
                      onClick={() => { setOpenFaqSettings(true); setIsSettingsOpen(true); }}
                      style={{ background: "transparent", color: "var(--text-dim)", border: "none", textDecoration: "underline", fontSize: 13, cursor: "pointer", marginTop: 4 }}
                    >
                      Lue lisää tekoälyn hyödyistä
                    </button>
                  </>
                )}
              </div>
            )}
            
            {(user && !hasSubscription && freeAnalysesUsed < 3) && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 4px 8px 4px", fontSize: 13, fontWeight: 700, color: "var(--accent)" }}>
                <span>{3 - freeAnalysesUsed}/3 jäljellä</span>
                <button 
                  onClick={() => { setOpenFaqSettings(false); setIsSettingsOpen(true); }}
                  style={{ background: "none", border: "none", color: "var(--accent)", textDecoration: "underline", fontWeight: 700, fontSize: 13, cursor: "pointer", padding: 0 }}
                >
                  Tilaa Plus
                </button>
              </div>
            )}
            <div style={{ position: "relative" }}>
              <textarea 
                placeholder="Kirjoita mitä söit..." 
                value={aiInput}
                onChange={(e) => {
                  setAiInput(e.target.value);
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = target.scrollHeight + 'px';
                }}
                rows={1}
                style={{ overflow: 'hidden', minHeight: '26px' }}
              ></textarea>
              {(user && hasSubscription) && (
                <button
                  onClick={() => { setOpenFaqSettings(true); setIsSettingsOpen(true); }}
                  style={{ position: "absolute", top: 12, right: 12, background: "transparent", border: "none", color: "var(--text-dim)", cursor: "pointer", padding: 4 }}
                  title="Tietoa tekoälystä"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                  </svg>
                </button>
              )}
            </div>
            {uploadedImageData && (
              <div style={{ position: "relative", marginTop: 15 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={uploadedImageData} alt="Preview" style={{ width: "100%", maxHeight: 200, objectFit: "cover", borderRadius: 20, border: "0.5px solid rgba(255,255,255,0.1)" }} />
                <button onClick={removeImage} style={{ position: "absolute", top: 10, right: 10, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(10px)", color: "white", border: "var(--ios-border)", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            )}
            <div className="ai-toolbar">
              <button className="btn-icon" onClick={() => fileInputRef.current?.click()}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                  <circle cx="12" cy="13" r="4"></circle>
                </svg>
                Lisää kuva
              </button>
              <input type="file" ref={fileInputRef} accept="image/*" style={{ display: "none" }} onChange={handlePreviewImage} />
              
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button className={`btn-primary ${isAnalyzing ? 'loading' : ''}`} onClick={runAI}>Analysoi</button>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </>
  );
}
