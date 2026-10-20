import Landing from "@/components/formchat/landing";
import { getAuthUser } from "@/lib/auth-user";
export const dynamic = "force-dynamic";
export default async function About() {
  return <Landing signedIn={!!(await getAuthUser())} />;
}
