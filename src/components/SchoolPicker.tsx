"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type School = { id: string; name: string };

type Props = {
  schools: School[];
};

export default function SchoolPicker({ schools }: Props) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("valitse")) return;

    const savedSchoolId = localStorage.getItem("kr_school_id");
    if (savedSchoolId && schools.find((s) => s.id === savedSchoolId)) {
      router.replace(`/koulu/${savedSchoolId}`);
    }
  }, [router, schools]);

  const query = searchQuery.toLowerCase();
  const filtered = query
    ? schools.filter((s) => s.name.toLowerCase().includes(query))
    : schools;

  return (
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
        <nav className="custom-school-list" aria-label="Koulujen lista">
          {filtered.map((s) => (
            <Link
              key={s.id}
              href={`/koulu/${s.id}`}
              className="custom-school-item"
              prefetch
              onClick={() => localStorage.setItem("kr_school_id", s.id)}
            >
              {s.name}
            </Link>
          ))}
        </nav>
      </div>
      <div style={{ marginTop: 30, textAlign: "center", fontSize: 14, color: "var(--text-dim)" }}>
        Eikö kouluasi ole listalla tai onko sinulla jotain muuta kysyttävää?<br />
        <a href="mailto:Koululounaslaskuri@gmail.com" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600, display: "inline-block", marginTop: 8 }}>
          Ota yhteyttä
        </a>
      </div>
    </div>
  );
}
