import { Star } from "lucide-react";
import { reputationLabel, type Reputation } from "@/lib/reputation";

/// Estrellas de solo lectura. `size` acompaña al texto que las rodea.
export function RatingStars({
  rating,
  size = "sm",
}: {
  rating: number;
  size?: "sm" | "md";
}) {
  const dimension = size === "md" ? "size-5" : "size-4";

  return (
    <span className="flex items-center gap-0.5" aria-label={`${rating} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((value) => (
        <Star
          key={value}
          className={`${dimension} ${
            value <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-slate-300"
          }`}
        />
      ))}
    </span>
  );
}

/// Promedio + total, o el aviso de que todavía no hay calificaciones.
export function ReputationBadge({
  reputation,
  size = "sm",
}: {
  reputation: Reputation;
  size?: "sm" | "md";
}) {
  if (reputation.average === null) {
    return <span className="text-xs text-ink-500">Sin calificaciones todavía</span>;
  }

  return (
    <span className="flex items-center gap-1.5">
      <RatingStars rating={reputation.average} size={size} />
      <span className={size === "md" ? "text-sm text-ink-700" : "text-xs text-ink-500"}>
        {reputationLabel(reputation)}
      </span>
    </span>
  );
}
