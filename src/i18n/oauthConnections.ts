import type { Locale } from "./locales";
type ConnectionsDictionary = {
  title: string;
  verificationRequired: string;
  verify: string;
  verificationCancelled: string;
  introduction: string;
  future: string;
  scopes: string;
  selectAll: string;
  save: string;
  saving: string;
  saved: string;
  list: string;
  empty: string;
  loading: string;
  failed: string;
  session: string;
  login: string;
  revoke: string;
  confirm: string;
  impact: string;
  cancel: string;
  proceed: string;
  revoking: string;
  done: string;
  already: string;
};
export const oauthConnectionsDictionaries: Record<
  Locale,
  ConnectionsDictionary
> = {
  ja: {
    title: "外部連携",
    verificationRequired: "外部連携の確認・変更やアクセスの許可には本人確認が必要です。",
    verify: "本人確認する",
    verificationCancelled: "本人確認をキャンセルしました。",
    introduction:
      "外部サービスとの連携時に許可する操作を選べます。この設定は、利用するアカウントにかかわらず共通です。",
    future:
      "変更は今後の連携に適用されます。すでに連携中のサービスへの許可を取り消すには、連携一覧から連携を解除してください。",
    scopes: "スコープ設定",
    selectAll: "すべて選択",
    save: "保存",
    saving: "保存中…",
    saved: "許可 Scope 設定を保存しました。",
    list: "連携一覧",
    empty: "未連携",
    loading: "外部連携を読み込み中…",
    failed: "通信に失敗しました。再試行してください。",
    session: "セッションが切れました。再度ログインしてください。",
    login: "ログイン",
    revoke: "連携解除",
    confirm: "連携解除の確認",
    impact:
      "この接続からの操作とトークン更新ができなくなります。同じクライアントの別の接続は解除しません。",
    cancel: "キャンセル",
    proceed: "解除する",
    revoking: "解除中…",
    done: "連携を解除しました。この接続からの操作とトークン更新はできません。",
    already: "この接続は既に解除済み、または存在しません。",
  },
  en: {
    title: "External connections",
    verificationRequired: "Verify your identity to view or change external connections and grant access.",
    verify: "Verify identity",
    verificationCancelled: "Identity verification was cancelled.",
    introduction:
      "Choose which actions you can allow when connecting an external service. These settings apply across all your accounts.",
    future:
      "Changes apply to future connections. To remove access for a service already connected, revoke its connection in the list below.",
    scopes: "Scope settings",
    selectAll: "Select all",
    save: "Save",
    saving: "Saving…",
    saved: "Allowed scopes saved.",
    list: "Connections",
    empty: "Not connected",
    loading: "Loading external connections…",
    failed: "Connection failed. Please retry.",
    session: "Your session expired. Please log in again.",
    login: "Log in",
    revoke: "Revoke connection",
    confirm: "Confirm revocation",
    impact:
      "This connection will no longer be able to perform operations or refresh tokens. Other connections for the same client will not be revoked.",
    cancel: "Cancel",
    proceed: "Revoke",
    revoking: "Revoking…",
    done: "Connection revoked. Operations and token refresh are no longer available for this connection.",
    already: "This connection is already revoked or no longer exists.",
  },
  ko: {
    title: "외부 연결",
    verificationRequired: "외부 연결을 확인·변경하거나 접근을 허용하려면 본인 확인이 필요합니다.",
    verify: "본인 확인",
    verificationCancelled: "본인 확인을 취소했습니다.",
    introduction:
      "외부 서비스를 연결할 때 허용할 작업을 선택할 수 있습니다. 이 설정은 사용하는 계정과 관계없이 공통으로 적용됩니다.",
    future:
      "변경 사항은 앞으로 연결할 서비스에 적용됩니다. 이미 연결된 서비스의 권한을 취소하려면 아래 연결 목록에서 연결을 해제하세요.",
    scopes: "스코프 설정",
    selectAll: "모두 선택",
    save: "저장",
    saving: "저장 중…",
    saved: "허용 Scope 설정을 저장했습니다.",
    list: "연결 목록",
    empty: "연결되지 않음",
    loading: "외부 연결 불러오는 중…",
    failed: "통신에 실패했습니다. 다시 시도하세요.",
    session: "세션이 만료되었습니다. 다시 로그인하세요.",
    login: "로그인",
    revoke: "연결 해제",
    confirm: "연결 해제 확인",
    impact:
      "이 연결에서 작업 및 토큰 갱신을 할 수 없게 됩니다. 같은 클라이언트의 다른 연결은 해제하지 않습니다.",
    cancel: "취소",
    proceed: "해제",
    revoking: "해제 중…",
    done: "연결을 해제했습니다. 이 연결에서는 작업과 토큰 갱신을 할 수 없습니다.",
    already: "이미 해제되었거나 존재하지 않는 연결입니다.",
  },
};
