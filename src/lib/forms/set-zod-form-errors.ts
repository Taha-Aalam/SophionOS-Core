import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import type { ZodError } from "zod";

export function setZodFormErrors<TFieldValues extends FieldValues>(
  form: UseFormReturn<TFieldValues>,
  error: ZodError<TFieldValues>,
) {
  for (const issue of error.issues) {
    const field = issue.path[0];

    if (typeof field !== "string") {
      continue;
    }

    form.setError(field as Path<TFieldValues>, {
      message: issue.message,
      type: "manual",
    });
  }
}
