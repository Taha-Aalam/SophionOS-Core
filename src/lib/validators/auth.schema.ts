import { z } from "zod";

const emailSchema = z.string().trim().email("Enter a valid email address.");
const requiredPasswordSchema = z.string().min(1, "Password is required.");
const newPasswordSchema = z.string().min(8, "Password must be at least 8 characters.");

const loginSchema = z.object({
  email: emailSchema,
  password: requiredPasswordSchema,
});

const signupSchema = z.object({
  email: emailSchema,
  password: newPasswordSchema,
});

const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export { forgotPasswordSchema, loginSchema, signupSchema };
