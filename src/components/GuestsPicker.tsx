"use client";

export interface GuestCounts {
  adults: number;
  children: number;
  infants: number;
  pets: number;
}

export const EMPTY_GUESTS: GuestCounts = {
  adults: 0,
  children: 0,
  infants: 0,
  pets: 0,
};

/** Airbnb-də olduğu kimi körpələr və heyvanlar tutuma sayılmır. */
export function totalGuests(g: GuestCounts): number {
  return g.adults + g.children;
}

export function guestsLabel(g: GuestCounts): string {
  const parts: string[] = [];
  const total = totalGuests(g);
  if (total > 0) parts.push(`${total} qonaq`);
  if (g.infants > 0) parts.push(`${g.infants} körpə`);
  if (g.pets > 0) parts.push(`${g.pets} heyvan`);
  return parts.join(", ");
}

const ROWS: {
  key: keyof GuestCounts;
  label: string;
  hint: string;
  max: number;
}[] = [
  { key: "adults", label: "Böyüklər", hint: "13 yaş və yuxarı", max: 16 },
  { key: "children", label: "Uşaqlar", hint: "2–12 yaş", max: 15 },
  { key: "infants", label: "Körpələr", hint: "2 yaşdan kiçik", max: 5 },
  { key: "pets", label: "Ev heyvanları", hint: "", max: 5 },
];

function StepButton({
  sign,
  disabled,
  onClick,
  label,
}: {
  sign: "-" | "+";
  disabled: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`w-9 h-9 rounded-full border flex items-center justify-center transition-colors ${
        disabled
          ? "border-gece/15 text-gece/20 cursor-not-allowed"
          : "border-gece/40 text-gece/70 hover:border-gece hover:text-gece"
      }`}
    >
      <svg viewBox="0 0 12 12" className="w-3 h-3" aria-hidden="true">
        <path
          d="M1 6h10"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        {sign === "+" && (
          <path
            d="M6 1v10"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        )}
      </svg>
    </button>
  );
}

export default function GuestsPicker({
  value,
  onChange,
  maxGuests,
}: {
  value: GuestCounts;
  onChange: (g: GuestCounts) => void;
  maxGuests?: number;
}) {
  const capacity = maxGuests ?? 16;
  const used = totalGuests(value);

  const bump = (key: keyof GuestCounts, delta: number) => {
    const next = { ...value, [key]: value[key] + delta };
    // Uşaq və ya körpə seçildikdə ən azı bir böyük lazımdır.
    if (delta > 0 && next.adults === 0) next.adults = 1;
    onChange(next);
  };

  return (
    <div className="divide-y divide-gece/10">
      {ROWS.map((row) => {
        const count = value[row.key];
        const countsAgainstCapacity =
          row.key === "adults" || row.key === "children";
        const atCapacity = countsAgainstCapacity && used >= capacity;
        // Son böyüyü silmək olmaz, əgər uşaq/körpə varsa.
        const lockedAdult =
          row.key === "adults" &&
          count === 1 &&
          (value.children > 0 || value.infants > 0);

        return (
          <div
            key={row.key}
            className="flex items-center justify-between gap-4 py-5 first:pt-0 last:pb-0"
          >
            <div>
              <div className="font-semibold text-gece">{row.label}</div>
              {row.key === "pets" ? (
                <button
                  type="button"
                  className="text-sm text-gece/60 underline hover:text-gece text-left"
                >
                  Xidməti heyvan gətirirsiniz?
                </button>
              ) : (
                <div className="text-sm text-gece/60">{row.hint}</div>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <StepButton
                sign="-"
                disabled={count === 0 || lockedAdult}
                onClick={() => bump(row.key, -1)}
                label={`${row.label} sayını azalt`}
              />
              <span className="w-6 text-center tabular-nums text-gece">
                {count}
              </span>
              <StepButton
                sign="+"
                disabled={count >= row.max || atCapacity}
                onClick={() => bump(row.key, 1)}
                label={`${row.label} sayını artır`}
              />
            </div>
          </div>
        );
      })}

      {maxGuests != null && (
        <p className="pt-4 text-xs text-gece/50">
          Bu ev ən çox {maxGuests} qonaq qəbul edir. Körpələr sayılmır.
        </p>
      )}
    </div>
  );
}
