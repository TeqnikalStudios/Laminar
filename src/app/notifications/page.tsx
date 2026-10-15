import type { Metadata } from "next";
import { PlannedView } from "@/views/PlannedView";

export const metadata: Metadata = { title: "Notifications" };

export default function Page() {
  return (
    <PlannedView
      eyebrow="Notifications"
      title="Alerts & notifications"
      stage="Stage 2"
      summary="Price alerts and application updates, delivered in-app and by email once accounts exist."
      items={["Price and percentage-move alerts for watchlist assets", "Tokenization application status changes and reviewer requests", "Email delivery preferences"]}
    />
  );
}
