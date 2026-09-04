import type { Metadata } from "next";
import { SignalOpsApp } from "./SignalOpsApp";

export const metadata: Metadata = {
  title: "SignalOps | Data incident intelligence",
  description:
    "Detect, diagnose, and explain data incidents with measurable evidence.",
};

export default function Home() {
  return <SignalOpsApp />;
}
