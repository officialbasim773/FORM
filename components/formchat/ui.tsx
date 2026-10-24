"use client";
import NextImage from "next/image";
import { ReactNode } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Upload, LoaderCircle } from "lucide-react";
import { upload } from "@/lib/client";
import { toast } from "sonner";
import { useState } from "react";
export function Picker({
  value,
  onChange,
  options,
  label,
  disabled = false,
}: {
  value: string;
  onChange: (s: string) => void;
  options: (string | { value: string; label: string })[];
  label: string;
  disabled?: boolean;
}) {
  return (
    <Select
      value={value || undefined}
      onValueChange={onChange}
      disabled={disabled}
    >
      <SelectTrigger aria-label={label} className="picker">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => {
          const x = typeof o === "string" ? { value: o, label: o } : o;
          return (
            <SelectItem key={x.value} value={x.value}>
              {x.label}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
export function Toggle({
  label,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="toggle">
      <Switch
        type="button"
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        aria-label={label}
      />
      <span>{label}</span>
      <small className="toggle-state" aria-hidden="true">
        {checked ? "On" : "Off"}
      </small>
    </label>
  );
}
export function Modal({
  title,
  description,
  children,
  open,
  onClose,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="modal-content">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description || ""}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
export function Confirm({
  title,
  description,
  open,
  onClose,
  onConfirm,
}: {
  title: string;
  description: string;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep it</AlertDialogCancel>
          <AlertDialogAction className="danger-btn" onClick={onConfirm}>
            Delete permanently
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
export function ImagePicker({
  value,
  onChange,
  label = "Upload image",
}: {
  value: string;
  onChange: (s: string) => void;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="image-picker">
      {value && (
        <NextImage
          unoptimized
          width={1200}
          height={800}
          src={value}
          alt="Uploaded business image"
        />
      )}
      <label className="btn">
        <Upload size={15} />
        {busy ? "Uploading…" : label}
        <input
          className="sr-only"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={busy}
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setBusy(true);
            try {
              onChange(await upload(f));
            } catch (e) {
              toast.error((e as Error).message);
            } finally {
              setBusy(false);
              e.target.value = "";
            }
          }}
        />
      </label>
      <small>PNG, JPEG or WebP · up to 8 MB</small>
      {value && (
        <button
          type="button"
          disabled={busy}
          className="text-btn"
          onClick={() => onChange("")}
        >
          Remove
        </button>
      )}
    </div>
  );
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" size={23} /> Loading your workspace…
    </div>
  );
}
