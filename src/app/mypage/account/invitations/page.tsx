import { MypageRoutePage } from "../../MypageRoutePage";

export const dynamic = "force-dynamic";

export default function Page() {
  return MypageRoutePage({
    loginReturnTo: "/mypage/account/invitations",
    section: "accountSettings",
    accountSettingsTab: "accountInvitations",
  });
}
