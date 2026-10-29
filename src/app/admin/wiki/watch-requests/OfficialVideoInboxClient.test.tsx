import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { OfficialVideoInboxClient } from "./OfficialVideoInboxClient";
import { useAuthStore } from "@/gateways/auth/authStore";
import { I18nProvider, dictionaries } from "@/i18n/I18nProvider";
const navigation = vi.hoisted(() => ({
  pathname: "/admin/wiki/watch-requests",
  push: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ push: navigation.push }),
}));
vi.mock("../WikiSectionProvider", () => ({
  useWikiSection: () => ({
    principalState: { status: "available", principal: { status: "active" } },
  }),
}));
vi.mock("@/components/Wiki/WikiVideoPanel", () => ({
  WikiVideoPanel: (props: {
    slug: string;
    officialInboxWikiIdentifier: string;
    officialInboxUnwatchedOnly: boolean;
  }) => (
    <p data-testid="panel" data-unwatched-only={props.officialInboxUnwatchedOnly}>
      {props.slug}:{props.officialInboxWikiIdentifier}
    </p>
  ),
}));
const id = "00000000-0000-4000-8000-000000000001";
const other = "00000000-0000-4000-8000-000000000002";
const wikis = [
  {
    wikiIdentifier: id,
    name: "Owner",
    language: "ja",
    slug: "ta-owner",
    resourceType: "talent",
  },
  {
    wikiIdentifier: other,
    name: "Second",
    language: "en",
    slug: "ta-second",
    resourceType: "talent",
  },
];
const fetcher = vi.fn();
beforeEach(() => {
  navigation.pathname = "/admin/wiki/watch-requests";
  navigation.push.mockReset();
  useAuthStore.setState({
    status: "authenticated",
    identity: null,
    sessionVersion: 1,
  });
  fetcher.mockReset().mockResolvedValue(Response.json({ wikis }));
  vi.stubGlobal("fetch", fetcher);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function mount(
  child = <OfficialVideoInboxClient />,
  locale: "en" | "ja" | "ko" = "en",
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const result = render(
    <QueryClientProvider client={client}>
      <I18nProvider initialLocale={locale}>{child}</I18nProvider>
    </QueryClientProvider>,
  );
  return { client, ...result };
}
it("resolves browser authentication on a fresh direct admin load", async () => {
  const refreshIdentity = vi.fn().mockImplementation(async () => {
    useAuthStore.setState({ status: "authenticated", sessionVersion: 1 });
    return null;
  });
  const original = useAuthStore.getState().refreshIdentity;
  useAuthStore.setState({
    status: "loading",
    identity: null,
    sessionVersion: 0,
    refreshIdentity,
  });
  const result = mount();
  await waitFor(() => expect(refreshIdentity).toHaveBeenCalledTimes(1));
  expect(await screen.findByTestId("panel")).toBeVisible();
  result.unmount();
  useAuthStore.setState({ refreshIdentity: original });
});
it("selects the current language by default and switches using exact owner URLs", async () => {
  mount();
  expect(await screen.findByTestId("panel")).toHaveTextContent("ta-second");
  const filter = screen.getByRole("checkbox", { name: "Unwatched only" });
  expect(filter).toBeChecked();
  expect(screen.getByTestId("panel")).toHaveAttribute("data-unwatched-only", "true");
  fireEvent.click(filter);
  expect(screen.getByTestId("panel")).toHaveAttribute("data-unwatched-only", "false");
  fireEvent.change(screen.getByRole("combobox"), { target: { value: id } });
  expect(navigation.push).toHaveBeenCalledWith(
    `/admin/wiki/watch-requests/${id}`,
  );
});
it("restores the exact Wiki from the direct link regardless of display language", async () => {
  navigation.pathname += `/${id}`;
  mount();
  expect(await screen.findByTestId("panel")).toHaveTextContent(
    `ta-owner:${id}`,
  );
});
it("never falls back to another Wiki for an inaccessible URL", async () => {
  navigation.pathname += "/00000000-0000-4000-8000-000000000099";
  mount();
  expect(await screen.findByRole("alert")).toHaveTextContent(
    dictionaries.en.admin.officialVideoInbox.forbidden,
  );
  expect(screen.queryByTestId("panel")).toBeNull();
});
it.each([401, 403, 502])(
  "handles inbox fetch status %s without rendering videos",
  async (status) => {
    fetcher.mockResolvedValue(Response.json({}, { status }));
    mount();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      status === 502
        ? dictionaries.en.wiki.videos.error
        : dictionaries.en.admin.officialVideoInbox.forbidden,
    );
    expect(screen.queryByTestId("panel")).toBeNull();
  },
);
it("retries a failed list", async () => {
  fetcher.mockResolvedValueOnce(Response.json({}, { status: 502 }));
  mount();
  fireEvent.click(
    await screen.findByRole("button", {
      name: dictionaries.en.wiki.videos.retry,
    }),
  );
  expect(await screen.findByTestId("panel")).toBeVisible();
});
it.each(["en", "ja", "ko"] as const)(
  "renders localized empty state in %s",
  async (locale) => {
    fetcher.mockResolvedValue(Response.json({ wikis: [] }));
    mount(undefined, locale);
    expect(
      await screen.findByText(
        dictionaries[locale].admin.officialVideoInbox.empty,
      ),
    ).toBeVisible();
  },
);
it("removes cached owner content immediately on account/session change", async () => {
  mount();
  await screen.findByTestId("panel");
  fetcher.mockImplementation(() => new Promise(() => {}));
  act(() => useAuthStore.setState({ sessionVersion: 2 }));
  expect(screen.queryByTestId("panel")).toBeNull();
  expect(screen.getByRole("status")).toBeVisible();
});
it("retains the player during background ownership refresh", async () => {
  const { client } = mount();
  await screen.findByTestId("panel");
  fetcher.mockImplementation(() => new Promise(() => {}));
  act(() => {
    void client.invalidateQueries({ queryKey: ["official-video-wikis"] });
  });
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
  expect(screen.getByTestId("panel")).toBeVisible();
});
