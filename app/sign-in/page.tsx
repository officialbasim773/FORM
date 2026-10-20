import Brand from "@/components/formchat/brand";
import { SignInAction } from "@/components/formchat/auth-actions";
import { safeReturnTo } from "@/lib/auth-user";

export default async function SignIn({
  searchParams,
}: {
  searchParams: Promise<{ return_to?: string; mode?: string }>;
}) {
  const { return_to, mode } = await searchParams;
  const signingUp = mode === "sign-up";
  return (
    <main className="join-page">
      <Brand />
      <section className="panel">
        <SignInAction
          initialMode={signingUp ? "sign-up" : "sign-in"}
          returnTo={safeReturnTo(return_to || "/")}
        />
      </section>
    </main>
  );
}
