import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PrincipalStatusField } from "./PrincipalStatusField";
import { dictionaries } from "@/i18n/dictionaries";
afterEach(cleanup);
const t = dictionaries.ja.admin.principalStatus;
describe("PrincipalStatusField", () => {
  it("offers only active/suspended and stages selection locally", () => {
    const onChange = vi.fn();
    render(
      <PrincipalStatusField
        value="active"
        disabled={false}
        onChange={onChange}
        t={t}
      />,
    );
    expect(
      screen.queryByRole("option", { name: t.forced_stop }),
    ).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox", { name: t.label }), {
      target: { value: "suspended" },
    });
    expect(onChange).toHaveBeenCalledWith("suspended");
  });
  it("disables forced-stop and explains why", () => {
    render(
      <PrincipalStatusField
        value="forced_stop"
        disabled={false}
        onChange={vi.fn()}
        t={t}
      />,
    );
    expect(screen.getByRole("combobox")).toBeDisabled();
    expect(screen.getByText(t.forcedReason)).toBeInTheDocument();
  });
});
