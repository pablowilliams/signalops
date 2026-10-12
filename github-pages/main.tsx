import React from "react";
import { createRoot } from "react-dom/client";
import { SignalOpsApp } from "../app/SignalOpsApp";
import "../app/globals.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <SignalOpsApp />
  </React.StrictMode>,
);
