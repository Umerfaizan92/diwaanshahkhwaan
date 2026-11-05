import type { ComponentProps, ReactNode } from "react";

const control =
  "w-full rounded-xl border border-line bg-sunken px-3.5 py-2.5 text-text placeholder:text-muted/70 outline-none transition-colors focus:border-gold focus-visible:outline-2 focus-visible:outline-offset-1 aria-[invalid=true]:border-danger";

export function Field({ id, label, error, hint, children, required }: { id: string; label: ReactNode; error?: string; hint?: ReactNode; children: ReactNode; required?: boolean }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">
        {label}
        {required ? <span aria-hidden className="text-gold"> *</span> : <span className="font-normal text-muted"> (optional)</span>}
      </label>
      {children}
      {hint && !error ? (
        <p id={`${id}-hint`} className="mt-1 text-sm text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Input({ error, className = "", ...p }: ComponentProps<"input"> & { error?: string }) {
  const describedBy = [error ? `${p.id}-error` : null, `${p.id}-hint`].filter(Boolean).join(" ");
  return <input aria-invalid={error ? true : undefined} aria-describedby={describedBy} className={`${control} ${className}`} {...p} />;
}

export function Textarea({ error, className = "", ...p }: ComponentProps<"textarea"> & { error?: string }) {
  return <textarea aria-invalid={error ? true : undefined} aria-describedby={error ? `${p.id}-error` : undefined} className={`${control} min-h-32 ${className}`} {...p} />;
}

export function Select({ error, className = "", ...p }: ComponentProps<"select"> & { error?: string }) {
  return <select aria-invalid={error ? true : undefined} aria-describedby={error ? `${p.id}-error` : undefined} className={`${control} ${className}`} {...p} />;
}

export function Alert({ tone = "info", children }: { tone?: "info" | "success" | "error" | "warning"; children: ReactNode }) {
  const tones = {
    info: "border-gold/40 bg-gold/10",
    success: "border-success/50 bg-success/10",
    error: "border-danger/50 bg-danger/10",
    warning: "border-warning/50 bg-warning/10",
  };
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-[0.95rem] ${tones[tone]}`}>
      {children}
    </div>
  );
}
