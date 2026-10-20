import { dash } from "@better-auth/infra";
import { betterAuth } from "better-auth";

// Used only by the Better Auth CLI to generate the D1 schema without a live binding.
export const auth = betterAuth({
  emailAndPassword: { enabled: true, requireEmailVerification: true },
  plugins: [dash()],
});
