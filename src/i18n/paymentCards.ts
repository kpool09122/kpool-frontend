import type { Locale } from "./locales";
export type PaymentCardsLabels = {
  title: string;
  description: string;
  empty: string;
  add: string;
  save: string;
  remove: string;
  confirmDelete: string;
  deleteQuestion: string;
  cancel: string;
  refresh: string;
  loading: string;
  busy: string;
  saved: string;
  deleted: string;
  failed: string;
  forbidden: string;
  stripeFailed: string;
  completionFailed: string;
  retryCompletion: string;
  savedRefreshFailed: string;
  deletedRefreshFailed: string;
  unconfigured: string;
  resume: string;
  resumeDescription: string;
  expiry: string;
  stepUpRequired: string;
  cancelled: string;
};
export const paymentCardsDictionaries: Record<Locale, PaymentCardsLabels> = {
  ja: {
    stepUpRequired: "カードの登録・削除を続けるには本人確認が必要です。",
    title: "支払い用カード",
    description:
      "カード情報はStripeへ直接送信されます。登録・削除はアカウントのオーナーだけが行えます。",
    empty: "登録済みカードはありません。",
    add: "カードを追加",
    save: "カードを登録",
    remove: "削除",
    confirmDelete: "このカードを削除",
    deleteQuestion: "このカードを削除しますか？最後の1枚も削除できます。",
    cancel: "キャンセル",
    refresh: "一覧を更新",
    loading: "カードを読み込み中…",
    busy: "処理中…",
    saved: "カードを登録しました。",
    deleted: "カードを削除しました。",
    failed: "処理できませんでした。時間をおいて再試行してください。",
    forbidden: "カードを操作する権限がありません。",
    stripeFailed:
      "Stripeで確認できませんでした。追加認証がキャンセルされた場合も、再試行できます。",
    completionFailed:
      "Stripeでの確認は完了しましたが、アプリへの登録を確認できませんでした。同じ登録完了通知を再試行してください。",
    retryCompletion: "登録完了通知を再試行",
    savedRefreshFailed:
      "カードの登録は完了しましたが、一覧を更新できませんでした。",
    deletedRefreshFailed:
      "カードの削除は完了しましたが、一覧を更新できませんでした。",
    unconfigured: "カード登録の設定が利用できません。",
    resume: "操作を再開",
    resumeDescription:
      "再認証前の操作を再開できます。対象を確認して続行してください。",
    expiry: "有効期限",
    cancelled: "操作をキャンセルしました。",
  },
  en: {
    stepUpRequired:
      "Verify your identity to continue registering or deleting a card.",
    title: "Payment cards",
    description:
      "Card details are sent directly to Stripe. Only account owners can register or delete cards.",
    empty: "No registered cards.",
    add: "Add card",
    save: "Register card",
    remove: "Delete",
    confirmDelete: "Delete this card",
    deleteQuestion: "Delete this card? You can delete the last card too.",
    cancel: "Cancel",
    refresh: "Refresh list",
    loading: "Loading cards…",
    busy: "Working…",
    saved: "Card registered.",
    deleted: "Card deleted.",
    failed: "Could not complete the operation. Please retry later.",
    forbidden: "You do not have permission to manage cards.",
    stripeFailed: "Stripe verification failed or was cancelled. You can retry.",
    completionFailed:
      "Stripe verification succeeded, but app registration could not be confirmed. Retry the same completion notification.",
    retryCompletion: "Retry registration completion",
    savedRefreshFailed: "Card registered, but the list could not be refreshed.",
    deletedRefreshFailed: "Card deleted, but the list could not be refreshed.",
    unconfigured: "Card registration is not configured.",
    resume: "Resume operation",
    resumeDescription:
      "You can resume the operation from before verification. Check the target before continuing.",
    expiry: "Expires",
    cancelled: "Operation cancelled.",
  },
  ko: {
    stepUpRequired: "카드 등록 또는 삭제를 계속하려면 본인 인증이 필요합니다.",
    title: "결제 카드",
    description:
      "카드 정보는 Stripe로 직접 전송됩니다. 계정 소유자만 카드를 등록하거나 삭제할 수 있습니다.",
    empty: "등록된 카드가 없습니다.",
    add: "카드 추가",
    save: "카드 등록",
    remove: "삭제",
    confirmDelete: "이 카드 삭제",
    deleteQuestion:
      "이 카드를 삭제하시겠습니까? 마지막 카드도 삭제할 수 있습니다.",
    cancel: "취소",
    refresh: "목록 새로고침",
    loading: "카드 불러오는 중…",
    busy: "처리 중…",
    saved: "카드를 등록했습니다.",
    deleted: "카드를 삭제했습니다.",
    failed: "처리하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    forbidden: "카드를 관리할 권한이 없습니다.",
    stripeFailed:
      "Stripe 인증에 실패했거나 취소되었습니다. 다시 시도할 수 있습니다.",
    completionFailed:
      "Stripe 인증은 완료되었지만 앱 등록을 확인하지 못했습니다. 동일한 등록 완료 알림을 다시 시도해 주세요.",
    retryCompletion: "등록 완료 알림 재시도",
    savedRefreshFailed: "카드를 등록했지만 목록을 새로고침하지 못했습니다.",
    deletedRefreshFailed: "카드를 삭제했지만 목록을 새로고침하지 못했습니다.",
    unconfigured: "카드 등록이 설정되지 않았습니다.",
    resume: "작업 재개",
    resumeDescription:
      "인증 전 작업을 재개할 수 있습니다. 대상을 확인한 후 계속하세요.",
    expiry: "유효기간",
    cancelled: "작업을 취소했습니다.",
  },
};
