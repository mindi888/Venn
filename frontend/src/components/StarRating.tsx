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

  return (
    <div
      className="flex gap-0.5"
      onMouseLeave={() => setHover(null)}
      role={readOnly ? undefined : "group"}
      aria-label={readOnly ? `Rating: ${value ?? 0} out of 10` : "Select rating"}
    >
      {Array.from({ length: 10 }, (_, i) => {
        const star = i + 1;
        const filled = star <= active;
        return (
          <button
            key={star}
            type="button"
            disabled={readOnly}
            className={`${sizes[size]} transition-transform duration-75 ${readOnly ? "cursor-default" : "cursor-pointer hover:scale-110"} focus:outline-none`}
            onClick={() => onChange?.(star)}
            onMouseEnter={() => !readOnly && setHover(star)}
            aria-label={`Rate ${star} out of 10`}
          >
            <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M10 1.5l2.47 5.01 5.53.8-4 3.9.94 5.49L10 14.27l-4.94 2.43.94-5.49-4-3.9 5.53-.8L10 1.5z"
                fill={filled ? "#D4A017" : "none"}
                stroke={filled ? "#D4A017" : "#3A3A3A"}
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        );
      })}
      {!readOnly && active > 0 && (
        <span className="ml-2 text-sm text-muted-foreground self-center">{active}/10</span>
      )}
    </div>
  );
}
