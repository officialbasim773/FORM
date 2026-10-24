"use client";
import { useEffect, useState } from "react";
import { Users, Plus, Copy, Trash2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { api, copy } from "@/lib/client";
import { TeamMember } from "@/lib/model";
import { Confirm } from "./ui";
export default function TeamSettings() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState<TeamMember | null>(null);
  async function refresh() {
    const r = await api("team");
    setMembers(r.members);
  }
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Synchronize browser/API lifecycle state and clear stale data before loading the new resource.
    refresh().catch((e) => setError(e.message));
  }, []);
  return (
    <section className="panel team-panel">
      <div className="between">
        <div>
          <span className="section-kicker">
            <Users size={16} /> YOUR PEOPLE
          </span>
          <h2>Team members</h2>
        </div>
        <span className="status-badge published">
          {members.filter((m) => m.status === "active").length} active
        </span>
      </div>
      <p>
        Bring the right people into each conversation. Members can view only
        responses assigned to them. You manage forms, routing and the full
        inbox.
      </p>
      <div className="team-list">
        {members.map((m) => (
          <div className="team-person" key={m.id}>
            <span className="workspace-avatar">{m.name[0]}</span>
            <div>
              <strong>{m.name}</strong>
              <small>
                {m.email} · {m.phone}
              </small>
              <small>
                {m.status === "active"
                  ? "Member · Assigned responses only"
                  : `Invitation ${new Date(m.expires_at!) < new Date() ? "expired" : "pending"}`}
              </small>
            </div>
            <span
              className={
                "status-badge " + (m.status === "active" ? "published" : "")
              }
            >
              {m.status === "active" ? "Active" : "Invited"}
            </span>
            {m.status === "invited" && (
              <button
                type="button"
                className="text-btn"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    const r = await api("team", "POST", m);
                    setLink(r.url);
                    await refresh();
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                New link
              </button>
            )}
            <button
              type="button"
              className="icon-btn"
              aria-label={`Remove ${m.name}`}
              onClick={() => setRemoving(m)}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
      {!members.length && (
        <div className="team-empty">
          <Users size={28} />
          <strong>Your next conversation can be a team effort.</strong>
          <span>Invite your first teammate below.</span>
        </div>
      )}
      <form
        className="invite-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          setLink("");
          try {
            const r = await api("team", "POST", {
              name,
              email,
              phone: phone.replace(/[\s()-]/g, ""),
            });
            setLink(r.url);
            setName("");
            setEmail("");
            setPhone("");
            await refresh();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <h3>Invite a teammate</h3>
        <div className="invite-fields">
          <label>
            Name
            <input
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label>
            Email address
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            WhatsApp number
            <input
              required
              type="tel"
              placeholder="+971501234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>
        </div>
        <button className="btn primary" disabled={busy}>
          <Plus size={16} />
          {busy ? "Creating invitation…" : "Create invitation link"}
        </button>
        <p className="small">
          Links expire after 7 days. Send the link yourself; no email is sent
          automatically. Your teammate must sign in with the invited email.
        </p>
      </form>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {link && (
        <div className="invitation-result">
          <strong>
            <CheckCircle2 size={17} /> Invitation ready to share
          </strong>
          <label>
            Private invitation link
            <input readOnly value={link} />
          </label>
          <button
            className="btn"
            onClick={() =>
              copy(link)
                .then(() => toast.success("Invitation copied"))
                .catch(() => toast.error("Select and copy the link above."))
            }
          >
            <Copy size={15} />
            Copy invitation
          </button>
        </div>
      )}
      <Confirm
        open={!!removing}
        title={`Remove ${removing?.name}?`}
        description="Their workspace access ends immediately. New requests using this teammate fall back to the owner. Existing responses remain saved."
        onClose={() => setRemoving(null)}
        onConfirm={async () => {
          try {
            await api(`team/${removing!.id}`, "DELETE");
            setRemoving(null);
            await refresh();
            toast.success("Team access removed");
          } catch (e) {
            toast.error((e as Error).message);
          }
        }}
      />
    </section>
  );
}
