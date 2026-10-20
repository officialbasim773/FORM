import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";

export type AuthUser = {
  userId: string;
  displayName: string;
  email: string;
  fullName: string | null;
};

export async function getAuthUser(): Promise<AuthUser | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || !session.user.emailVerified) return null;
  const user = session.user;
  return {
    userId: user.id,
    displayName: user.name || user.email,
    email: user.email,
    fullName: user.name || null,
  };
}

export async function requireAuthUser(returnTo: string): Promise<AuthUser> {
  const user = await getAuthUser();
  if (user) return user;
  redirect(`/sign-in?return_to=${encodeURIComponent(safeReturnTo(returnTo))}`);
}

export function safeReturnTo(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  try {
    const url = new URL(value, "https://app.local");
    if (url.origin !== "https://app.local") return "/";
    if (url.pathname.startsWith("/api/auth/") || url.pathname === "/sign-in" || url.pathname === "/sign-out") return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}
