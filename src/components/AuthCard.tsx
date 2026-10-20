import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { FoodBridgeBrand } from "@/components/FoodBridgeBrand";

export function AuthCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-secondary px-4 py-6">
      <div className="card-box w-full max-w-[460px] p-4 sm:p-5">
        <Link
          to="/"
          className="flex justify-center items-center gap-2 text-2xl font-extrabold mb-4"
          aria-label="FoodBridge home"
        >
          <FoodBridgeBrand />
        </Link>
        <h1 className="text-2xl font-bold text-center">{title}</h1>
        {description && (
          <p className="text-muted-foreground text-sm text-center mt-2">{description}</p>
        )}
        <div className="mt-4">{children}</div>
      </div>
    </main>
  );
}
