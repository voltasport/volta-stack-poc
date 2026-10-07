"use client";

import {useMemo, useState} from "react";

const MIN = 25;
const MAX = 300;
const STEP = 25;
const DEFAULT = 80;

function savingsForAthletes(n: number) {
  const perAthlete = 230;
  return Math.round(n * perAthlete);
}

function perkForSavings(amount: number) {
  if (amount >= 40000) return "a full second kit run";
  if (amount >= 25000) return "new travel gear for the staff";
  if (amount >= 15000) return "a weekend tournament";
  return "extra training tops for the roster";
}

export function PricingCalculator() {
  const [athletes, setAthletes] = useState(DEFAULT);
  const savings = useMemo(() => savingsForAthletes(athletes), [athletes]);
  const perk = useMemo(() => perkForSavings(savings), [savings]);

  return (
    <div
      className="rv pricing-calc pricing-calc-panel"
      style={{
        background: "#16243A",
        color: "#F6F4F0",
        border: "1px solid #26395A",
        borderRadius: 32,
        padding: 48,
        display: "flex",
        flexWrap: "wrap",
        gap: 48,
        alignItems: "center",
        boxShadow: "0 30px 60px rgba(16,27,45,.3)",
      }}
    >
      <div style={{flex: "1 1 420px", minWidth: 0, display: "flex", flexDirection: "column", gap: 20}}>
        <div className="eyebrow" style={{color: "#58B077"}}>
          Savings calculator
        </div>
        <label htmlFor="ath" className="disp" style={{fontSize: "clamp(40px,6vw,56px)"}}>
          How many athletes?
        </label>
        <input
          id="ath"
          className="rng"
          type="range"
          min={MIN}
          max={MAX}
          step={STEP}
          value={athletes}
          onChange={(event) => setAthletes(Number(event.target.value))}
          aria-valuemin={MIN}
          aria-valuemax={MAX}
          aria-valuenow={athletes}
        />
        <div style={{display: "flex", justifyContent: "space-between", fontSize: 13, color: "#B8C2D3", alignItems: "center"}}>
          <span>{MIN}</span>
          <span className="disp" style={{fontSize: 40, color: "#F6F4F0"}} aria-live="polite">
            {athletes}
          </span>
          <span>{MAX}</span>
        </div>
      </div>
      <div style={{flex: "1 1 380px", minWidth: 0, background: "#101B2D", borderRadius: 24, padding: 32}}>
        <div style={{fontSize: 14, color: "#B8C2D3"}}>You&apos;d save about</div>
        <div className="disp headline-section pricing-savings-result" style={{color: "#58B077", margin: "8px 0"}}>
          ${savings.toLocaleString("en-US")}
        </div>
        <div style={{fontSize: 14, color: "#B8C2D3"}}>per year. Enough for:</div>
        <div style={{fontSize: 18, fontWeight: 700, marginTop: 8}}>{perk}</div>
      </div>
    </div>
  );
}
