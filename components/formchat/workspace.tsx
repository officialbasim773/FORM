"use client";
import NextImage from "next/image";
import { useEffect, useState } from "react";
import {
  FileText,
  CalendarDays,
  Inbox,
  BarChart3,
  Settings,
  ArrowUpRight,
  ChevronRight,
  LogOut,
  HelpCircle,
  Users,
} from "lucide-react";
import { Toaster, toast } from "sonner";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarInset,
  useSidebar,
} from "@/components/ui/sidebar";
import { Progress } from "@/components/ui/progress";
import { Business, FormRecord } from "@/lib/model";
import { PRODUCT_NAME, PLANS } from "@/lib/config";
import { api } from "@/lib/client";
import { Modal, Loading } from "./ui";
import Builder from "./builder";
import Brand from "./brand";
import NewForm from "./new-form";
import Onboarding from "./onboarding";
import FormsPage from "./forms-page";
import ResponsesPage from "./responses-page";
import AnalyticsPage from "./analytics-page";
import TeamSettings from "./team-settings";
import AppointmentsPage from "./appointments-page";
import SettingsPage from "./settings-page";
import { User } from "@/lib/model";
function SidebarNavigationAction({
  onClick,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { setOpenMobile } = useSidebar();
  return (
    <button
      {...props}
      onClick={(e) => {
        onClick?.(e);
        setOpenMobile(false);
      }}
    >
      {children}
    </button>
  );
}
export default function Workspace() {
  const [user, setUser] = useState<User | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [forms, setForms] = useState<FormRecord[]>([]);
  const [workspaces, setWorkspaces] = useState<
    { id: string; name: string; role: string }[]
  >([]);
  const [usage, setUsage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState("Forms");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<FormRecord | null>(null);
  const [help, setHelp] = useState(false);
  async function refresh() {
    try {
      const r = await api("forms");
      setForms(r.forms);
      setUsage(r.usage);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    const sync = () => {
      if (window.location.hash.startsWith("#appointments/"))
        setPage("Appointments");
      else {
        const routes: Record<string, string> = {
          forms: "Forms",
          responses: "Responses",
          analytics: "Analytics",
          team: "Team",
          "business-settings": "Business settings",
        };
        setPage(routes[window.location.hash.slice(1)] || "Forms");
      }
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  useEffect(() => {
    api("me")
      .then(async (data) => {
        setUser(data.user);
        setBusiness(data.business);
        setWorkspaces(data.workspaces || []);
        if (data.business?.role === "member") setPage("Responses");
        else if (data.business) await refresh();
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: {
              name: string;
              title: string;
              description: string;
              inputSchema: unknown;
              annotations: unknown;
              execute: (input: unknown) => unknown;
            },
            options: { signal: AbortSignal },
          ) => unknown;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    Promise.resolve(
      context.registerTool(
        {
          name: "start_form_creation",
          title: "Start a new form",
          description:
            "Open the template chooser. This does not save or publish a form.",
          inputSchema: {
            type: "object",
            properties: {},
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false },
          execute: (input: unknown) => {
            if (
              !input ||
              typeof input !== "object" ||
              Object.keys(input).length
            )
              throw new Error("Expected an empty object.");
            setCreating(true);
            return { opened: true };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => {});
    return () => lifecycle.abort();
  }, []);
  useEffect(() => {
    let active = true;
    const openFromLink = () => {
      const match = location.hash.match(
        /^#forms\/([\w-]+)\/(build|share|responses|settings)$/,
      );
      if (
        !match ||
        !business ||
        business.role === "member" ||
        editing?.id === match[1]
      )
        return;
      if (!forms.some((f) => f.id === match[1])) return;
      api(`forms/${match[1]}`)
        .then((form) => {
          if (active && location.hash.startsWith(`#forms/${form.id}/`))
            setEditing(form);
        })
        .catch((e) => {
          if (active) toast.error(e.message);
        });
    };
    openFromLink();
    window.addEventListener("hashchange", openFromLink);
    return () => {
      active = false;
      window.removeEventListener("hashchange", openFromLink);
    };
  }, [forms, business, editing]);
  if (loading) return <Loading />;
  if (error && !user)
    return (
      <div className="empty-state">
        <h2>We couldn’t load your workspace.</h2>
        <p>{error}</p>
        <button className="btn" onClick={() => location.reload()}>
          Try again
        </button>
      </div>
    );
  if (!user) return null;
  if (
    !business ||
    (business.role !== "member" &&
      !business.onboarded &&
      !forms.length &&
      !editing)
  )
    return (
      <Onboarding
        user={user}
        initial={business}
        onReady={(b, f) => {
          setBusiness(b);
          setForms([f]);
          setEditing(f);
        }}
      />
    );
  const nav = [
    { name: "Forms", icon: FileText },
    { name: "Responses", icon: Inbox },
    ...(business.appointments_configured
      ? [{ name: "Appointments", icon: CalendarDays }]
      : []),
    { name: "Analytics", icon: BarChart3 },
    { name: "Team", icon: Users },
    { name: "Business settings", icon: Settings },
  ];
  return (
    <SidebarProvider
      style={{ "--sidebar-width": "238px" } as React.CSSProperties}
    >
      <Sidebar className="main-sidebar">
        <SidebarHeader className="sidebar-brand">
          <Brand />
        </SidebarHeader>
        <div className="business-switch">
          <span className="workspace-avatar">
            {business.logo ? (
              <NextImage
                unoptimized
                width={96}
                height={96}
                src={business.logo}
                alt=""
              />
            ) : (
              business.name.slice(0, 1)
            )}
          </span>
          <div>
            <strong>{business.name}</strong>
            <small>
              {business.role === "member"
                ? "Member · Assigned inbox"
                : "Owner workspace"}
            </small>
          </div>
        </div>
        {workspaces.length > 1 && (
          <label className="workspace-selector">
            Switch workspace
            <select
              aria-label="Switch workspace"
              value={business.id}
              disabled={!!editing}
              onChange={async (e) => {
                try {
                  await api("workspace", "POST", { id: e.target.value });
                  location.reload();
                } catch (e) {
                  toast.error((e as Error).message);
                }
              }}
            >
              {workspaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} · {w.role}
                </option>
              ))}
            </select>
          </label>
        )}
        <SidebarContent>
          <span className="nav-label">WORKSPACE</span>
          <SidebarMenu>
            {nav
              .filter(
                (n) => business.role !== "member" || n.name === "Responses",
              )
              .map(({ name, icon: Icon }) => (
                <SidebarMenuItem key={name}>
                  <SidebarMenuButton
                    asChild
                    isActive={page === name && !editing}
                  >
                    <SidebarNavigationAction
                      onClick={() => {
                        if (editing) {
                          toast.info(
                            "Use Back to forms to save and leave the builder.",
                          );
                          return;
                        }
                        setPage(name);
                        window.location.hash =
                          name === "Appointments"
                            ? "appointments/bookings"
                            : name.toLowerCase().replaceAll(" ", "-");
                      }}
                    >
                      <Icon size={19} />
                      <span>{name}</span>
                      {name === "Responses" && usage > 0 && (
                        <span className="nav-count">{usage}</span>
                      )}
                    </SidebarNavigationAction>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          {business.role !== "member" && (
            <div className="usage-box">
              <div className="between">
                <strong>{PLANS[business.plan].name} plan</strong>
                <span>
                  {usage} / {PLANS[business.plan].submissions}
                </span>
              </div>
              <Progress
                value={Math.min(
                  100,
                  (usage / PLANS[business.plan].submissions) * 100,
                )}
              />
              <small>Submissions this month</small>
              <button
                className="text-btn"
                onClick={() => {
                  if (!editing) setPage("Business settings");
                }}
              >
                Manage plan
                <ArrowUpRight size={14} />
              </button>
            </div>
          )}
          <button className="help-button" onClick={() => setHelp(true)}>
            <HelpCircle size={17} />A little help
          </button>
          <div className="sidebar-user">
            <span>{user.displayName.slice(0, 1).toUpperCase()}</span>
            <div>
              <strong>{user.displayName}</strong>
              <small>{user.email}</small>
            </div>
            <a href="/sign-out?return_to=/" aria-label="Sign out">
              <LogOut size={16} />
            </a>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="workspace-main">
        <header className="workspace-topbar">
          <div className="row">
            <SidebarTrigger />
            <span>Workspace</span>
            <ChevronRight size={13} />
            <strong>{editing ? "Form builder" : page}</strong>
          </div>
          <span className="topbar-status">
            <span />
            All your requests, connected
          </span>
        </header>
        {editing ? (
          <Builder
            key={editing.id}
            initial={editing}
            business={business}
            onBack={() => {
              setEditing(null);
              refresh();
              api("me").then((r) => setBusiness(r.business));
            }}
            onUpdated={(f) =>
              setForms((arr) =>
                arr.map((x) =>
                  x.id === f.id ? { ...f, submissions: x.submissions } : x,
                ),
              )
            }
          />
        ) : (
          <main className="workspace-content">
            {error && (
              <div className="error" role="alert">
                {error}
              </div>
            )}
            {page === "Forms" ? (
              <FormsPage
                forms={forms}
                business={business}
                usage={usage}
                onNew={() => setCreating(true)}
                onEdit={async (f, section = "build") => {
                  try {
                    const current = await api(`forms/${f.id}`);
                    window.history.replaceState(
                      null,
                      "",
                      `#forms/${f.id}/${section}`,
                    );
                    setEditing(current);
                  } catch (e) {
                    toast.error((e as Error).message);
                  }
                }}
                onRefresh={refresh}
              />
            ) : page === "Responses" ? (
              <ResponsesPage forms={forms} business={business} />
            ) : page === "Appointments" ? (
              <AppointmentsPage businessId={business.id} />
            ) : page === "Team" ? (
              <>
                <div className="page-title">
                  <div>
                    <span className="eyebrow">BETTER TOGETHER</span>
                    <h1>Your team</h1>
                    <p>Give every request a person to follow it through.</p>
                  </div>
                </div>
                <TeamSettings />
              </>
            ) : page === "Analytics" ? (
              <AnalyticsPage forms={forms} business={business} />
            ) : (
              <SettingsPage
                business={business}
                user={user}
                onSaved={setBusiness}
              />
            )}
            <footer className="workspace-footer">
              <span>{PRODUCT_NAME} · Less back-and-forth. More clarity.</span>
              <a href="/about">
                How {PRODUCT_NAME} works <ArrowUpRight size={13} />
              </a>
            </footer>
          </main>
        )}
      </SidebarInset>
      <NewForm
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(f) => {
          setForms((arr) => [f, ...arr]);
          window.history.replaceState(null, "", `#forms/${f.id}/build`);
          setEditing(f);
        }}
      />
      <Modal
        title="A little help"
        description="From form to conversation in a few steps."
        open={help}
        onClose={() => setHelp(false)}
      >
        <ol className="help-list">
          <li>
            <strong>Create a form.</strong> Start with a template and edit the
            questions or products.
          </li>
          <li>
            <strong>Preview and publish.</strong> Draft changes stay private
            until you publish them.
          </li>
          <li>
            <strong>Share the link or QR code.</strong> Customers fill out the
            form without an account.
          </li>
          <li>
            <strong>Continue on WhatsApp.</strong> Customers review their saved
            request and tap Send in WhatsApp.
          </li>
        </ol>
        <p className="notice">
          A handoff click only means the customer opened the WhatsApp link. It
          does not confirm a sent message, booking or sale.
        </p>
      </Modal>
      <Toaster richColors position="bottom-right" />
    </SidebarProvider>
  );
}
