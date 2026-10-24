import { authRateStorage } from "./auth-rate-limit";
import { env } from "cloudflare:workers";
import { createEmailSender, dash } from "@better-auth/infra";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/d1";
import * as authSchema from "@/db/auth-schema";

if (!env.DB) {
  throw new Error("Cloudflare D1 binding `DB` is required for Better Auth.");
}

export const auth = betterAuth({
  database: drizzleAdapter(drizzle(env.DB, { schema: authSchema }), {
    provider: "sqlite",
    schema: authSchema,
  }),
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  advanced: { ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] } },
  rateLimit: {
    enabled: true,
    customStorage: authRateStorage(env.DB),
    customRules: {
      "/sign-in/email": {window:60,max:10},
      "/sign-up/email": {window:60,max:5},
      "/request-password-reset": {window:60,max:3},
      "/send-verification-email": {window:60,max:3},
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    async sendResetPassword({ user, url }) {
      const result = await emailSender().send({
        template: "reset-password",
        to: user.email,
        variables: {
          resetLink: url,
          userEmail: user.email,
          userName: user.name,
          appName: "FormChat",
        },
      });
      if (!result.success) throw new Error("Could not send password reset email.");
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    async sendVerificationEmail({ user, url }) {
      const result = await emailSender().send({
        template: "verify-email",
        to: user.email,
        variables: {
          verificationUrl: url,
          userEmail: user.email,
          userName: user.name,
          appName: "FormChat",
        },
      });
      if (!result.success) throw new Error("Could not send verification email.");
    },
  },
  plugins: [dash({ apiKey: env.BETTER_AUTH_API_KEY })],
});

function emailSender() {
  if (!env.BETTER_AUTH_API_KEY) {
    throw new Error("BETTER_AUTH_API_KEY is required to send authentication email.");
  }
  return createEmailSender({ apiKey: env.BETTER_AUTH_API_KEY });
}
