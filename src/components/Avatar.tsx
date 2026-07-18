// İsimdən deterministik qradient avatar — foto yoxdursa istifadə olunur.
// Hər ad üçün sabit rəng (hash ilə), baş hərf(lər) mərkəzdə.

interface Props {
  name: string;
  size?: number;
  src?: string | null;
  className?: string;
}

// Brend tonlarına yaxın, kifayət qədər fərqli 6 qradient
const PALETTE: [string, string][] = [
  ["#E31C5F", "#B0143F"], // nar
  ["#2F6F4E", "#1F5138"], // meşə yaşılı
  ["#3A5A8C", "#26406A"], // tünd mavi
  ["#B06A2C", "#8A4E1D"], // kraft/qəhvəyi
  ["#6B4E8C", "#4C3568"], // bənövşəyi
  ["#2C7A7B", "#1D5B5C"], // teal
];

function hashName(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Avatar({ name, size = 40, src, className = "" }: Props) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        className={`rounded-full object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  const [a, b] = PALETTE[hashName(name || "?") % PALETTE.length];
  return (
    <span
      aria-hidden="true"
      className={`inline-flex items-center justify-center rounded-full text-white font-semibold select-none shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.4),
        background: `linear-gradient(135deg, ${a}, ${b})`,
      }}
    >
      {initials(name)}
    </span>
  );
}
