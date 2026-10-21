import { AlertCircle, CheckCircle2, Clock3, Truck, Utensils } from "lucide-react";

export function DonationStatus({
  status,
  expired = false,
  label,
}: {
  status: string;
  expired?: boolean;
  label?: string;
}) {
  const state = expired
    ? { text: "Expired", icon: AlertCircle, tone: "bg-danger-subtle text-danger" }
    : status === "delivered"
      ? { text: "Delivered", icon: CheckCircle2, tone: "bg-success-subtle text-success" }
      : status === "picked_up"
        ? { text: "On the way", icon: Truck, tone: "bg-info-subtle text-info" }
        : status === "claimed"
          ? { text: "Pickup pending", icon: Clock3, tone: "bg-warning-subtle text-warning" }
          : status === "available"
            ? { text: "Available", icon: Utensils, tone: "bg-success-subtle text-success" }
            : { text: "Needs review", icon: AlertCircle, tone: "bg-warning-subtle text-warning" };
  const Icon = state.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${state.tone}`}
    >
      <Icon size={13} className="shrink-0" aria-hidden="true" />
      {label ?? state.text}
    </span>
  );
}
