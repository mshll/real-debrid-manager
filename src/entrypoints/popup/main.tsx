import "@/styles/app.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { bootstrapTheme, Providers } from "@/components/providers";
import { PopupApp } from "@/popup/app";

bootstrapTheme();

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <Providers>
        <PopupApp />
      </Providers>
    </StrictMode>,
  );
}
