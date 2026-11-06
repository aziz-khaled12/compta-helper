import { createRoot } from "react-dom/client";
import App from "./App";
import { DirectionProvider } from "./components/direction-provider";
import "./i18n";
import "./index.css";

// Radix primitives need the direction in JS (popper geometry, arrow keys), not
// only in CSS through <html dir>; this keeps them in sync with i18n.
createRoot(document.getElementById("root")!).render(
  <DirectionProvider>
    <App />
  </DirectionProvider>
);
