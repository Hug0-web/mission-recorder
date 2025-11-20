import React from "react";
import "./DemoCard.css";

export default function DemoCard({ mission }) {
  if (!mission) return null;

  const { summary, extracted, bullets } = mission;

  return (
    <div className="demo-card">
      {summary && <div className="summary">{summary}</div>}

      <div className="meta">
        {extracted && (
          <>
            {extracted.deadline && (
              <div className="chip">Échéance: {extracted.deadline}</div>
            )}
            {extracted.budget && (
              <div className="chip">Budget: {extracted.budget}</div>
            )}
            {extracted.projectType && (
              <div className="chip">Type: {extracted.projectType}</div>
            )}
          </>
        )}
      </div>

      {bullets && bullets.length > 0 && (
        <ul className="bullets">
          {bullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
