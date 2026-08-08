export default function SiteLoaderMark({ onAnimationEnd }) {
  return (
    <span className="site-loader-mark">
      <svg aria-hidden="true" className="site-loader-signature" viewBox="0 0 470 128">
        <g className="sig-guide">
          <path d="M 35,34 H 105" /><path d="M 70,34 V 94" />
          <path d="M 130,34 V 94" /><path d="M 130,64 H 180" /><path d="M 180,34 V 94" />
          <path d="M 235,34 C 200,34 200,94 235,94 C 270,94 270,34 235,34 Z" />
          <path d="M 220,22 L 235,10 L 250,22" />
          <path d="M 295,94 V 34 L 350,94 V 34" />
          <path d="M 385,34 H 430 L 406,60 C 428,60 436,72 436,83 C 436,94 416,94 385,94" />
          <path d="M 35,110 H 435" />
        </g>
        <g className="sig-draw">
          <path d="M 35,34 H 105" pathLength="1" className="sig-path sig-t" />
          <path d="M 70,34 V 94" pathLength="1" className="sig-path sig-t" />
          <path d="M 130,34 V 94" pathLength="1" className="sig-path sig-h" />
          <path d="M 130,64 H 180" pathLength="1" className="sig-path sig-h" />
          <path d="M 180,34 V 94" pathLength="1" className="sig-path sig-h" />
          <path d="M 235,34 C 200,34 200,94 235,94 C 270,94 270,34 235,34 Z" pathLength="1" className="sig-path sig-o" />
          <path d="M 220,22 L 235,10 L 250,22" pathLength="1" className="sig-path sig-o" />
          <path d="M 295,94 V 34 L 350,94 V 34" pathLength="1" className="sig-path sig-n" />
          <path d="M 385,34 H 430 L 406,60 C 428,60 436,72 436,83 C 436,94 416,94 385,94" pathLength="1" className="sig-path sig-3" />
          <path d="M 35,110 H 435" pathLength="1" className="sig-path sig-line" onAnimationEnd={onAnimationEnd} />
        </g>
      </svg>
    </span>
  );
}
