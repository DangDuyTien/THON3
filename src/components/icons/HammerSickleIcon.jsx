export default function HammerSickleIcon({ className = "", style = {} }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="currentColor"
      className={className}
      aria-hidden="true"
      style={{ width: "1.15em", height: "1.15em", display: "inline-block", verticalAlign: "-0.15em", ...style }}
    >
      {/* Sickle Blade */}
      <path d="M74 22C58 10 34 16 24 37C15 54 20 73 37 83C48 89 61 87 71 78C59 80 46 75 38 64C28 50 32 29 47 19C58 12 70 15 78 23C76 19 74 22 74 22Z" />
      {/* Sickle Handle */}
      <path d="M62 67L78 83C80 85 84 85 86 83C88 81 88 77 86 75L70 59L62 67Z" />
      {/* Hammer Shaft */}
      <path d="M29 21L76 68L70 74L23 27L29 21Z" />
      {/* Hammer Head */}
      <path d="M20 14L37 31L31 37L14 20L20 14Z" />
    </svg>
  );
}
