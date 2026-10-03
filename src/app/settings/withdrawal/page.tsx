import { redirect } from "next/navigation";

export default function LegacyWithdrawalSettingsCallbackPage() {
  redirect("/admin/user/other?stepUp=complete");
}
