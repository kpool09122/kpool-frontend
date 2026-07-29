import { MypageRoutePage } from "../../MypageRoutePage";

export const dynamic = "force-dynamic";

export default function Page() {
  return MypageRoutePage({
    loginReturnTo: "/mypage/wiki/draft-images",
    section: "wiki",
    wikiTab: "draftImages",
  });
}
