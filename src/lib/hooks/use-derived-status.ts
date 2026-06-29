"use client";

import { useEffect, useRef } from "react";
import type { UseFormReturn, Path, FieldValues } from "react-hook-form";

/**
 * Recomputes a form's `status` field from current context whenever the
 * watched context values change. Manual user picks of the status field are
 * preserved between context changes (an override flag flips once the user
 * touches the picker, and resets only when `resetDeps` change).
 *
 * @param form  react-hook-form instance whose `status` field should be kept in sync
 * @param compute  pure function: () => next status (caller reads form.getValues for context)
 * @param contextDeps  values to watch for re-derivation
 * @param resetDeps  optional values that clear the override flag (e.g. dialog open / entity switch). Defaults to `contextDeps` for backward compatibility.
 */
export function useDerivedStatus<TValues extends FieldValues>(
  form: UseFormReturn<TValues>,
  compute: () => TValues["status"],
  contextDeps: ReadonlyArray<unknown>,
  resetDeps?: ReadonlyArray<unknown>,
): void {
  const overriddenRef = useRef(false);

  useEffect(() => {
    const subscription = form.watch((_value, info) => {
      // Only flag override on user-initiated status change (RHF passes type="change")
      if (info.name === "status" && info.type === "change") {
        overriddenRef.current = true;
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  useEffect(() => {
    // Reset override when session-level deps change (dialog open, entity switch).
    overriddenRef.current = false;
    // Also recompute immediately after reset so the new session gets the
    // correct derived status.
    const next = compute();
    const current = form.getValues("status" as Path<TValues>);
    if (next !== current) {
      form.setValue("status" as Path<TValues>, next as TValues["status"], {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: false,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, resetDeps ?? contextDeps);

  useEffect(() => {
    // Context changed: recompute only if the user hasn't manually overridden.
    if (overriddenRef.current) return;
    const next = compute();
    const current = form.getValues("status" as Path<TValues>);
    if (next !== current) {
      form.setValue("status" as Path<TValues>, next as TValues["status"], {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: false,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, contextDeps);
}
