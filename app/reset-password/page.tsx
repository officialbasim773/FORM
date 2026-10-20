import Brand from "@/components/formchat/brand";
import { ResetPasswordAction } from "@/components/formchat/auth-actions";

export default async function ResetPassword({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <main className="join-page">
      <Brand />
      <section className="panel">
        <h1>Reset your password</h1>
        <ResetPasswordAction token={token || ""} />
      </section>
    </main>
  );
}
