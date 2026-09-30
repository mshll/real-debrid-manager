import { browser } from "wxt/browser";

import { completeDeviceLogin, pollDeviceCredentials, requestDeviceCode } from "@/lib/rd/auth";
import { errorMessage, RdError } from "@/lib/rd/errors";
import { loginStateItem, type LoginState } from "@/lib/storage";

import { sync } from "./sync";

let polling: string | null = null;
let approvalTabId: number | undefined;

/** Runs in the worker because opening the approval tab closes the popup. */
export async function startLogin(): Promise<void> {
  const code = await requestDeviceCode();
  const state: LoginState = {
    deviceCode: code.deviceCode,
    userCode: code.userCode,
    verificationUrl: code.verificationUrl,
    interval: code.interval,
    expiresAt: Date.now() + code.expiresIn * 1000,
  };
  await loginStateItem.setValue(state);
  const tab = await browser.tabs.create({ url: code.directVerificationUrl ?? code.verificationUrl });
  approvalTabId = tab.id;
  poll(state);
}

/** Picks polling back up if the worker was killed mid-login. */
export async function resumeLogin(): Promise<void> {
  const state = await loginStateItem.getValue();
  if (state && !state.error && state.expiresAt > Date.now()) poll(state);
}

function poll(state: LoginState): void {
  if (polling === state.deviceCode) return;
  polling = state.deviceCode;
  pollUntilApproved(state)
    .catch(async (error: unknown) => {
      if (polling === state.deviceCode) await loginStateItem.setValue({ ...state, error: errorMessage(error) });
    })
    .finally(() => {
      if (polling === state.deviceCode) polling = null;
    });
}

function isTransient(error: unknown): boolean {
  return !(error instanceof RdError) || error.status === 429 || error.status >= 500;
}

async function pollUntilApproved(state: LoginState): Promise<void> {
  while (Date.now() < state.expiresAt) {
    await new Promise((resolve) => setTimeout(resolve, state.interval * 1000));
    // Cancelled in the UI, or replaced by a newer login.
    if ((await loginStateItem.getValue())?.deviceCode !== state.deviceCode) return;
    let credentials;
    try {
      credentials = await pollDeviceCredentials(state.deviceCode);
    } catch (error) {
      if (isTransient(error)) continue;
      throw error;
    }
    if (!credentials) continue;

    await completeDeviceLogin(credentials.clientId, credentials.clientSecret, state.deviceCode);
    await loginStateItem.setValue(null);
    if (approvalTabId !== undefined) {
      await browser.tabs
        .remove(approvalTabId)
        .catch((error: unknown) => console.warn("Approval tab already closed", error));
    }
    await browser.action.openPopup?.().catch((error: unknown) => console.warn("Couldn't reopen popup", error));
    await sync();
    return;
  }
  throw new Error("Code expired, try again");
}
