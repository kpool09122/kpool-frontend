import { MypageRoutePage } from "../../MypageRoutePage";

export const dynamic = "force-dynamic";

export default function Page() {
  return MypageRoutePage({
    loginReturnTo: "/mypage/wiki/image-deletion-requests",
    section: "wiki",
    wikiTab: "imageDeletionRequests",
  });
}
