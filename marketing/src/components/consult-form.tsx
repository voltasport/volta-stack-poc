"use client";

import {useState, type CSSProperties} from "react";

const sports = ["Soccer", "Basketball", "Lacrosse", "Volleyball", "Baseball", "Softball", "Hockey"];
const needs = ["Game day kits", "Training & travel", "A team store", "A rush order"];
const sizes = ["Under 25", "25–50", "50–100", "100+"];

function Choice({
  label,
  on,
  onClick,
}: {
  label: string;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        minHeight: 44,
        padding: "0 16px",
        borderRadius: 999,
        border: on ? "0" : "1px solid #D6D0C4",
        background: on ? "#101B2D" : "#fff",
        color: on ? "#F6F4F0" : "#0F1724",
        font: "inherit",
        fontWeight: 650,
        cursor: "pointer",
      }}
    >
      {on ? `✓ ${label}` : label}
    </button>
  );
}

export function ConsultForm() {
  const [pickedSports, setPickedSports] = useState<string[]>([]);
  const [pickedNeeds, setPickedNeeds] = useState<string[]>([]);
  const [size, setSize] = useState(sizes[1]);
  const [sent, setSent] = useState(false);

  function toggle(list: string[], value: string, set: (next: string[]) => void) {
    set(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  }

  if (sent) {
    return (
      <p style={{fontSize: 20, lineHeight: 1.5}}>
        Got it. A Volta person will write you about a 15-minute kickoff.
      </p>
    );
  }

  return (
    <form
      style={{display: "flex", flexDirection: "column", gap: 22}}
      onSubmit={(event) => {
        event.preventDefault();
        setSent(true);
      }}
    >
      <label style={{display: "flex", flexDirection: "column", gap: 6}}>
        Name
        <input name="name" required style={field} />
      </label>
      <label style={{display: "flex", flexDirection: "column", gap: 6}}>
        Email
        <input name="email" type="email" required style={field} />
      </label>
      <label style={{display: "flex", flexDirection: "column", gap: 6}}>
        Program, school or club
        <input name="program" required style={field} />
      </label>
      <fieldset style={{border: 0, padding: 0, margin: 0}}>
        <legend style={{marginBottom: 8}}>Sport(s)</legend>
        <div style={{display: "flex", flexWrap: "wrap", gap: 8}}>
          {sports.map((sport) => (
            <Choice
              key={sport}
              label={sport}
              on={pickedSports.includes(sport)}
              onClick={() => toggle(pickedSports, sport, setPickedSports)}
            />
          ))}
        </div>
      </fieldset>
      <fieldset style={{border: 0, padding: 0, margin: 0}}>
        <legend style={{marginBottom: 8}}>What do you need?</legend>
        <div style={{display: "flex", flexWrap: "wrap", gap: 8}}>
          {needs.map((need) => (
            <Choice
              key={need}
              label={need}
              on={pickedNeeds.includes(need)}
              onClick={() => toggle(pickedNeeds, need, setPickedNeeds)}
            />
          ))}
        </div>
      </fieldset>
      <fieldset style={{border: 0, padding: 0, margin: 0}}>
        <legend style={{marginBottom: 8}}>Roster size</legend>
        <div style={{display: "flex", flexWrap: "wrap", gap: 8}}>
          {sizes.map((option) => (
            <Choice key={option} label={option} on={size === option} onClick={() => setSize(option)} />
          ))}
        </div>
      </fieldset>
      <label style={{display: "flex", flexDirection: "column", gap: 6}}>
        Need it by
        <input name="date" type="date" style={field} />
      </label>
      <button className="btn btn-n" type="submit" style={{alignSelf: "flex-start"}}>
        Pick a time →
      </button>
    </form>
  );
}

const field: CSSProperties = {
  minHeight: 48,
  borderRadius: 14,
  border: "1px solid #D6D0C4",
  padding: "0 14px",
  font: "inherit",
  background: "#fff",
};
