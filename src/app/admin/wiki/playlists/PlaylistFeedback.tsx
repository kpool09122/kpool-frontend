"use client";

import { AccountStatusMessage } from "@/components/Account";
import { button, errorText, queryErrorStatus, type PlaylistState, type Text } from "./playlistUi";

export function PlaylistFeedback({ state, t, showLikes }: {
  state: PlaylistState;
  t: Text;
  showLikes: boolean;
}) {
  const listError = state.list.isError ? queryErrorStatus(state.list.error) : null;
  const likesError = showLikes && state.likes.isError ? queryErrorStatus(state.likes.error) : null;
  const operationError = state.error !== listError && state.error !== likesError ? state.error : null;
  const refreshFailed = state.notice?.endsWith("RefreshFailed") ?? false;

  return (
    <div className="mt-5 space-y-3">
      {state.busy || state.list.isPending || (showLikes && state.likes.isPending) ? (
        <p role="status">{t.loading}</p>
      ) : null}
      {operationError !== null ? (
        <AccountStatusMessage variant="error">{errorText(operationError, t)}</AccountStatusMessage>
      ) : null}
      {listError !== null ? (
        <AccountStatusMessage variant="error" action={
          <button type="button" className={`${button} mt-3`} disabled={state.busy || state.list.isFetching}
            onClick={() => void state.list.refetch()}>{t.retry}</button>
        }>
          {errorText(listError, t)}
        </AccountStatusMessage>
      ) : null}
      {likesError !== null ? (
        <AccountStatusMessage variant="error" action={
          <button type="button" className={`${button} mt-3`} disabled={state.likes.isFetching}
            onClick={() => void state.likes.refetch()}>{t.retry}</button>
        }>
          {errorText(likesError, t)}
        </AccountStatusMessage>
      ) : null}
      {state.notice ? (
        <AccountStatusMessage variant={refreshFailed ? "warning" : "success"}>{t[state.notice]}</AccountStatusMessage>
      ) : null}
      {state.committed ? (
        <div className="flex flex-wrap gap-3">
          <button type="button" className={button} disabled={state.busy} onClick={() => void state.refreshSaved()}>{t.retry}</button>
          <button type="button" className={button} disabled={state.busy} onClick={state.close}>{t.close}</button>
        </div>
      ) : null}
    </div>
  );
}
