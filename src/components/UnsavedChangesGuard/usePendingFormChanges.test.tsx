import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { usePendingFormChanges } from "./usePendingFormChanges";

function Editor() {
  const [scope, setScope] = useState<string | null>("basic");
  const [selection, setSelection] = useState("agency-1");
  const { rootRef, hasPendingChanges } = usePendingFormChanges(scope);
  return <main ref={rootRef}>
    <output>{hasPendingChanges ? "Unsaved" : "Unchanged"}</output>
    <button onClick={() => setScope(null)}>Cancel</button>
    {scope ? <form>
      <input aria-label="Name" defaultValue="Original" />
      <input aria-label="Search" data-unsaved-ignore />
      <div data-unsaved-value={selection} />
      <button type="button" onClick={() => setSelection(selection === "agency-1" ? "agency-2" : "agency-1")}>Change agency</button>
    </form> : null}
  </main>;
}
afterEach(cleanup);

describe("usePendingFormChanges", () => {
  it("clears pending changes when input is restored and ignores search keywords", async () => {
    render(<Editor />);
    fireEvent.change(screen.getByLabelText("Search"), { target: { value: "Search term" } });
    expect(screen.getByText("Unchanged")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Edited" } });
    await waitFor(() => expect(screen.getByText("Unsaved")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Original" } });
    await waitFor(() => expect(screen.getByText("Unchanged")).toBeInTheDocument());
  });

  it("compares relation selections and clears pending changes when cancelled", async () => {
    render(<Editor />);
    fireEvent.click(screen.getByRole("button", { name: "Change agency" }));
    await waitFor(() => expect(screen.getByText("Unsaved")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Change agency" }));
    await waitFor(() => expect(screen.getByText("Unchanged")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Change agency" }));
    await waitFor(() => expect(screen.getByText("Unsaved")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByText("Unchanged")).toBeInTheDocument();
  });
});
