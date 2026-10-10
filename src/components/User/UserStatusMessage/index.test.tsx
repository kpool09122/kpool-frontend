import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { UserStatusMessage } from "./index";
import { AccountStatusMessage } from "../../Account/AccountStatusMessage";

afterEach(cleanup);

for (const [name, Message] of [["User", UserStatusMessage], ["Account", AccountStatusMessage]] as const) {
  describe(`${name} status theme`, () => {
    it.each(["error", "success", "warning"] as const)("uses adaptive colors for %s", (variant) => {
      const token = variant === "error" ? "danger" : variant;
      render(<Message variant={variant}>Message</Message>);
      expect(screen.getByRole(variant === "error" ? "alert" : "status")).toHaveClass(`bg-status-${token}/10`, `border-status-${token}`, `text-status-${token}`);
      expect(screen.getByRole(variant === "error" ? "alert" : "status")).not.toHaveClass("bg-red-50", "bg-emerald-50", "bg-yellow-50");
    });
  });
}
