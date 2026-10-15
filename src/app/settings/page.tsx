import type { Metadata } from "next";
import { SettingsView } from "@/views/SettingsView";

export const metadata: Metadata = { title: "Account Settings" };

export default function Page() {
  return <SettingsView />;
}
