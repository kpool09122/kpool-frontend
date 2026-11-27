import { expect, test } from "./fixtures";
import { paymentCardsDictionaries } from "../../src/i18n/paymentCards";
const actor = "11111111-1111-1111-1111-111111111111",
  account = "22222222-2222-2222-2222-222222222222",
  principalId = "33333333-3333-3333-3333-333333333333",
  group = "66666666-6666-4666-8666-666666666666";
const identity = {
  identityIdentifier: actor,
  identityName: "member",
  email: "member@example.com",
  language: "ja",
  accountIdentifier: account,
  accountPrincipalIdentifier: principalId,
  accountPrincipalStatus: "active",
  accountIdentityCount: 2,
  accountType: "individual",
  accountPolicies: [],
  siteManagementPrincipalStatus: "active",
  siteManagementPolicies: [],
  account: {
    accountIdentifier: account,
    name: "Member Account",
    email: "member@example.com",
    status: "active",
    type: "individual",
    accountCategory: "general",
    phone: null,
    address: null,
  },
  originalAccount: null,
  delegationIdentifier: null,
  switchableAccounts: [],
  authenticationMethods: { passkeyCount: 0, linkedSocialProviders: ["google"] },
};
const principal = {
  principalIdentifier: principalId,
  identityIdentifier: actor,
  status: "active",
  accountPrincipalCount: 2,
  policies: [
    {
      policyIdentifier: group,
      name: "Owner",
      statements: [
        {
          effect: "allow",
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
const card = {
  paymentMethodIdentifier: group,
  type: "card",
  brand: "visa",
  last4: "4242",
  expMonth: 12,
  expYear: 2030,
  isDefault: true,
  status: "active",
  archivedAt: null,
};
// Stripe SDK-boundary fixture, not Stripe's actual iframe/service or a real 3DS flow.
const stripeFixture = `window.__cardConfirmCount = 0; window.Stripe = function () {
 const card = { on(name, callback) { if (name === 'ready') setTimeout(callback, 0); }, off() {}, mount(target) { target.textContent = 'Stripe secure card input (fixture)'; }, unmount() {}, destroy() {}, update() {} };
 return { _registerWrapper() {}, registerAppInfo() {}, elements() { return { create() { return card; }, getElement() { return card; }, update() {} }; }, createToken() {}, createPaymentMethod() {}, confirmCardPayment() {}, async confirmCardSetup() { window.__cardConfirmCount++; return { setupIntent: { id: 'seti_fixture', status: 'succeeded' } }; } };
};`;
for (const locale of ["ja", "en", "ko"] as const)
  for (const width of [1280, 390])
    test(`card SDK fixture: ${locale} ${width}px add, completion retry, delete to zero`, async ({
      page,
    }, info) => {
      const t = paymentCardsDictionaries[locale];
      await page.setViewportSize({ width, height: 900 });
      await page.context().addCookies(
        [
          ["kpool-mock-account-status", "active"],
          ["kpool-locale", locale],
        ].map(([name, value]) => ({
          name,
          value,
          domain: "127.0.0.1",
          path: "/",
        })),
      );
      await page.route("**/api/identity/auth/me", (route) =>
        route.fulfill({ json: { ...identity, language: locale } }),
      );
      await page.route("**/api/monetization/principal/me", (route) =>
        route.fulfill({ json: principal }),
      );
      await page.route("https://js.stripe.com/**", (route) =>
        route.fulfill({
          contentType: "application/javascript",
          body: stripeFixture,
        }),
      );
      let cards = [
          card,
          {
            ...card,
            paymentMethodIdentifier: "77777777-7777-4777-8777-777777777777",
            last4: "4444",
          },
        ],
        complete = 0,
        prepare = 0;
      const writes: unknown[] = [];
      await page.route("**/api/monetization/payment-methods", (route) => {
        if (route.request().method() === "GET")
          return route.fulfill({ json: { paymentMethods: cards } });
        const body = route.request().postDataJSON();
        writes.push(body);
        expect(body).toEqual({ setupIntentIdentifier: "seti_fixture" });
        complete++;
        if (complete === 1) return route.fulfill({ status: 503, json: {} });
        cards = [
          ...cards,
          {
            ...card,
            paymentMethodIdentifier: "88888888-8888-4888-8888-888888888888",
            last4: "5556",
          },
        ];
        return route.fulfill({ json: cards[2] });
      });
      await page.route("**/api/monetization/payment-methods/*", (route) => {
        expect(route.request().method()).toBe("DELETE");
        const id = route.request().url().split("/").at(-1);
        cards = cards.filter((c) => c.paymentMethodIdentifier !== id);
        return route.fulfill({ status: 204 });
      });
      // Routes are matched newest first; install setup route after the wildcard DELETE handler.
      await page.route(
        "**/api/monetization/payment-methods/setup-intents",
        (route) => {
          prepare++;
          expect(route.request().postData()).toBeNull();
          return route.fulfill({
            status: 201,
            json: {
              setupIntentIdentifier: "seti_fixture",
              clientSecret: "seti_fixture_secret_fixture",
            },
          });
        },
      );
      await page.goto("/admin/monetization");
      const panel = page.getByRole("region", { name: t.title });
      await expect(panel.getByText(/4444/)).toBeVisible();
      await panel.getByRole("button", { name: t.add, exact: true }).click();
      await expect(
        panel.getByText("Stripe secure card input (fixture)"),
      ).toBeVisible();
      await panel.getByRole("button", { name: t.save, exact: true }).click();
      await expect(panel.getByText(t.completionFailed)).toBeVisible();
      await expect(panel.getByText(t.saved, { exact: true })).toHaveCount(0);
      await panel.getByRole("button", { name: t.retryCompletion }).click();
      await expect(panel.getByText(t.saved, { exact: true })).toBeVisible();
      await expect(panel.getByText(/5556/)).toBeVisible();
      expect(prepare).toBe(1);
      expect(complete).toBe(2);
      expect(await page.evaluate("window.__cardConfirmCount")).toBe(1);
      await panel.scrollIntoViewIfNeeded();
      await page.screenshot({
        path: info.outputPath(`cards-${locale}-${width}.png`),
        fullPage: true,
      });
      for (let n = 3; n > 0; n--) {
        await panel
          .getByRole("button", { name: t.remove, exact: true })
          .first()
          .click();
        await page
          .getByRole("dialog")
          .getByRole("button", { name: t.confirmDelete })
          .click();
        await expect(
          panel.getByRole("button", { name: t.remove, exact: true }),
        ).toHaveCount(n - 1);
      }
      await expect(panel.getByText(t.empty)).toBeVisible();
      expect(JSON.stringify(writes)).not.toContain("secret");
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      expect(
        await page.evaluate(() =>
          JSON.stringify({ ...sessionStorage, ...localStorage }),
        ),
      ).not.toContain("secret");
    });

test("social step-up returns to cards with an explicit, scoped resume", async ({
  page,
}) => {
  const t = paymentCardsDictionaries.ja;
  await page.context().addCookies([
    {
      name: "kpool-mock-account-status",
      value: "active",
      domain: "127.0.0.1",
      path: "/",
    },
    { name: "kpool-locale", value: "ja", domain: "127.0.0.1", path: "/" },
  ]);
  await page.route("**/api/identity/auth/me", (route) =>
    route.fulfill({ json: identity }),
  );
  await page.route("**/api/monetization/principal/me", (route) =>
    route.fulfill({ json: principal }),
  );
  let authenticated = false,
    removed = false;
  await page.route("**/api/monetization/payment-methods", (route) =>
    route.fulfill({ json: { paymentMethods: removed ? [] : [card] } }),
  );
  await page.route(`**/api/monetization/payment-methods/${group}`, (route) => {
    if (!authenticated)
      return route.fulfill({
        status: 401,
        json: { code: "recent_authentication_required" },
      });
    removed = true;
    return route.fulfill({ status: 204 });
  });
  await page.route(
    "**/api/identity/auth/step-up/social/google/redirect?returnTo=external-connections",
    (route) =>
      route.fulfill({
        json: { redirectUrl: "/admin/user/external-connections" },
      }),
  );
  await page.goto("/admin/monetization");
  const panel = page.getByRole("region", { name: t.title });
  await panel.getByRole("button", { name: t.remove, exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: t.confirmDelete })
    .click();
  await panel
    .getByRole("button", { name: "本人確認を行う", exact: true })
    .click();
  authenticated = true;
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Google/ })
    .click();
  await expect(page).toHaveURL(/\/admin\/monetization$/);
  await expect(panel.getByText(t.resumeDescription)).toBeVisible();
  expect(removed).toBe(false);
  await panel.getByRole("button", { name: t.resume }).click();
  await expect(panel.getByText(t.empty)).toBeVisible();
  expect(removed).toBe(true);
});
