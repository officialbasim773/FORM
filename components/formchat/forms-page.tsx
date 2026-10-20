"use client";
import { useState } from "react";
import { FileText, Inbox, Plus, Search, ArrowUpRight, ArrowRight, MoreHorizontal, Copy, Pause, Link2, MessageCircle, Package, LayoutTemplate } from "lucide-react";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Business, FormRecord } from "@/lib/model";
import { PLANS } from "@/lib/config";
import { api, copy } from "@/lib/client";
import { Picker, Modal, Confirm } from "./ui";
import { Share } from "./builder";
import Customer from "./customer";

export default function FormsPage({
  forms,
  usage,
  business,
  onNew,
  onEdit,
  onRefresh,
}: {
  forms: FormRecord[];
  usage: number;
  business: Business;
  onNew: () => void;
  onEdit: (f: FormRecord) => void;
  onRefresh: () => void;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");
  const [share, setShare] = useState<FormRecord | null>(null);
  const [deleting, setDeleting] = useState<FormRecord | null>(null);
  const [preview, setPreview] = useState<FormRecord | null>(null);
  const [doing, setDoing] = useState(false);
  const filtered = forms.filter(
    (f) =>
      (status === "all" || f.status === status) &&
      (type === "all" || f.draft.type === type) &&
      f.draft.title.toLowerCase().includes(search.toLowerCase()),
  );
  const published = forms.filter((f) => f.status === "published").length;
  async function action(f: FormRecord, what: string) {
    setDoing(true);
    try {
      if (what === "duplicate") {
        await api(`forms/${f.id}/duplicate`, "POST", {});
        toast.success("Draft duplicated");
      } else if (what === "publish")
        await api(`forms/${f.id}/publish`, "POST", { revision: f.revision });
      else await api(`forms/${f.id}/status`, "POST", { status: what });
      onRefresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDoing(false);
    }
  }
  return (
    <>
      <div className="page-title">
        <div>
          <span className="eyebrow">YOUR WORKSPACE</span>
          <h1>Forms</h1>
          <p>A clear first step for every customer conversation.</p>
        </div>
        <button className="btn primary" onClick={onNew}>
          <Plus size={17} />
          Create form
        </button>
      </div>
      <div className="metrics-strip">
        <div>
          <span>
            <FileText size={16} />
            Published forms
          </span>
          <strong>
            {published}
            <small>/ {PLANS[business.plan].publishedForms}</small>
          </strong>
          <small>Ready to collect requests</small>
        </div>
        <div>
          <span>
            <Inbox size={16} />
            Submissions this month
          </span>
          <strong>
            {usage}
            <small>/ {PLANS[business.plan].submissions.toLocaleString()}</small>
          </strong>
          <small>Resets on the 1st · Includes deleted responses</small>
        </div>
        <div className="metric-tip">
          <MessageCircle size={27} />
          <div>
            <strong>A form first. A conversation next.</strong>
            <p>
              Customers share the details, then continue with you on WhatsApp.
            </p>
          </div>
        </div>
      </div>
      <div className="forms-toolbar">
        <Tabs value={status} onValueChange={setStatus}>
          <TabsList className="filter-tabs">
            {[
              ["all", "All forms"],
              ["published", "Published"],
              ["draft", "Drafts"],
              ["paused", "Paused"],
            ].map(([v, l]) => (
              <TabsTrigger value={v} key={v}>
                {l}
                <span>
                  {forms.filter((f) => v === "all" || f.status === v).length}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="row">
          <div className="search-box">
            <Search size={16} />
            <input
              aria-label="Search forms"
              placeholder="Search forms…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Picker
            value={type}
            label="Filter form type"
            onChange={setType}
            options={[
              { value: "all", label: "All types" },
              { value: "service", label: "Service enquiry" },
              { value: "product", label: "Product order" },
            ]}
          />
        </div>
      </div>
      <div className="forms-table">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Form name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submissions</TableHead>
              <TableHead>Last updated</TableHead>
              <TableHead className="text-right"> </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((f) => (
              <TableRow key={f.id}>
                <TableCell>
                  <button className="form-name" onClick={() => onEdit(f)}>
                    <span className={"form-icon " + f.draft.type}>
                      {f.draft.type === "service" ? (
                        <FileText size={22} />
                      ) : (
                        <Package size={22} />
                      )}
                    </span>
                    <span>
                      <strong>{f.draft.title}</strong>
                      <small>
                        {f.draft.type === "service"
                          ? "Service enquiry"
                          : "Product order"}
                        <span className="dot-separator">·</span>
                        {f.draft.questions.length} questions
                        {f.published &&
                          JSON.stringify(f.draft) !==
                            JSON.stringify(f.published) && (
                            <span className="draft-marker">
                              {" "}
                              · Unpublished changes
                            </span>
                          )}
                      </small>
                    </span>
                  </button>
                </TableCell>
                <TableCell>
                  <span className={"status-badge " + f.status}>
                    <span />
                    {f.status === "published"
                      ? "Published"
                      : f.status === "paused"
                        ? "Paused"
                        : "Draft"}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="submission-number">{f.submissions}</span>
                </TableCell>
                <TableCell>
                  <span className="date-cell">
                    {new Date(f.updated_at).toLocaleDateString("en", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <small className="date-sub">
                    {new Date(f.updated_at).toLocaleTimeString("en", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </small>
                </TableCell>
                <TableCell>
                  <div className="form-row-actions">
                    {f.status === "published" ? (
                      <button
                        className="btn compact"
                        onClick={() =>
                          copy(location.origin + "/f/" + f.slug)
                            .then(() => toast.success("Link copied"))
                            .catch(() => setShare(f))
                        }
                      >
                        <Link2 size={14} />
                        Copy link
                      </button>
                    ) : (
                      <button className="btn compact" onClick={() => onEdit(f)}>
                        Edit form
                        <ArrowUpRight size={14} />
                      </button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className="icon-btn"
                          aria-label={`Actions for ${f.draft.title}`}
                          disabled={doing}
                        >
                          <MoreHorizontal size={19} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(f)}>
                          Edit form
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setPreview(f)}>
                          Preview form
                        </DropdownMenuItem>
                        {f.status === "published" && (
                          <DropdownMenuItem onClick={() => setShare(f)}>
                            Share link & QR code
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => action(f, "duplicate")}
                        >
                          Duplicate form
                        </DropdownMenuItem>
                        {f.status === "published" ? (
                          <DropdownMenuItem onClick={() => action(f, "paused")}>
                            Pause responses
                          </DropdownMenuItem>
                        ) : (
                          f.version > 0 && (
                            <DropdownMenuItem
                              onClick={() => action(f, "publish")}
                            >
                              Publish current draft
                            </DropdownMenuItem>
                          )
                        )}
                        {f.status !== "draft" && (
                          <DropdownMenuItem onClick={() => action(f, "draft")}>
                            Unpublish form
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-700"
                          onClick={() => setDeleting(f)}
                        >
                          Delete form
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!filtered.length && (
          <div className="empty-state">
            <FileText size={29} />
            <h3>
              {forms.length
                ? "No matching forms"
                : "Your first form starts here"}
            </h3>
            <p>
              {forms.length
                ? "Try another search or filter."
                : "Collect the details you need before the WhatsApp conversation."}
            </p>
            {!forms.length && (
              <button className="btn primary" onClick={onNew}>
                <Plus size={16} />
                Create your first form
              </button>
            )}
          </div>
        )}
        <div className="table-footer">
          {filtered.length} {filtered.length === 1 ? "form" : "forms"}
          <span>Draft changes stay private until you publish.</span>
        </div>
      </div>
      <div className="template-banner">
        <div className="banner-icon">
          <LayoutTemplate size={24} />
        </div>
        <div>
          <h3>A good starting point saves time.</h3>
          <p>
            From a quick enquiry to a custom cake order. Make a template your
            own.
          </p>
        </div>
        <button className="text-btn" onClick={onNew}>
          Explore templates
          <ArrowRight size={16} />
        </button>
      </div>
      {share && <Share form={share} open onClose={() => setShare(null)} />}
      <Confirm
        title={`Delete “${deleting?.draft.title}”?`}
        description="The public link will stop working. Previously collected responses remain available in Responses until you delete them separately."
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          try {
            await api(`forms/${deleting!.id}`, "DELETE");
            setDeleting(null);
            onRefresh();
            toast.success("Form deleted. Historical responses retained.");
          } catch (e) {
            toast.error((e as Error).message);
          }
        }}
      />
      {preview && (
        <PreviewModal
          form={preview}
          business={business}
          onClose={() => setPreview(null)}
        />
      )}
    </>
  );
}
function PreviewModal({
  form,
  business,
  onClose,
}: {
  form: FormRecord;
  business: Business;
  onClose: () => void;
}) {
  return (
    <Modal
      title="Preview form"
      description="This is your current draft. Preview submissions are not stored."
      open
      onClose={onClose}
    >
      <Customer draft={form.draft} business={business} preview />
    </Modal>
  );
}
