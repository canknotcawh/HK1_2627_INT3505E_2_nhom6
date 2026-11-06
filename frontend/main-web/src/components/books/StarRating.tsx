import { Star } from "lucide-react";

interface StarRatingProps {
  rating: number;
  maxStars?: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  onRate?: (rating: number) => void;
}

export default function StarRating({
  rating,
  maxStars = 5,
  size = "md",
  interactive = false,
  onRate,
}: StarRatingProps) {
  const sizeClasses = {
    sm: "w-3.5 h-3.5",
    md: "w-4 h-4",
    lg: "w-6 h-6",
  }[size];

  return (
    <div className="flex items-center gap-0.5" role={interactive ? "radiogroup" : "img"}>
      {Array.from({ length: maxStars }, (_, i) => {
        const starValue = i + 1;
        const isFilled = starValue <= Math.round(rating);

        if (interactive) {
          return (
            <button
              key={i}
              type="button"
              onClick={() => onRate && onRate(starValue)}
              className="p-1 rounded hover:scale-110 transition-transform cursor-pointer focus:outline-none"
              title={`${starValue} sao`}
            >
              <Star
                className={`${sizeClasses} ${
                  isFilled
                    ? "text-amber-400 fill-amber-400"
                    : "text-gray-300 hover:text-amber-300"
                }`}
              />
            </button>
          );
        }

        return (
          <Star
            key={i}
            className={`${sizeClasses} ${
              isFilled ? "text-amber-400 fill-amber-400" : "text-gray-200 fill-gray-100"
            }`}
          />
        );
      })}
    </div>
  );
}

