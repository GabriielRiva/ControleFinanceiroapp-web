// Símbolo do Zeno: o "o" como um gauge — anel com um arco em destaque.
export default function ZenoMark({ size = 34 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      className="brand-mark"
      style={{ borderRadius: size * 0.28, background: '#0c1413', padding: 0 }}
      aria-label="Zeno"
    >
      <rect width="512" height="512" rx="112" fill="#0c1413" />
      <circle cx="256" cy="256" r="128" fill="none" stroke="#f4f6f5" strokeWidth="40" />
      <path
        d="M 256 128 A 128 128 0 0 1 366 194"
        fill="none"
        stroke="#14b8a6"
        strokeWidth="40"
        strokeLinecap="round"
      />
    </svg>
  );
}
