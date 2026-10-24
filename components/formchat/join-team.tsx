/* eslint-disable @next/next/no-html-link-for-pages -- Full navigation resets hash-based workspace and authentication state. */
"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Users, ArrowRight } from "lucide-react";
import { api } from "@/lib/client";
import Brand from "./brand";
export default function JoinTeam({ token }: { token: string }) {
  const router = useRouter();
  const [data, setData] = useState<{
    businessName: string;
    name: string;
  } | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api(`invitations/${token}`)
      .then(setData)
      .catch((e) => setError(e.message));
    api("me")
      .then(() => setSignedIn(true))
      .catch(() => {});
  }, [token]);
  return (
    <main className="join-page">
      <Brand />
      <section className="panel">
        <Users size={36} />
        <span className="eyebrow">A PLACE ON THE TEAM</span>
        <h1>{data ? `Join ${data.businessName}` : "Your team invitation"}</h1>
        {data && (
          <>
            <p>
              Hi {data.name}. View and follow up on the requests assigned to
              you, all in one place.
            </p>
            <div className="notice">
              Sign in using the email address your owner invited. Members can
              see only their assigned responses.
            </div>
            {signedIn ? (
              <button
                className="btn primary"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setError("");
                  try {
                    await api(`invitations/${token}`, "POST", {});
                    router.push("/");
                  } catch (e) {
                    setError((e as Error).message);
                    setBusy(false);
                  }
                }}
              >
                {busy ? "Joining…" : "Accept invitation"}
                <ArrowRight size={17} />
              </button>
            ) : (
              <a
                className="btn primary"
                href={`/sign-in?return_to=${encodeURIComponent(`/join/${token}`)}`}
              >
                Sign in to join
                <ArrowRight size={17} />
              </a>
            )}
          </>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {signedIn && (
          <a
            className="text-btn"
            href={`/sign-out?return_to=${encodeURIComponent(`/join/${token}`)}`}
          >
            Use a different account
          </a>
        )}
        <a className="text-btn" href="/">
          Back to FormChat
        </a>
      </section>
    </main>
  );
}
