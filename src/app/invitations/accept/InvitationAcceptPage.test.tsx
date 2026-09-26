import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { webAuthnBrowserAdapter } from "@/gateways/auth/webAuthnBrowserAdapter";
import { InvitationAcceptPage } from "./InvitationAcceptPage";

const options = {
  challengeKey: "11111111-1111-4111-8111-111111111111",
  options: {
    rp: { name: "kpool", id: "example.test" },
    user: { name: "invited@example.com", id: "AQID", displayName: "Invited" },
    challenge: "AQID", pubKeyCredParams: [{ type: "public-key", alg: -7 }], timeout: 60000,
    excludeCredentials: [], authenticatorSelection: { residentKey: "required", userVerification: "preferred" }, attestation: "none",
  },
};
const credential = {
  id: "credential-id", rawId: "AQID", type: "public-key" as const,
  response: { clientDataJSON: "AQID", attestationObject: "AQID", transports: ["internal"] },
  authenticatorAttachment: null, clientExtensionResults: {},
};

describe("InvitationAcceptPage", () => {
  afterEach(() => cleanup());

  it("passes the invitation token through passkey registration", async () => {
    const createRegistrationOptions = vi.fn().mockResolvedValue(options);
    const registerWithPasskey = vi.fn().mockResolvedValue({});
    const navigate = vi.fn();
    render(
      <InvitationAcceptPage
        token="invite-token"
        email="invited@example.com"
        signupAdapter={{ createRegistrationOptions, registerWithPasskey }}
        webAuthnAdapter={{ ...webAuthnBrowserAdapter, isSupported: () => true, create: vi.fn().mockResolvedValue({ ok: true, credential }) }}
        navigate={navigate}
      />,
    );

    fireEvent.change(screen.getByLabelText("プロフィール名"), { target: { value: "Invited Member" } });
    fireEvent.change(screen.getByLabelText("パスキー名"), { target: { value: "Phone" } });
    fireEvent.click(screen.getByRole("button", { name: "招待を受諾" }));

    await waitFor(() => expect(createRegistrationOptions).toHaveBeenCalledWith({
      email: "invited@example.com", accountType: null, oneTimeToken: "invite-token", return_to: "/admin",
    }, { language: "ja" }));
    expect(registerWithPasskey).toHaveBeenCalledWith(expect.objectContaining({
      identityName: "Invited Member", displayName: "Phone", credential,
    }), { language: "ja" });
    expect(navigate).toHaveBeenCalledWith("/admin");
  });

  it("passes the invitation token through SSO", async () => {
    const socialRedirectAdapter = vi.fn().mockResolvedValue({ ok: true, redirectUrl: "https://accounts.example.test/oauth" });
    const navigate = vi.fn();
    render(<InvitationAcceptPage token="invite-token" email="invited@example.com" socialRedirectAdapter={socialRedirectAdapter} navigate={navigate} />);
    fireEvent.click(screen.getByRole("button", { name: "Googleで招待を受諾" }));
    await waitFor(() => expect(socialRedirectAdapter).toHaveBeenCalledWith("google", "/admin", "invite-token"));
  });

  it("disables all actions when invitation parameters are missing", () => {
    render(<InvitationAcceptPage token="" email="invited@example.com" />);
    expect(screen.getByRole("alert")).toHaveTextContent("token または email");
    expect(screen.getByRole("button", { name: "招待を受諾" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Googleで招待を受諾" })).toBeDisabled();
  });
});
