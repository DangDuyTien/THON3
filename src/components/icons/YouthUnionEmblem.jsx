export default function YouthUnionEmblem({ size = 36, className = "", style = {} }) {
  return (
    <img
      src="/assets/doan-tncs-logo-160.webp"
      alt="Huy hiệu Đoàn TNCS Hồ Chí Minh"
      className={`youth-union-emblem-img ${className}`}
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
