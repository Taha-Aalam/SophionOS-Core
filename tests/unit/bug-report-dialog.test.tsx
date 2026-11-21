// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BugReportDialog } from "@/components/bug-report/bug-report-dialog";
import { captureError, resetCaptureForTests } from "@/lib/bug-report/capture";
import { OPEN_BUG_REPORT_EVENT } from "@/lib/bug-report/config";
import { BUG_REPORT_STRINGS as S } from "@/lib/bug-report/strings";

vi.mock("next/navigation", () => ({
  usePathname: () => "/tasks",
}));

const { toastSuccess, toastError } = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));
vi.mock("sonner", () => ({
  toast: { success: toastSuccess, error: toastError },
}));

beforeEach(() => {
  localStorage.clear();
  resetCaptureForTests();
  window.history.replaceState(null, "", "/tasks");
  vi.stubGlobal("open", vi.fn());
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    configurable: true,
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function openDialog() {
  window.dispatchEvent(new CustomEvent(OPEN_BUG_REPORT_EVENT));
}

describe("BugReportDialog", () => {
  it("opens via the window CustomEvent", async () => {
    render(<BugReportDialog />);
    expect(screen.queryByText(S.dialogTitle)).not.toBeInTheDocument();
    openDialog();
    expect(await screen.findByText(S.dialogTitle)).toBeInTheDocument();
  });

  it("keeps all doors disabled below the minimum description length", async () => {
    const user = userEvent.setup();
    render(<BugReportDialog />);
    openDialog();
    const github = await screen.findByRole("button", { name: S.doorGithub });
    const copy = screen.getByRole("button", { name: S.doorCopy });
    const download = screen.getByRole("button", { name: S.doorDownload });
    expect(github).toBeDisabled();
    expect(copy).toBeDisabled();
    expect(download).toBeDisabled();

    await user.type(screen.getByLabelText(S.descriptionLabel), "too short");
    expect(github).toBeDisabled();

    await user.type(screen.getByLabelText(S.descriptionLabel), "!!");
    expect(github).toBeEnabled();
    expect(copy).toBeEnabled();
    expect(download).toBeEnabled();
  });

  it("GitHub door opens the right pre-filled issue URL in a new tab", async () => {
    const user = userEvent.setup();
    captureError(new Error("dialog test error"));
    render(<BugReportDialog />);
    openDialog();
    await user.type(
      await screen.findByLabelText(S.descriptionLabel),
      "Saving a task shows a blank page.",
    );
    await user.click(screen.getByRole("button", { name: S.doorGithub }));

    expect(window.open).toHaveBeenCalledTimes(1);
    const [url, target] = vi.mocked(window.open).mock.calls[0];
    expect(String(url)).toMatch(
      /^https:\/\/github\.com\/Taha-Aalam\/SophionOS-Core\/issues\/new\?title=/,
    );
    expect(target).toBe("_blank");
    const decoded = decodeURIComponent(String(url));
    expect(decoded).toContain("[Tasks] Bug report from in-app menu");
    expect(decoded).toContain("Saving a task shows a blank page.");
    expect(decoded).toContain("dialog test error");
    expect(decoded).toContain("- Page: /tasks");
  });

  it("Copy door writes the report to the clipboard and toasts", async () => {
    const user = userEvent.setup();
    // userEvent.setup() installs its own clipboard stub — override it AFTER
    // setup so our spy is the one the component (and assertions) see.
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    render(<BugReportDialog />);
    openDialog();
    await user.type(
      await screen.findByLabelText(S.descriptionLabel),
      "Copy door description here.",
    );
    await user.click(screen.getByRole("button", { name: S.doorCopy }));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const written = writeText.mock.calls[0][0];
    expect(written).toContain("### Description");
    expect(written).toContain("Copy door description here.");
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith(S.copiedToast));
  });

  it("Clear captured errors empties the buffer and toasts", async () => {
    const user = userEvent.setup();
    captureError(new Error("to be cleared"));
    render(<BugReportDialog />);
    openDialog();
    await user.click(await screen.findByRole("button", { name: S.clearErrors }));
    expect(localStorage.getItem("sophionos:bug-report:errors")).toBeNull();
    expect(toastSuccess).toHaveBeenCalledWith(S.clearedToast);
  });

  it("links the security policy and warns against public vulnerability issues", async () => {
    render(<BugReportDialog />);
    openDialog();
    const link = await screen.findByRole("link", { name: S.securityLinkLabel });
    expect(link).toHaveAttribute(
      "href",
      "https://github.com/Taha-Aalam/SophionOS-Core/blob/master/SECURITY.md",
    );
    expect(screen.getByText(/Security vulnerability\?/)).toBeInTheDocument();
  });
});
