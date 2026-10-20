import JoinTeam from "@/components/formchat/join-team";
export default async function JoinPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <JoinTeam token={token} />;
}
