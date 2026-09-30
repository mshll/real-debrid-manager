import "@/styles/app.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { bootstrapTheme, Providers } from "@/components/providers";
import { ManagerApp } from "@/manager/app";

bootstrapTheme();

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <Providers toastPosition="bottom-right">
        <ManagerApp />
      </Providers>
    </StrictMode>,
  );
}
