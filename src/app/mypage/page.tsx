export default function MyPage() {
  return (
    <main className="min-h-[calc(100vh-73px)] bg-surface-base px-6 py-12 text-text-strong sm:px-10 lg:px-16">
      <div className="mx-auto max-w-4xl space-y-4">
        <p className="text-sm font-semibold uppercase tracking-[0.08em] text-brand-primary">
          My Page
        </p>
        <h1 className="text-3xl font-bold">マイページ</h1>
        <p className="text-sm leading-7 text-text-muted">
          ログイン後の導線確認用ページです。プロフィールやアカウント管理は今後追加します。
        </p>
      </div>
    </main>
  );
}
