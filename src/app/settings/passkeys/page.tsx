import { redirect } from "next/navigation";

export default function LegacyPasskeySettingsCallbackPage() {
  redirect("/admin/user/security?stepUp=complete");
}
