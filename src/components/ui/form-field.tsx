"use client";

import { useController, useFormContext } from "react-hook-form";
import type { Control, FieldValues } from "react-hook-form";

export function useFormField({
  control,
  name,
}: {
  control?: Control<FieldValues>;
  name: string;
}) {
  const context = useFormContext();

  if (!context) {
    // Fallback if we are not inside a FormProvider, but we have a direct control
    if (!control) {
      throw new Error('useFormField must be used within a FormProvider or provided with a control prop');
    }
  }

  const {
    getValues,
    setValue,
    register,
    formState
  } = context || {};

  const activeControl = control || context?.control;

  const { field, fieldState } = useController({
    name,
    control: activeControl,
    defaultValue: context ? getValues(name) : undefined,
  });

  return {
    field: field || { onChange: () => {}, onBlur: () => {}, value: undefined, ref: null },
    fieldState,
    formState,
    setValue: setValue || (() => {}),
    register: register || (() => {}),
  };
}
