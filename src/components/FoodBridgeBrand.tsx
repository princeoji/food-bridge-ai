import { Heart } from "lucide-react";

export function FoodBridgeBrand({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-extrabold ${className}`}>
      <Heart aria-hidden="true" className="size-8 shrink-0 text-primary" strokeWidth={2.2} />
      <span>
        Food<span className="text-primary">Bridge</span>
      </span>
    </span>
  );
}
