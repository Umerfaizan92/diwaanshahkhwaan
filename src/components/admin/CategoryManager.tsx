"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteCategoryAction, moveCategoryAction, saveCategoryAction } from "@/app/admin/(panel)/menu/actions";
import { slugify } from "@/lib/domain/menu-schema";
import { Alert, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Switch } from "./MenuRow";

type Cat = { id: string; name: string; slug: string; description: string | null; isVisible: boolean; count: number };

function CategoryRow({ c, first, last, onMsg }: { c: Cat; first: boolean; last: boolean; onMsg: (m: { tone: "success" | "error"; text: string }) => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState(c.name);
  const [description, setDescription] = useState(c.description ?? "");
  const dirty = name !== c.name || description !== (c.description ?? "");

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, ok: string) =>
    start(async () => {
      const r = await fn();
      onMsg(r.ok ? { tone: "success", text: ok } : { tone: "error", text: r.error ?? "Failed" });
      router.refresh();
    });

  return (
    <li className="grid gap-3 py-4 md:grid-cols-[1fr_1.5fr_auto] md:items-center" aria-busy={pending}>
      <div>
        <Input id={`n-${c.id}`} aria-label="Category name" value={name} onChange={(e) => setName(e.target.value)} />
        <p className="mt-1 text-xs text-muted">
          /menu#{c.slug} · {c.count} dish{c.count === 1 ? "" : "es"}
        </p>
      </div>
      <Input id={`d-${c.id}`} aria-label="Category description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description (optional)" />
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={c.isVisible} onChange={(v) => run(() => saveCategoryAction({ id: c.id, name: c.name, slug: c.slug, description: c.description, isVisible: v }), v ? "Category shown" : "Category hidden")} label={`${c.name} visible on site`} />
          Visible
        </label>
        <Button size="sm" variant="outline" disabled={!dirty || pending} onClick={() => run(() => saveCategoryAction({ id: c.id, name, slug: c.slug, description: description || null, isVisible: c.isVisible }), "Category saved")}>
          Save
        </Button>
        <button type="button" disabled={first || pending} onClick={() => run(() => moveCategoryAction(c.id, -1), "Moved up")} aria-label={`Move ${c.name} up`} className="rounded px-2 py-1 text-muted disabled:opacity-30">
          ↑
        </button>
        <button type="button" disabled={last || pending} onClick={() => run(() => moveCategoryAction(c.id, 1), "Moved down")} aria-label={`Move ${c.name} down`} className="rounded px-2 py-1 text-muted disabled:opacity-30">
          ↓
        </button>
        <button type="button" disabled={pending} onClick={() => run(() => deleteCategoryAction(c.id), "Category deleted")} className="rounded px-2 py-1 text-sm text-muted hover:text-danger">
          Delete
        </button>
      </div>
    </li>
  );
}

export function CategoryManager({ categories }: { categories: Cat[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [newName, setNewName] = useState("");

  function create(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const r = await saveCategoryAction({ name: newName, slug: slugify(newName), description: null, isVisible: true });
      setMsg(r.ok ? { tone: "success", text: `Added “${newName}”` } : { tone: "error", text: r.error });
      if (r.ok) setNewName("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {msg ? <Alert tone={msg.tone}>{msg.text}</Alert> : null}
      <ul className="divide-y divide-line/70 rounded-2xl border border-line bg-raised px-5">
        {categories.map((c, i) => (
          <CategoryRow key={`${c.id}-${c.name}-${c.isVisible}-${c.description}`} c={c} first={i === 0} last={i === categories.length - 1} onMsg={setMsg} />
        ))}
      </ul>
      <form onSubmit={create} className="flex flex-wrap items-end gap-3 rounded-2xl border border-dashed border-line p-5">
        <div className="min-w-60 flex-1">
          <label htmlFor="new-cat" className="mb-1.5 block text-sm font-semibold">
            New category
          </label>
          <Input id="new-cat" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Breakfast" />
        </div>
        <Button type="submit" disabled={pending || newName.trim().length < 2}>
          Add category
        </Button>
      </form>
    </div>
  );
}
