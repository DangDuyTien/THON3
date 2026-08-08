import React from "react";

export default function SiteLoaderMark({ onAnimationEnd, label = "" }) {
  const dynamicLabel = String(label || "").trim().toUpperCase();

  return (
    <span className={`site-loader-mark${dynamicLabel ? " has-dynamic-label" : ""}`}>
      <svg aria-hidden="true" className="site-loader-signature" viewBox="0 0 500 146">
        {dynamicLabel ? (
          <g className="sig-draw sig-dynamic-label">
            <text className="sig-label-text" x="250" y="78" textAnchor="middle">
              {dynamicLabel}
            </text>
            <path d="M 30,132 H 470" pathLength="1" className="sig-path sig-line" onAnimationEnd={onAnimationEnd} />
          </g>
        ) : (
          <g className="sig-draw">
            {/* T */}
            <path d="M 30,22 H 95" pathLength="1" className="sig-path sig-t" />
            <path d="M 62.5,22 V 110" pathLength="1" className="sig-path sig-t" />

            {/* H */}
            <path d="M 125,22 V 110" pathLength="1" className="sig-path sig-h" />
            <path d="M 125,66 H 175" pathLength="1" className="sig-path sig-h" />
            <path d="M 175,22 V 110" pathLength="1" className="sig-path sig-h" />

            {/* Ô */}
            <path d="M 228,14 L 240,4 L 252,14" pathLength="1" className="sig-path sig-o" />
            <path d="M 240,22 C 205,22 205,110 240,110 C 275,110 275,22 240,22 Z" pathLength="1" className="sig-path sig-o" />

            {/* N */}
            <path d="M 305,110 V 22 L 365,110 V 22" pathLength="1" className="sig-path sig-n" />

            {/* 3 */}
            <path d="M 395,22 H 455 L 425,60 C 455,60 465,74 465,90 C 465,108 440,110 395,110" pathLength="1" className="sig-path sig-3" />

            {/* Underline accent line */}
            <path d="M 30,132 H 470" pathLength="1" className="sig-path sig-line" onAnimationEnd={onAnimationEnd} />
          </g>
        )}
      </svg>
    </span>
  );
}
