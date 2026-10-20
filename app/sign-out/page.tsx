import Brand from "@/components/formchat/brand";
import { SignOutAction } from "@/components/formchat/auth-actions";
import { safeReturnTo } from "@/lib/auth-user";

export default async function SignOut({
  searchParams,
}: {
  searchParams: Promise<{ return_to?: string }>;
}) {
  const { return_to } = await searchParams;
  return (
    <main className="join-page">
      <Brand />
      <section className="panel">
        <SignOutAction returnTo={safeReturnTo(return_to || "/")} />
      </section>
    </main>
  );
}
