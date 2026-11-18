import type { Locale } from "./locales";

type ConsentDictionary = {
  request: string; emptyTitle: string; title: string; introduction: string; accounts: string; business: string; scopesTitle: string;
  approve: string; cancel: string; loading: string; sending: string; complete: string;
  empty: string; settings: string; changed: string; forbidden: string; invalid: string;
  failed: string; invalidInput: string; login: string; session: string; restart: string;
  descriptions: Record<string, string>;
};
export const oauthConsentDictionaries: Record<Locale, ConsentDictionary> = {
  ja: {
    request: "が k-pool へのアクセスを求めています", emptyTitle: "許可できる操作がありません", title: "外部アプリへの接続", introduction: "接続先アプリと許可する操作範囲を確認してください。",
    accounts: "許可した操作は、現在または将来あなたが切り替えられるすべてのアカウントに適用されます。",
    business: "アプリが操作できるのは、あなたに業務上の権限がある範囲です。現在選択中のアカウントは変わりません。",
    scopesTitle: "許可する操作を1件以上選択", approve: "承認", cancel: "キャンセル", loading: "同意内容を読み込み中…", sending: "送信中…", complete: "接続先に移動します…",
    empty: "このアプリを接続するには、外部アプリに許可する操作を設定してください。", settings: "許可する操作を設定",
    changed: "許可設定が変更されたか、選択内容が拒否されました。最新内容を確認して選択し直すか、認可をやり直してください。",
    forbidden: "Account または業務権限が変更されたため認可できません。権限を確認して認可をやり直してください。",
    invalid: "この認可要求は期限切れ・完了済み、または別タブの新しい要求で無効になりました。認可をやり直してください。",
    failed: "通信または送信に失敗しました。再試行するか、認可をやり直してください。",
    invalidInput: "認可要求が不正です。接続元アプリから認可をやり直してください。", login: "ログイン", session: "ログインが必要か、セッションが切れました。ログインして認可をやり直してください。", restart: "認可をやり直す",
    descriptions: { "wiki:read": "公開 Wiki の取得", "wiki-drafts:read": "下書き Wiki の取得", "wiki-drafts:write": "下書き Wiki の作成・編集", "wiki-drafts:submit": "下書き Wiki の提出", "wiki-images:read": "運営向け Wiki 画像一覧の取得", "wiki-images:write": "運営向け Wiki 画像メタデータの編集" },
  },
  en: {
    request: "is requesting access to k-pool", emptyTitle: "No operations are available", title: "Connect an external app", introduction: "Review the app and the operations you wish to allow.",
    accounts: "Approved operations apply to all accounts you can switch to now or in the future.",
    business: "Operations also require your current business permissions. Your currently selected account will not change.",
    scopesTitle: "Select one or more operations", approve: "Approve", cancel: "Cancel", loading: "Loading consent…", sending: "Sending…", complete: "Redirecting to the app…",
    empty: "To connect this app, configure the operations external apps may access.", settings: "Configure allowed operations",
    changed: "Your allowed scopes changed or your selection was rejected. Review and select from the latest details, or restart authorization.",
    forbidden: "Your Account or business permissions changed. Check your permissions and restart authorization.",
    invalid: "This request expired, was completed, or was replaced by a newer request in another tab. Restart authorization.",
    failed: "The request or connection failed. Retry or restart authorization.", invalidInput: "Invalid authorization request. Restart from the connecting app.", login: "Log in", session: "Log in again to restart authorization; your session may have expired.", restart: "Restart authorization",
    descriptions: { "wiki:read": "Read public Wiki", "wiki-drafts:read": "Read Draft Wiki", "wiki-drafts:write": "Create and edit Draft Wiki", "wiki-drafts:submit": "Submit Draft Wiki", "wiki-images:read": "Read the staff Wiki image list", "wiki-images:write": "Edit staff Wiki image metadata" },
  },
  ko: {
    request: "앱이 k-pool 접근을 요청합니다", emptyTitle: "허용할 수 있는 작업이 없습니다", title: "외부 앱 연결", introduction: "연결할 앱과 허용할 작업 범위를 확인하세요.",
    accounts: "허용한 작업은 현재 또는 향후 전환할 수 있는 모든 계정에 적용됩니다.",
    business: "실제 작업에는 해당 시점의 업무 권한도 필요합니다. 현재 선택한 계정은 변경되지 않습니다.",
    scopesTitle: "허용할 작업을 하나 이상 선택", approve: "승인", cancel: "취소", loading: "동의 내용 불러오는 중…", sending: "전송 중…", complete: "앱으로 이동합니다…",
    empty: "이 앱을 연결하려면 외부 앱에 허용할 작업을 설정하세요.", settings: "허용할 작업 설정",
    changed: "허용 설정이 변경되었거나 선택이 거부되었습니다. 최신 내용을 확인하여 다시 선택하거나 인증을 다시 시작하세요.",
    forbidden: "Account 또는 업무 권한이 변경되어 승인할 수 없습니다. 권한을 확인하고 다시 시작하세요.",
    invalid: "만료되거나 완료된 요청 또는 다른 탭의 새 요청으로 대체된 요청입니다. 인증을 다시 시작하세요.",
    failed: "통신 또는 전송에 실패했습니다. 재시도하거나 인증을 다시 시작하세요.", invalidInput: "잘못된 인증 요청입니다. 연결할 앱에서 다시 시작하세요.", login: "로그인", session: "로그인이 필요하거나 세션이 만료되었습니다. 다시 로그인하여 인증을 시작하세요.", restart: "인증 다시 시작",
    descriptions: { "wiki:read": "공개 Wiki 조회", "wiki-drafts:read": "Draft Wiki 조회", "wiki-drafts:write": "Draft Wiki 생성·편집", "wiki-drafts:submit": "Draft Wiki 제출", "wiki-images:read": "운영용 Wiki 이미지 목록 조회", "wiki-images:write": "운영용 Wiki 이미지 메타데이터 편집" },
  },
};
