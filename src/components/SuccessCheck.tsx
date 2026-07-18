// Ödəniş təsdiqi nişanı — dairə çəkilir, quş işarəsi yazılır, iki dalğa yayılır.
// Hərəkət həssaslığı olan istifadəçilər son kadrı statik görür (globals.css).

export default function SuccessCheck({ className = "" }: { className?: string }) {
  return (
    <span className={`gc-success ${className}`} aria-hidden="true">
      <span className="gc-success-ring" />
      <span className="gc-success-ring gc-success-ring-2" />
      <svg viewBox="0 0 52 52" className="gc-success-svg">
        <circle
          className="gc-success-circle"
          cx="26"
          cy="26"
          r="24"
          fill="none"
          strokeWidth="2.5"
        />
        <path
          className="gc-success-check"
          fill="none"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14 26.5l8.5 8.5L38 19"
        />
      </svg>
    </span>
  );
}
