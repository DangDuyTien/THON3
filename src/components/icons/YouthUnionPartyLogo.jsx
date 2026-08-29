export default function YouthUnionPartyLogo({ size = 28, className = "", style = {} }) {
  return (
    <img
      src="/assets/doan-tncs-logo-160.webp"
      alt="Huy hiệu Đoàn TNCS Hồ Chí Minh"
      className={`youth-party-logo-img ${className}`}
      decoding="async"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        objectFit: "contain",
        display: "inline-block",
        verticalAlign: "middle",
        flexShrink: 0,
        filter: "drop-shadow(0 2px 8px rgba(0, 240, 255, 0.4))",
        ...style,
      }}
    />
  );
}
