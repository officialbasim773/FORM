import Brand from "@/components/formchat/brand";
import { SignInAction } from "@/components/formchat/auth-actions";
import { safeReturnTo } from "@/lib/auth-user";

export default async function SignIn({
  searchParams,
}: {
  searchParams: Promise<{ return_to?: string }>;
}) {
  const { return_to } = await searchParams;
  return (
    <main className="join-page">
      <Brand />
      <section className="panel">
        <h1>Sign in to FormChat</h1>
        <p>Use the verified email address associated with your business or team invitation.</p>
        <SignInAction returnTo={safeReturnTo(return_to || "/")} />
      </section>
    </main>
  );
}
