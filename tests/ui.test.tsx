import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import { SignalOpsApp } from "../app/SignalOpsApp";

describe("SignalOps command center", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });
  it("opens benchmark evidence from the primary navigation", async () => {
    const user = userEvent.setup();
    render(<SignalOpsApp />);
    await user.click(
      screen.getByRole("button", { name: /detection benchmark/i }),
    );
    expect(
      screen.getByRole("heading", { name: /release benchmark/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("90.6%").length).toBeGreaterThan(0);
  });
  it("filters and selects incidents", async () => {
    const user = userEvent.setup();
    render(<SignalOpsApp />);
    await user.click(screen.getByRole("button", { name: "Incidents2" }));
    await user.click(screen.getByRole("button", { name: "Critical" }));
    expect(screen.getByText(/matching incidents/i)).toBeInTheDocument();
    const incidentLinks = screen.getAllByRole("button", { name: /INC-/ });
    expect(incidentLinks.length).toBeGreaterThan(0);
    await user.click(incidentLinks[0]);
    expect(
      screen.getByRole("complementary", { name: /investigation/i }),
    ).toBeInTheDocument();
  });
  it("opens the command palette and monitor creation workflow", async () => {
    const user = userEvent.setup();
    render(<SignalOpsApp />);
    await user.click(
      screen.getByRole("button", { name: /search incidents or jump/i }),
    );
    expect(
      screen.getByRole("dialog", { name: "Command menu" }),
    ).toBeInTheDocument();
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "Create monitor" }));
    expect(
      screen.getByRole("heading", { name: "Define an operational signal" }),
    ).toBeInTheDocument();
  });
  it("has no serious or critical automated accessibility violations", async () => {
    const { container } = render(<SignalOpsApp />);
    const result = await axe(container);
    expect(
      result.violations.filter((item) =>
        ["serious", "critical"].includes(item.impact || ""),
      ),
    ).toEqual([]);
  });
});
