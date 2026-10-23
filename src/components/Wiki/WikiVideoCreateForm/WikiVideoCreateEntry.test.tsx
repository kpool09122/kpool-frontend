import React from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import { I18nProvider } from "@/i18n/I18nProvider";
import { useAuthStore } from "@/gateways/auth/authStore";
import { WikiVideoCreateEntry } from "./WikiVideoCreateEntry";
const mount = (
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) =>
  render(
    <QueryClientProvider client={client}>
      <I18nProvider initialLocale="en">
        <WikiVideoCreateEntry
          wikiIdentifier="11111111-1111-4111-8111-111111111111"
          resourceType="group"
        />
      </I18nProvider>
    </QueryClientProvider>,
  );
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  useAuthStore.setState({
    status: "loading",
    identity: null,
    sessionVersion: 0,
  });
});
it.each([false, true])(
  "shows the form only after authenticated permission result (%s)",
  async (canCreate) => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ canCreate })),
    );
    mount();
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
    if (canCreate) {
      expect(
        await screen.findByRole("form", { name: "Add video" }),
      ).toBeInTheDocument();
      act(() => useAuthStore.getState().clearIdentity());
      expect(screen.queryByRole("form")).not.toBeInTheDocument();
    } else {
      await act(async () => {});
      expect(screen.queryByRole("form")).not.toBeInTheDocument();
    }
  },
);
it("preserves draft during permission refetch but removes it on revocation", async () => {
  let resolve!: (value: Response) => void;
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ canCreate: true }))
    .mockImplementationOnce(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
  vi.stubGlobal("fetch", fetcher);
  const client = new QueryClient();
  mount(client);
  await screen.findByRole("form", { name: "Add video" });
  fireEvent.change(screen.getByLabelText("Video title"), {
    target: { value: "Draft title" },
  });
  act(() => {
    void client.invalidateQueries({ queryKey: ["wiki-video-create-access"] });
  });
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
  expect(screen.getByLabelText("Video title")).toHaveValue("Draft title");
  await act(async () => resolve(Response.json({ canCreate: false })));
  await waitFor(() =>
    expect(screen.queryByRole("form")).not.toBeInTheDocument(),
  );
});
it("does not reuse a previous session's grant while a new access request is pending", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ canCreate: true }))
    .mockImplementation(() => new Promise(() => {}));
  vi.stubGlobal("fetch", fetcher);
  mount();
  await screen.findByRole("form", { name: "Add video" });
  act(() => useAuthStore.setState({ sessionVersion: 1 }));
  expect(screen.queryByRole("form")).not.toBeInTheDocument();
});
it("does not request access or expose add controls for a known guest", () => {
  useAuthStore.setState({ status: "guest", identity: null });
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  mount();
  expect(screen.queryByRole("form")).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Save video" }),
  ).not.toBeInTheDocument();
  expect(fetcher).not.toHaveBeenCalled();
});
