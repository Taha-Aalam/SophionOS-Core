"use client";

import * as React from "react";
import { useFormField } from "./form-field";
import { cn } from "@/lib/utils";

export const Form = React.forwardRef<
  HTMLFormElement,
  React.HTMLAttributes<HTMLFormElement> & {
    onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  }
>(({ className, onSubmit, ...props }, ref) => {
  return (
    <form
      ref={ref}
      className={cn("space-y-4", className)}
      onSubmit={onSubmit}
      {...props}
    />
  );
});
Form.displayName = "Form";

export const FormItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("space-y-2", className)}
      {...props}
    />
  );
});
FormItem.displayName = "FormItem";

export const FormLabel = React.forwardRef<
  HTMLLabelElement,
  React.HTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => {
  return (
    <label
      ref={ref}
      className={cn(
        "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className
      )}
      {...props}
    />
  );
});
FormLabel.displayName = "FormLabel";

export const FormControl = React.forwardRef<
  React.ElementRef<typeof FormControlInner>,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <FormControlInner
      ref={ref}
      className={cn("min-h-0 flex-1", className)}
      {...props}
    />
  );
});
FormControl.displayName = "FormControl";

const FormControlInner = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return <div ref={ref} className={className} {...props} />;
});

export const FormMessage = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  return (
    <p
      ref={ref}
      className={cn("text-sm font-medium text-destructive", className)}
      {...props}
    />
  );
});
FormMessage.displayName = "FormMessage";

export const FormField = ({
  control,
  name,
  render,
  ...props
}: {
  control: any;
  name: string;
  render: (field: any, formState: any) => React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>) => {
  const { field, fieldState } = useFormField({
    control,
    name,
  });

  return (
    <div {...props}>
      {render(field, fieldState)}
    </div>
  );
};
FormField.displayName = "FormField";

export { useFormField };
