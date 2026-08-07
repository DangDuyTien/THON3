export default function YouthUnionPartyLogo({ size = 28, className = "", style = {} }) {
  return (
    <img
      src="/assets/communist-party-logo.jpg"
      alt="Logo Búa Liềm Cờ Đảng"
      className={`youth-party-logo-img ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        objectFit: "cover",
        display: "inline-block",
        verticalAlign: "middle",
        flexShrink: 0,
        boxShadow: "0 0 12px rgba(255, 215, 0, 0.4), 0 2px 6px rgba(0,0,0,0.5)",
        border: "1.5px solid #ffd700",
        ...style,
      }}
    />
  );
}
