// @vitest-environment jsdom
//
// Step-0 reproduction + parity contract for the IME-safe enter-to-submit pilot
// (audit PR #254, candidate C1; MWG guide ime-safe-enter-submit).
//
// Reproduction method: a keydown with `isComposing: true` (the event a real IME
// delivers when Enter confirms a composition) is dispatched while a composition
// is in progress. On the hand-rolled Enter handlers being replaced here, that
// event submits prematurely — the tests below assert the FIXED behaviour
// (no submit during composition), so they FAIL against the pre-fix components.
//
// jsdom limitation (recorded): jsdom does not implement the WHATWG implicit
// form-submission behaviour, so the positive "plain Enter submits" path is
// exercised via fireEvent.submit()/requestSubmit() on the form, not via a
// synthetic Enter keydown. Real-key-path behaviour (plain Enter and
// composition Enter) is verified in a real browser separately.

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TaskInlineEditor } from "@/components/entities/task-inline-editor";
import { AreasStep } from "@/components/onboarding/areas-step";
import { ApiKeyManager } from "@/components/settings/api-key-manager";

vi.mock("@/components/providers/auth-provider", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

const { useCreateAreaMock, toastMock } = vi.hoisted(() => ({
  useCreateAreaMock: vi.fn(),
  toastMock: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/hooks/use-areas", () => ({
  useAreas: () => ({
    data: [{ id: "area-1", name: "Work", icon: null }],
    isLoading: false,
  }),
  useCreateArea: (...args: unknown[]) => useCreateAreaMock(...args),
}));

vi.mock("sonner", () => ({
  toast: toastMock,
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/**
 * Dispatches an IME-composition Enter on `input`: composition starts, the
 * composed text lands in the field, Enter confirms the composition (keydown
 * carries isComposing=true), then the composition ends.
 */
function typeDuringCompositionAndConfirmWithEnter(
  input: HTMLElement,
  composed: string,
) {
  fireEvent.compositionStart(input);
  fireEvent.change(input, { target: { value: composed } });
  fireEvent.keyDown(input, { key: "Enter", isComposing: true });
  fireEvent.compositionEnd(input);
}

describe("TaskInlineEditor — IME-safe Enter submission", () => {
  function startEditing(initial = "Old name") {
    const onSave = vi.fn();
    render(<TaskInlineEditor value={initial} onSave={onSave} />);
    const display = screen.getByText(initial);
    fireEvent.click(display);
    const input = screen.getByDisplayValue(initial) as HTMLInputElement;
    return { onSave, input };
  }

  it("reproduction: Enter confirming a composition does NOT submit", () => {
    const { onSave, input } = startEditing();
    typeDuringCompositionAndConfirmWithEnter(input, "新しい名前");
    expect(onSave).not.toHaveBeenCalled();
    // The editor must still be open with the composed draft intact.
    expect(screen.getByDisplayValue("新しい名前")).toBeInTheDocument();
  });

  it("plain Enter keydown does not submit (submission is form-driven)", () => {
    const { onSave, input } = startEditing();
    fireEvent.change(input, { target: { value: "Renamed" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue("Renamed")).toBeInTheDocument();
  });

  it("native form submission commits the rename", () => {
    const { onSave, input } = startEditing();
    const form = input.closest("form");
    expect(form).not.toBeNull();
    fireEvent.change(input, { target: { value: "Renamed" } });
    fireEvent.submit(form!);
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith("Renamed");
  });

  it("Escape cancels editing without saving", () => {
    const { onSave, input } = startEditing();
    fireEvent.change(input, { target: { value: "Renamed" } });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText("Old name")).toBeInTheDocument();
  });

  it("blur commits the trimmed draft", () => {
    const { onSave, input } = startEditing();
    fireEvent.change(input, { target: { value: "  Renamed  " } });
    fireEvent.blur(input);
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith("Renamed");
  });

  it("empty or unchanged input exits editing without saving", () => {
    const { onSave, input } = startEditing();
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.blur(input);
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText("Old name")).toBeInTheDocument();
  });

  it("disabled prop prevents entering edit mode", () => {
    render(<TaskInlineEditor value="Old name" onSave={() => {}} disabled />);
    fireEvent.click(screen.getByText("Old name"));
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
});

describe("AreasStep — IME-safe Enter submission", () => {
  function renderStep() {
    return render(<AreasStep />);
  }

  function openCreateCard() {
    fireEvent.click(screen.getByRole("button", { name: /create new area/i }));
    const nameInput = screen.getByPlaceholderText("e.g. Fitness") as HTMLInputElement;
    const iconInput = screen.getByPlaceholderText("🏋️") as HTMLInputElement;
    return { nameInput, iconInput };
  }

  beforeEach(() => {
    useCreateAreaMock.mockReset();
  });

  function makeCreateArea(overrides: Partial<Record<string, unknown>> = {}) {
    const mutateAsync = vi.fn().mockResolvedValue({ id: "area-new" });
    const handle = {
      mutateAsync,
      isPending: false,
      isError: false,
      ...overrides,
    };
    useCreateAreaMock.mockReturnValue(handle);
    return handle;
  }

  it("reproduction: Enter confirming a composition does NOT create an area", () => {
    makeCreateArea();
    renderStep();
    const { nameInput } = openCreateCard();
    typeDuringCompositionAndConfirmWithEnter(nameInput, "健身房");
    // The premature call (if any) happens synchronously inside the keydown
    // handler, so a plain synchronous assertion is sufficient and fast.
    expect(
      useCreateAreaMock.mock.results[0].value.mutateAsync,
    ).not.toHaveBeenCalled();
  });

  it("native form submission creates the area with trimmed values", async () => {
    const handle = makeCreateArea();
    renderStep();
    const { nameInput, iconInput } = openCreateCard();
    fireEvent.change(iconInput, { target: { value: "🏋️" } });
    fireEvent.change(nameInput, { target: { value: "  Fitness  " } });
    const form = nameInput.closest("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form!);
    await waitFor(() => {
      expect(handle.mutateAsync).toHaveBeenCalledTimes(1);
    });
    expect(handle.mutateAsync).toHaveBeenCalledWith({
      name: "Fitness",
      icon: "🏋️",
    });
    // Success closes the create card and shows the "create" affordance again.
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /create new area/i }),
      ).toBeInTheDocument();
    });
    expect(screen.queryByPlaceholderText("e.g. Fitness")).not.toBeInTheDocument();
  });

  it("empty name does not create (Add area disabled; submit guard intact)", async () => {
    const handle = makeCreateArea();
    renderStep();
    const { nameInput } = openCreateCard();
    const addButton = screen.getByRole("button", { name: /add area/i });
    expect(addButton).toBeDisabled();
    fireEvent.click(addButton);
    if (nameInput.closest("form")) {
      fireEvent.submit(nameInput.closest("form")!);
    }
    expect(handle.mutateAsync).not.toHaveBeenCalled();
  });

  it("create failure keeps the card open and shows the error message", async () => {
    const mutateAsync = vi.fn().mockRejectedValue(new Error("boom"));
    makeCreateArea({ mutateAsync, isError: true });
    renderStep();
    const { nameInput } = openCreateCard();
    fireEvent.change(nameInput, { target: { value: "Fitness" } });
    fireEvent.submit(nameInput.closest("form")!);
    await waitFor(() => {
      expect(screen.getByText(/failed to create area/i)).toBeInTheDocument();
    });
    expect(screen.getByPlaceholderText("e.g. Fitness")).toBeInTheDocument();
  });
});

describe("ApiKeyManager — IME-safe Enter submission", () => {
  function jsonResponse(payload: unknown, ok = true) {
    return {
      ok,
      text: async () => JSON.stringify(payload),
    };
  }

  const fetchMock = vi.fn();

  beforeEach(() => {
    toastMock.success.mockClear();
    toastMock.error.mockClear();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        return Promise.resolve(
          jsonResponse({
            data: {
              key: "sk-test-key",
              record: {
                id: "key-1",
                name: "My key",
                last_used_at: null,
                expires_at: null,
                created_at: null,
                revoked_at: null,
              },
            },
          }),
        );
      }
      return Promise.resolve(jsonResponse({ data: [] }));
    });
  });

  it("reproduction: Enter confirming a composition does NOT create a key", async () => {
    render(<ApiKeyManager />);
    await waitFor(() => {
      expect(screen.getByLabelText("New key name")).toBeInTheDocument();
    });
    const input = screen.getByLabelText("New key name") as HTMLInputElement;
    const postCallsBefore = fetchMock.mock.calls.filter(
      ([, init]) => (init as RequestInit | undefined)?.method === "POST",
    ).length;
    typeDuringCompositionAndConfirmWithEnter(input, "我的密钥");
    // The premature POST (if any) is issued synchronously inside the keydown
    // handler, so a plain synchronous assertion is sufficient and fast.
    const postCalls = fetchMock.mock.calls.filter(
      ([, init]) => (init as RequestInit | undefined)?.method === "POST",
    );
    expect(postCalls).toHaveLength(postCallsBefore);
  });

  it("native form submission creates the key with the trimmed name", async () => {
    render(<ApiKeyManager />);
    const input = await waitFor(() => {
      const el = screen.getByLabelText("New key name") as HTMLInputElement;
      expect(el).toBeInTheDocument();
      return el;
    });
    fireEvent.change(input, { target: { value: "  My key  " } });
    const form = input.closest("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form!);
    await waitFor(() => {
      expect(toastMock.success).toHaveBeenCalledWith(
        "API key created. Copy it now, it won't be shown again.",
      );
    });
    const post = fetchMock.mock.calls.find(
      ([, init]) => (init as RequestInit | undefined)?.method === "POST",
    );
    expect(post).toBeDefined();
    expect(JSON.parse((post![1] as RequestInit).body as string)).toEqual({
      name: "My key",
    });
    expect(screen.getByText("sk-test-key")).toBeInTheDocument();
    // Name field is cleared after success.
    expect((screen.getByLabelText("New key name") as HTMLInputElement).value).toBe("");
  });

  it("empty name shows the toast error and creates nothing", async () => {
    render(<ApiKeyManager />);
    const input = await waitFor(() => {
      const el = screen.getByLabelText("New key name") as HTMLInputElement;
      expect(el).toBeInTheDocument();
      return el;
    });
    fireEvent.change(input, { target: { value: "   " } });
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /create key/i }));
    await waitFor(() => {
      expect(toastMock.error).toHaveBeenCalledWith("Give the key a name first.");
    });
    const postCalls = fetchMock.mock.calls.filter(
      ([, init]) => (init as RequestInit | undefined)?.method === "POST",
    );
    expect(postCalls).toHaveLength(0);
  });

  it("create failure surfaces a toast and keeps the entered name", async () => {
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        return Promise.resolve(
          jsonResponse(
            { error: { message: "quota exceeded" } },
            false,
          ),
        );
      }
      return Promise.resolve(jsonResponse({ data: [] }));
    });
    render(<ApiKeyManager />);
    const input = await waitFor(() => {
      const el = screen.getByLabelText("New key name") as HTMLInputElement;
      expect(el).toBeInTheDocument();
      return el;
    });
    fireEvent.change(input, { target: { value: "My key" } });
    fireEvent.submit(input.closest("form")!);
    await waitFor(() => {
      expect(toastMock.error).toHaveBeenCalledWith("quota exceeded");
    });
    expect(
      (screen.getByLabelText("New key name") as HTMLInputElement).value,
    ).toBe("My key");
  });
});
