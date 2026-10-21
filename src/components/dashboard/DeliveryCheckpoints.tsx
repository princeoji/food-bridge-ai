import { Check, Circle, Clock3 } from "lucide-react";
import type { Donation } from "@/lib/donations";

export function DeliveryCheckpoints({ donation }: { donation: Donation }) {
  const reached =
    donation.status === "delivered"
      ? 3
      : donation.status === "picked_up"
        ? 2
        : donation.volunteer_id
          ? 1
          : 0;
  const steps = [
    { title: "NGO claimed food", detail: "The NGO requested this meal for delivery." },
    { title: "Delivery accepted", detail: "You are assigned to collect and deliver this order." },
    {
      title: "Hotel confirmed pickup",
      detail:
        "Show the pickup code to the hotel. The hotel verifies it and marks the food picked up.",
    },
    {
      title: "Delivered to NGO",
      detail: "Hand the food to the NGO, then use Finish delivery below.",
    },
  ];
  return (
    <section
      aria-label="Delivery checkpoints"
      className="rounded-lg border border-border bg-card p-3"
    >
      <div className="flex justify-between items-center gap-2 mb-3">
        <h4 className="font-bold">Delivery checkpoints</h4>
        <span className="text-xs text-muted-foreground">{reached + 1} of 4 complete</span>
      </div>
      <ol className="space-y-0">
        {steps.map((step, index) => {
          const complete = index <= reached;
          const current = index === reached + 1;
          const Icon = complete ? Check : current ? Clock3 : Circle;
          return (
            <li
              key={step.title}
              aria-current={current ? "step" : undefined}
              className="relative flex gap-3 pb-3 last:pb-0"
            >
              {index < steps.length - 1 && (
                <span
                  aria-hidden="true"
                  className={
                    "absolute left-3 top-6 bottom-0 border-l " +
                    (complete ? "border-success/40" : "border-border")
                  }
                />
              )}
              <span
                className={
                  "relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full " +
                  (complete
                    ? "bg-success-subtle text-success"
                    : current
                      ? "bg-warning-subtle text-warning"
                      : "bg-muted text-muted-foreground")
                }
              >
                <Icon size={13} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p
                  className={
                    "text-xs font-bold " +
                    (complete ? "text-success" : current ? "text-warning" : "text-muted-foreground")
                  }
                >
                  {step.title}{" "}
                  <span className="sr-only">
                    {complete ? "— complete" : current ? "— next checkpoint" : "— pending"}
                  </span>
                </p>
                {(current || index === reached) && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {index === reached && complete
                      ? index === 3
                        ? "Delivery completed. Thank you for rescuing this food."
                        : index === 2
                          ? "Food collected. You can now deliver it to the NGO."
                          : step.detail
                      : step.detail}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
