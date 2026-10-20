import Workspace from "@/components/formchat/workspace";
import Landing from "@/components/formchat/landing";
import { getAuthUser } from "@/lib/auth-user";
export const dynamic = "force-dynamic";
export default async function Home() {
  const user = await getAuthUser();
  return user ? <Workspace /> : <Landing />;
}
