import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import { SignalOpsApp } from "../app/SignalOpsApp";

describe("SignalOps command center",()=>{
  beforeEach(()=>{vi.stubGlobal("fetch",vi.fn().mockRejectedValue(new Error("offline")))});afterEach(()=>{cleanup();vi.unstubAllGlobals()});
  it("opens benchmark evidence from the primary navigation",async()=>{const user=userEvent.setup();render(<SignalOpsApp/>);await user.click(screen.getByRole("button",{name:/detection benchmark/i}));expect(screen.getByRole("heading",{name:/release benchmark/i})).toBeInTheDocument();expect(screen.getAllByText("90.6%").length).toBeGreaterThan(0)});
  it("filters and selects incidents",async()=>{const user=userEvent.setup();render(<SignalOpsApp/>);await user.click(screen.getByRole("button",{name:/^!Incidents2$/i}));await user.click(screen.getByRole("button",{name:"critical"}));expect(screen.getByText(/deterministic holdout dataset/i)).toBeInTheDocument();const incidentLinks=screen.getAllByRole("button",{name:/INC-/});expect(incidentLinks.length).toBeGreaterThan(0);await user.click(incidentLinks[0]);expect(screen.getAllByText(incidentLinks[0].textContent||"").length).toBeGreaterThan(1)});
  it("has no serious or critical automated accessibility violations",async()=>{const{container}=render(<SignalOpsApp/>);const result=await axe(container);expect(result.violations.filter(item=>["serious","critical"].includes(item.impact||""))).toEqual([])});
});
