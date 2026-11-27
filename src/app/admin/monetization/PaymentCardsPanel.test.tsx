import { loadStripe } from "@stripe/stripe-js/pure";
import { useEffect } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { MonetizationPrincipal } from "@/gateways/monetization/monetizationPrincipal";
import { PaymentCardsPanel } from "./PaymentCardsPanel";
import { paymentCardsDictionaries } from "@/i18n/paymentCards";
const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  prepare: vi.fn(),
  complete: vi.fn(),
  delete: vi.fn(),
  confirm: vi.fn(),
  refresh: vi.fn(),
  verified: null as null | (() => unknown),
}));
vi.mock("@/gateways/monetization/paymentCards", async (load) => ({
  ...(await load<typeof import("@/gateways/monetization/paymentCards")>()),
  paymentCardsApi: mocks,
}));
vi.mock("@stripe/stripe-js/pure", () => ({
  loadStripe: vi.fn().mockResolvedValue({}),
}));
vi.mock("@stripe/react-stripe-js", () => ({
  Elements: ({ children }: { children: React.ReactNode }) => children,
  CardElement: ({ onReady }: { onReady: () => void }) => {
    useEffect(() => {
      onReady();
    }, [onReady]);
    return <div aria-label="Stripe secure card input" />;
  },
  useStripe: () => ({ confirmCardSetup: mocks.confirm }),
  useElements: () => ({ getElement: () => ({}) }),
}));
vi.mock("@/components/User/ExternalConnectionVerification", () => ({
  ExternalConnectionVerification: ({
    onVerified,
  }: {
    onVerified: () => unknown;
  }) => (
    <button
      onClick={() => {
        mocks.verified = onVerified;
        void onVerified();
      }}
    >
      Verify
    </button>
  ),
}));
const id = "11111111-1111-4111-8111-111111111111";
const card = {
  paymentMethodIdentifier: id,
  type: "card" as const,
  brand: "visa",
  last4: "4242",
  expMonth: 12,
  expYear: 2030,
  isDefault: true,
  status: "active" as const,
  archivedAt: null,
};
const t = paymentCardsDictionaries.ja;
const principal: MonetizationPrincipal = {
  principalIdentifier: id,
  identityIdentifier: id,
  status: "active" as const,
  accountPrincipalCount: 1,
  policies: [
    {
      policyIdentifier: id,
      name: "Owner",
      statements: [
        {
          effect: "allow" as const,
          actions: [
            "payment_method_read",
            "card_registration_prepare",
            "payment_method_register",
            "payment_method_delete",
          ],
          resourceTypes: ["payment_method"],
          condition: null,
        },
      ],
    },
  ],
};
function panel(scope = "account-A", p = principal) {
  return (
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <PaymentCardsPanel
        key={scope}
        scope={scope}
        accountIdentifier={id}
        principal={p}
        t={t}
        refreshAccess={mocks.refresh}
      />
    </QueryClientProvider>
  );
}
beforeEach(() => {
  sessionStorage.clear();
  vi.stubEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "pk_test_fixture");
  mocks.list
    .mockReset()
    .mockResolvedValue({ ok: true, data: { paymentMethods: [] } });
  mocks.prepare
    .mockReset()
    .mockResolvedValue({
      ok: true,
      data: {
        setupIntentIdentifier: "seti_fixture",
        clientSecret: "seti_fixture_secret_PRIVATE",
      },
    });
  mocks.complete.mockReset().mockResolvedValue({ ok: true, data: card });
  mocks.delete.mockReset().mockResolvedValue({ ok: true });
  mocks.confirm
    .mockReset()
    .mockResolvedValue({
      setupIntent: { id: "seti_fixture", status: "succeeded" },
    });
  mocks.refresh.mockReset().mockResolvedValue(undefined);
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});
async function start() {
  const add = await screen.findByRole("button", { name: t.add });
  await waitFor(() => expect(add).toBeEnabled());
  fireEvent.click(add);
  await screen.findByLabelText("Stripe secure card input");
  await waitFor(() =>
    expect(screen.getByRole("button", { name: t.save })).toBeEnabled(),
  );
}
it("shows empty state, confirms with Stripe and waits for authoritative backend completion", async () => {
  let complete!: (v: unknown) => void;
  mocks.complete.mockImplementation(
    () =>
      new Promise((r) => {
        complete = r;
      }),
  );
  const view = render(panel());
  await screen.findByText(t.empty);
  await start();
  fireEvent.click(screen.getByRole("button", { name: t.save }));
  await waitFor(() =>
    expect(mocks.complete).toHaveBeenCalledWith("seti_fixture"),
  );
  expect(screen.queryByText(t.saved)).not.toBeInTheDocument();
  mocks.list.mockResolvedValue({ ok: true, data: { paymentMethods: [card] } });
  await act(async () => complete({ ok: true, data: card }));
  expect(await screen.findByText(t.saved)).toBeInTheDocument();
  expect(screen.getByText(/4242/)).toBeInTheDocument();
  expect(JSON.stringify(mocks.complete.mock.calls)).not.toContain("secret");
  expect(sessionStorage.length).toBe(0);
  view.unmount();
});
it("deletes only the confirmed card then the final card to reach zero", async () => {
  const second = {
    ...card,
    paymentMethodIdentifier: "22222222-2222-4222-8222-222222222222",
    last4: "4444",
  };
  mocks.list.mockResolvedValue({
    ok: true,
    data: { paymentMethods: [card, second] },
  });
  render(panel());
  await screen.findByText(/4444/);
  fireEvent.click(screen.getAllByRole("button", { name: t.remove })[0]);
  expect(mocks.delete).not.toHaveBeenCalled();
  mocks.list.mockResolvedValue({
    ok: true,
    data: { paymentMethods: [second] },
  });
  fireEvent.click(
    within(screen.getByRole("dialog")).getByRole("button", {
      name: t.confirmDelete,
    }),
  );
  await waitFor(() =>
    expect(screen.queryByText(/4242/)).not.toBeInTheDocument(),
  );
  expect(mocks.delete).toHaveBeenCalledWith(id);
  fireEvent.click(screen.getByRole("button", { name: t.remove }));
  mocks.list.mockResolvedValue({ ok: true, data: { paymentMethods: [] } });
  fireEvent.click(
    within(screen.getByRole("dialog")).getByRole("button", {
      name: t.confirmDelete,
    }),
  );
  expect(await screen.findByText(t.empty)).toBeInTheDocument();
  expect(mocks.delete).toHaveBeenLastCalledWith(second.paymentMethodIdentifier);
});
it.each(["authentication_failure", "authentication_canceled"])(
  "does not register Stripe %s; keeps the same SetupIntent for retry",
  async (code) => {
    mocks.confirm.mockResolvedValueOnce({
      error: { code, message: "unsafe provider details" },
    });
    render(panel());
    await start();
    fireEvent.click(screen.getByRole("button", { name: t.save }));
    await screen.findByText(t.stripeFailed);
    expect(mocks.complete).not.toHaveBeenCalled();
    expect(
      screen.queryByText("unsafe provider details"),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: t.save }));
    await screen.findByText(t.saved);
    expect(mocks.prepare).toHaveBeenCalledTimes(1);
  },
);
it("retries failed completion without confirming Stripe or creating another intent", async () => {
  mocks.complete
    .mockResolvedValueOnce({ ok: false, status: 503 })
    .mockResolvedValue({ ok: true, data: card });
  render(panel());
  await start();
  fireEvent.click(screen.getByRole("button", { name: t.save }));
  await screen.findByText(t.completionFailed);
  fireEvent.click(screen.getByRole("button", { name: t.retryCompletion }));
  await screen.findByText(t.saved);
  expect(mocks.confirm).toHaveBeenCalledTimes(1);
  expect(mocks.prepare).toHaveBeenCalledTimes(1);
  expect(mocks.complete).toHaveBeenCalledTimes(2);
});
it("re-authenticates a pending delete and resumes the same operation", async () => {
  mocks.list.mockResolvedValue({ ok: true, data: { paymentMethods: [card] } });
  mocks.delete
    .mockResolvedValueOnce({
      ok: false,
      status: 401,
      code: "recent_authentication_required",
    })
    .mockResolvedValue({ ok: true });
  render(panel());
  await screen.findByText(/4242/);
  fireEvent.click(screen.getByRole("button", { name: t.remove }));
  fireEvent.click(
    within(screen.getByRole("dialog")).getByRole("button", {
      name: t.confirmDelete,
    }),
  );
  await screen.findByText("Verify");
  mocks.list.mockResolvedValue({ ok: true, data: { paymentMethods: [] } });
  fireEvent.click(screen.getByText("Verify"));
  await screen.findByText(t.empty);
  expect(mocks.delete).toHaveBeenCalledTimes(2);
});
it("does not use group management as card authority", async () => {
  const p = { ...principal, policies: [] };
  render(panel("account-A", p));
  expect(screen.queryByRole("button", { name: t.add })).not.toBeInTheDocument();
  expect(mocks.list).not.toHaveBeenCalled();
});
it("clears private state on forbidden response", async () => {
  mocks.list
    .mockResolvedValueOnce({ ok: true, data: { paymentMethods: [card] } })
    .mockResolvedValue({ ok: false, status: 403 });
  render(panel());
  await screen.findByText(/4242/);
  fireEvent.click(screen.getByRole("button", { name: t.refresh }));
  await screen.findByText(t.forbidden);
  expect(screen.queryByText(/4242/)).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: t.add })).not.toBeInTheDocument();
  expect(mocks.refresh).toHaveBeenCalled();
});
it("ignores late Stripe success after switching accounts", async () => {
  let finish!: (v: unknown) => void;
  mocks.confirm.mockImplementation(
    () =>
      new Promise((r) => {
        finish = r;
      }),
  );
  const view = render(panel());
  await start();
  fireEvent.click(screen.getByRole("button", { name: t.save }));
  view.rerender(panel("account-B"));
  await act(async () =>
    finish({ setupIntent: { id: "seti_fixture", status: "succeeded" } }),
  );
  expect(mocks.complete).not.toHaveBeenCalled();
  expect(screen.queryByText(t.saved)).not.toBeInTheDocument();
});
it("distinguishes committed save from failed list refresh and never replays the write", async () => {
  mocks.list
    .mockResolvedValueOnce({ ok: true, data: { paymentMethods: [] } })
    .mockResolvedValueOnce({ ok: false, status: 503 })
    .mockResolvedValue({ ok: true, data: { paymentMethods: [card] } });
  render(panel());
  await start();
  fireEvent.click(screen.getByRole("button", { name: t.save }));
  await screen.findByText(t.savedRefreshFailed);
  fireEvent.click(screen.getByRole("button", { name: t.refresh }));
  await screen.findByText(/4242/);
  expect(mocks.complete).toHaveBeenCalledTimes(1);
});
it("does not create an intent when the public Stripe key is not configured", async () => {
  vi.stubEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "");
  render(panel());
  await screen.findByText(t.empty);
  fireEvent.click(screen.getByRole("button", { name: t.add }));
  await screen.findByText(t.unconfigured);
  expect(mocks.prepare).not.toHaveBeenCalled();
});
it("cancels pending step-up without deleting a card", async () => {
  mocks.list.mockResolvedValue({ ok: true, data: { paymentMethods: [card] } });
  mocks.delete.mockResolvedValue({
    ok: false,
    status: 401,
    code: "recent_authentication_required",
  });
  render(panel());
  await screen.findByText(/4242/);
  fireEvent.click(screen.getByRole("button", { name: t.remove }));
  fireEvent.click(
    within(screen.getByRole("dialog")).getByRole("button", {
      name: t.confirmDelete,
    }),
  );
  await screen.findByText("Verify");
  fireEvent.click(screen.getByRole("button", { name: t.cancel }));
  expect(screen.queryByText("Verify")).not.toBeInTheDocument();
  expect(mocks.delete).toHaveBeenCalledTimes(1);
  expect(screen.getByText(/4242/)).toBeInTheDocument();
});
it("reports Stripe SDK load failures without completing registration", async () => {
  vi.mocked(loadStripe).mockRejectedValueOnce(new Error("unreachable"));
  render(panel());
  const add = await screen.findByRole("button", { name: t.add });
  await waitFor(() => expect(add).toBeEnabled());
  fireEvent.click(add);
  await screen.findByText(t.stripeFailed);
  expect(mocks.complete).not.toHaveBeenCalled();
});
it("preserves an in-flight operation across a locale change", async () => {
  let finish!: (v: unknown) => void;
  mocks.delete.mockImplementation(
    () =>
      new Promise((r) => {
        finish = r;
      }),
  );
  mocks.list.mockResolvedValue({ ok: true, data: { paymentMethods: [card] } });
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const element = (labels: typeof t) => (
    <QueryClientProvider client={client}>
      <PaymentCardsPanel
        scope="scope-A"
        accountIdentifier={id}
        principal={principal}
        t={labels}
        refreshAccess={mocks.refresh}
      />
    </QueryClientProvider>
  );
  const view = render(element(t));
  await screen.findByText(/4242/);
  fireEvent.click(screen.getByRole("button", { name: t.remove }));
  fireEvent.click(
    within(screen.getByRole("dialog")).getByRole("button", {
      name: t.confirmDelete,
    }),
  );
  view.rerender(element(paymentCardsDictionaries.en));
  mocks.list.mockResolvedValue({ ok: true, data: { paymentMethods: [] } });
  await act(async () => finish({ ok: true }));
  await screen.findByText(paymentCardsDictionaries.en.deleted);
  expect(
    screen.getByRole("button", { name: paymentCardsDictionaries.en.add }),
  ).toBeEnabled();
});
