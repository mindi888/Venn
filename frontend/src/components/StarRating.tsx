import { useState } from "react";

type Props = {
  value: number | null;
  onChange?: (rating: number) => void;
  readOnly?: boolean;
  size?: "sm" | "md" | "lg";
};

const sizes = { sm: "w-4 h-4", md: "w-5 h-5", lg: "w-6 h-6" };

export default function StarRating({ value, onChange, readOnly = false, size = "md" }: Props) {
  const [hover, setHover] = useState<number | null>(null);

  const active = hover ?? value ?? 0;

  const star = (filled: boolean) => (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M10 1.5l2.47 5.01 5.53.8-4 3.9.94 5.49L10 14.27l-4.94 2.43.94-5.49-4-3.9 5.53-.8L10 1.5z"
        fill={filled ? "#D4A017" : "none"}
        stroke={filled ? "#D4A017" : "#3A3A3A"}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );

  // Display-only: one labelled image, so it can sit inside other buttons and cards
  if (readOnly) {
    return (
      <div className="flex gap-0.5" role="img" aria-label={`Rated ${value ?? 0} out of 10`}>
        {Array.from({ length: 10 }, (_, i) => (
          <span key={i} className={sizes[size]}>{star(i + 1 <= (value ?? 0))}</span>
        ))}
      </div>
    );
  }

  return (
    <div
      className="flex gap-0.5"
      onMouseLeave={() => setHover(null)}
      role="group"
      aria-label="Your rating"
    >
      {Array.from({ length: 10 }, (_, i) => {
        const n = i + 1;
        return (
          <button
            key={n}
            type="button"
            className={`${sizes[size]} transition-transform duration-75 cursor-pointer hover:scale-110 rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
            onClick={() => onChange?.(n)}
            onMouseEnter={() => setHover(n)}
            aria-label={`Rate ${n} out of 10`}
            aria-pressed={value === n}
          >
            {star(n <= active)}
          </button>
        );
      })}
      {active > 0 && (
        <span className="ml-2 text-sm text-muted-foreground self-center" aria-hidden="true">{active}/10</span>
      )}
    </div>
  );
}
