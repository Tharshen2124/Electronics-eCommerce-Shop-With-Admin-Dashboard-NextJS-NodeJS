import { z } from "zod";
import { commonValidations } from "./validation";

// Registration schema with comprehensive validation
export const registrationSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  lastname: z.string().min(1, "Lastname is required").max(100),
  email: commonValidations.email,
  password: commonValidations.password,
});

// Login schema (for future use)
export const loginSchema = z.object({
  email: commonValidations.email,
  password: z.string().min(1, "Password is required"),
});

// Generic validation schema (keeping existing for backward compatibility)
const schema = z.object({
  name: z.string().min(3),
  email: z.string().email()
});

export default schema;