import PublicBooking from "@/components/formchat/public-booking";
export default async function Page({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  return <PublicBooking businessId={businessId} />;
}
