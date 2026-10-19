import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PrincipalStatusToggle } from "./PrincipalStatusToggle";
import { dictionaries } from "@/i18n/dictionaries";

afterEach(cleanup);
const t = dictionaries.ja.admin.principalStatus;

describe("PrincipalStatusToggle", () => {
  it.each(["active", "suspended"] as const)("toggles %s locally", (value) => {
    const onChange = vi.fn();
    render(<PrincipalStatusToggle value={value} disabled={false} onChange={onChange} t={t} />);
    const toggle = screen.getByRole("switch", { name: t.label });
    expect(toggle).toHaveAttribute("aria-checked", String(value === "active"));
    expect(toggle).toHaveTextContent(t[value]);
    fireEvent.click(toggle);
    expect(onChange).toHaveBeenCalledWith(value === "active" ? "suspended" : "active");
  });

  it("disables forced-stop and explains why", () => {
    const onChange = vi.fn();
    render(<PrincipalStatusToggle value="forced_stop" disabled={false} onChange={onChange} t={t} />);
    const toggle = screen.getByRole("switch", { name: t.label });
    expect(toggle).toBeDisabled();
    expect(toggle).toHaveTextContent(t.forced_stop);
    expect(toggle).toHaveAccessibleDescription(t.forcedReason);
    fireEvent.click(toggle);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("blocks changes when editing is disabled", () => {
    const onChange = vi.fn();
    render(<PrincipalStatusToggle value="active" disabled onChange={onChange} t={t} />);
    const toggle = screen.getByRole("switch", { name: t.label });
    expect(toggle).toBeDisabled();
    fireEvent.click(toggle);
    expect(onChange).not.toHaveBeenCalled();
  });
});
