"use client";
import { useEffect, useState } from "react";
import {
  FileText,
  ArrowRight,
  Check,
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";
import { Toaster, toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { Business, FormRecord } from "@/lib/model";
import { api } from "@/lib/client";
import { ImagePicker } from "./ui";
import Brand from "./brand";
import NewForm from "./new-form";
import { User } from "@/lib/model";
export default function Onboarding({
  user,
  initial,
  onReady,
}: {
  user: User;
  initial: Business | null;
  onReady: (b: Business, f: FormRecord) => void;
}) {
  const storageKey = `formchat:onboarding:${user.email}`;
  const [b, setB] = useState(initial);
  const [step, setStep] = useState(initial ? 1 : 0);
  const [name, setName] = useState(initial?.name || "");
  const [phone, setPhone] = useState(initial?.phone || "");
  const [logo, setLogo] = useState(initial?.logo || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [create, setCreate] = useState(false);
  useEffect(() => {
    if (initial) return;
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (saved) {
        setName(saved.name || "");
        setPhone(saved.phone || "");
      }
    } catch {}
  }, [storageKey]);
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ name, phone }));
    } catch {}
  }, [name, phone, storageKey]);
  return (
    <main className="onboarding">
      <header>
        <Brand />
        <a className="small" href="/sign-out?return_to=/">
          Sign out
        </a>
      </header>
      <div className="onboarding-layout">
        <aside>
          <span className="eyebrow">WELCOME TO YOUR WORKSPACE</span>
          <h1>
            A few details.
            <br />
            Your first form.
          </h1>
          <p>Let’s get your business ready to receive better requests.</p>
          <ol className="setup-steps">
            {["Your business", "Your identity", "Your first form"].map(
              (label, i) => (
                <li
                  key={label}
                  className={
                    step === i ? "current" : step > i ? "complete" : ""
                  }
                >
                  <span>{step > i ? <Check size={16} /> : i + 1}</span>
                  <div>
                    <strong>{label}</strong>
                    <small>
                      {
                        [
                          "Name and WhatsApp number",
                          "Add a familiar face",
                          "Choose, edit and publish",
                        ][i]
                      }
                    </small>
                  </div>
                </li>
              ),
            )}
          </ol>
          <div className="onboarding-note">
            <ShieldCheck size={19} />
            <span>
              No WhatsApp API or technical setup.
              <br />
              Your customers send the message themselves.
            </span>
          </div>
        </aside>
        <section className="setup-panel">
          <span className="section-kicker">STEP {step + 1} OF 3</span>
          <Progress value={((step + 1) / 3) * 100} className="setup-progress" />
          {step === 0 ? (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setError("");
                try {
                  const input = {
                    name,
                    phone: phone.replace(/[\s()-]/g, ""),
                    logo,
                    accent: b?.accent || "#176650",
                    button: b?.button || "#176650",
                  };
                  const next = await api(
                    "business",
                    b ? "PATCH" : "POST",
                    input,
                  );
                  setB(next);
                  setStep(1);
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <h2>Tell us about your business</h2>
              <p>This is how customers will recognise you.</p>
              <label>
                Business name
                <input
                  autoFocus
                  required
                  maxLength={100}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Willow Home Services"
                />
              </label>
              <label>
                WhatsApp number
                <input
                  required
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+971 50 123 4567"
                />
              </label>
              <small>
                Include your country code. We check the format; we cannot verify
                that the number has WhatsApp.
              </small>
              {error && (
                <div className="error" role="alert">
                  {error}
                </div>
              )}
              <button className="btn primary full" disabled={busy}>
                {busy ? "Saving…" : "Continue"}
                <ArrowRight size={16} />
              </button>
            </form>
          ) : step === 1 ? (
            <>
              <h2>Make it recognisable</h2>
              <p>Add your logo, or keep things simple for now.</p>
              <div className="logo-upload-area">
                <ImagePicker
                  value={logo}
                  onChange={setLogo}
                  label="Upload business logo"
                />
                <small>PNG, JPEG or WebP. We resize it for you.</small>
              </div>
              <div className="row">
                <button className="btn" onClick={() => setStep(0)}>
                  <ArrowLeft size={15} />
                  Back
                </button>
                <button
                  className="btn primary grow"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      const next = await api("business", "PATCH", {
                        ...b,
                        name,
                        phone: b!.phone,
                        logo,
                      });
                      setB(next);
                      setStep(2);
                    } catch (e) {
                      toast.error((e as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {logo ? "Save and continue" : "Continue without a logo"}
                  <ArrowRight size={16} />
                </button>
              </div>
            </>
          ) : (
            <>
              <h2>Let’s build your first form</h2>
              <p>
                Start with a template for services or products. Then make the
                details your own.
              </p>
              <div className="setup-preview">
                <FileText size={34} />
                <strong>Choose → Edit → Preview → Publish</strong>
                <p>We’ll save your draft as you go.</p>
              </div>
              <div className="row">
                <button className="btn" onClick={() => setStep(1)}>
                  <ArrowLeft size={15} />
                  Back
                </button>
                <button
                  className="btn primary grow"
                  onClick={() => setCreate(true)}
                >
                  Choose a starting point
                  <ArrowRight size={16} />
                </button>
              </div>
            </>
          )}
          <p className="account-note">Signed in as {user.email}</p>
        </section>
      </div>
      <NewForm
        open={create}
        onClose={() => setCreate(false)}
        onCreated={(f) => {
          try {
            localStorage.removeItem(storageKey);
          } catch {}
          onReady(b!, f);
        }}
      />
      <Toaster richColors />
    </main>
  );
}
