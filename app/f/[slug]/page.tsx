import { PublicForm } from "@/components/formchat/customer";
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <PublicForm slug={slug} />;
}
