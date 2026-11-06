"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveMenuItemAction } from "@/app/admin/(panel)/menu/actions";
import { uploadMediaAction } from "@/app/admin/(panel)/actions";
import { ALLERGEN_OPTIONS } from "@/lib/domain/allergens";
import { DAY_SHORT } from "@/lib/domain/hours";
import { parseDollarsToCents } from "@/lib/domain/money";
import { slugify, type MenuItemInput } from "@/lib/domain/menu-schema";
import { resolveImage } from "@/lib/domain/images";
import { Alert, Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Button, buttonClass } from "@/components/ui/Button";
import { Switch } from "./MenuRow";

type Choice = { id?: string; name: string; price: string; isDefault: boolean; isAvailable: boolean };
type Group = { id?: string; name: string; kind: "PORTION" | "MODIFIER"; required: boolean; minSelect: number; maxSelect: number; choices: Choice[] };
export type ImageOption = { path: string; label: string };

const money = (c: number) => (c / 100).toFixed(2);

export function MenuItemForm({
  initial,
  categories,
  images,
}: {
  initial: MenuItemInput & { id?: string };
  categories: { id: string; name: string }[];
  images: ImageOption[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [f, setF] = useState({ ...initial, price: money(initial.priceCents), dailyLimitText: initial.dailyLimit?.toString() ?? "" });
  const [slugTouched, setSlugTouched] = useState(!!initial.id);
  const [groups, setGroups] = useState<Group[]>(
    initial.optionGroups.map((g) => ({ ...g, choices: g.choices.map((c) => ({ ...c, price: money(c.priceDeltaCents) })) })),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [imageList, setImageList] = useState(images);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  async function uploadPhoto(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setUploadMsg(null);
    const fd = new FormData();
    fd.set("file", file);
    fd.set("alt", f.imageAlt || f.name || "");
    const r = await uploadMediaAction(fd);
    setUploading(false);
    if (r.ok && r.data) {
      const path = `media:${r.data.id}`;
      setImageList((l) => [{ path, label: `Upload: ${f.imageAlt || f.name || file.name}` }, ...l]);
      setF((p) => ({ ...p, imagePath: path }));
      setUploadMsg({ tone: "ok", text: "Photo uploaded. Save the dish to publish it." });
    } else {
      setUploadMsg({ tone: "err", text: r.ok ? "Upload failed" : r.error });
    }
  }
  const [saved, setSaved] = useState(false);

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => {
    setSaved(false);
    setF((p) => ({ ...p, [k]: v }));
  };
  const setGroup = (gi: number, patch: Partial<Group>) => setGroups((gs) => gs.map((g, i) => (i === gi ? { ...g, ...patch } : g)));
  const setChoice = (gi: number, ci: number, patch: Partial<Choice>) =>
    setGroups((gs) => gs.map((g, i) => (i === gi ? { ...g, choices: g.choices.map((c, j) => (j === ci ? { ...c, ...patch } : c)) } : g)));

  function toggleIn<T>(list: T[], v: T) {
    return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const priceCents = parseDollarsToCents(f.price);
    const errs: Record<string, string> = {};
    if (priceCents === null) errs.priceCents = "Enter a price like 12 or 12.50";
    const dailyLimit = f.dailyLimitText.trim() ? Number(f.dailyLimitText) : null;
    if (dailyLimit !== null && (!Number.isInteger(dailyLimit) || dailyLimit < 1)) errs.dailyLimit = "Enter a whole number, or leave blank for no limit";
    const optionGroups = groups.map((g, gi) => ({
      id: g.id,
      name: g.name,
      kind: g.kind,
      required: g.required,
      minSelect: g.minSelect,
      maxSelect: g.kind === "PORTION" ? 1 : g.maxSelect,
      choices: g.choices.map((c, ci) => {
        const d = c.price.trim() === "" ? 0 : c.price.trim().startsWith("-") ? -(parseDollarsToCents(c.price.trim().slice(1)) ?? NaN) : parseDollarsToCents(c.price);
        if (d === null || Number.isNaN(d)) errs[`optionGroups.${gi}.choices.${ci}.priceDeltaCents`] = "Invalid price";
        return { id: c.id, name: c.name, priceDeltaCents: d ?? 0, isDefault: c.isDefault, isAvailable: c.isAvailable };
      }),
    }));
    if (Object.keys(errs).length) {
      setErrors(errs);
      setFormError("Fix the highlighted fields.");
      return;
    }
    const payload: MenuItemInput & { id?: string } = {
      id: f.id,
      name: f.name,
      slug: f.slug,
      categoryId: f.categoryId,
      shortDescription: f.shortDescription,
      description: f.description,
      portion: f.portion || null,
      priceCents: priceCents!,
      imagePath: f.imagePath || null,
      imageAlt: f.imageAlt || null,
      isAvailable: f.isAvailable,
      isFeatured: f.isFeatured,
      isDailySpecial: f.isDailySpecial,
      isVegetarian: f.isVegetarian,
      spiceLevel: f.spiceLevel,
      ingredients: f.ingredients || null,
      allergens: f.allergens,
      mayContain: f.mayContain,
      allergensConfirmed: f.allergensConfirmed,
      gstTreatment: f.gstTreatment,
      dailyLimit,
      maxPerOrder: f.maxPerOrder,
      prepLeadHours: f.prepLeadHours,
      availableDays: f.availableDays,
      optionGroups,
    };
    start(async () => {
      const r = await saveMenuItemAction(payload);
      if (!r.ok) {
        setErrors(r.fieldErrors ?? {});
        setFormError(r.error);
        return;
      }
      setErrors({});
      setFormError(null);
      setSaved(true);
      if (!f.id && r.data) router.replace(`/admin/menu/${(r.data as { id: string }).id}?created=1`);
      else router.refresh();
    });
  }

  const preview = resolveImage(f.imagePath);

  return (
    <form onSubmit={submit} className="grid gap-8 xl:grid-cols-[1fr_20rem]" noValidate>
      <div className="space-y-8">
        {formError ? <Alert tone="error">{formError}</Alert> : null}
        {saved ? <Alert tone="success">Saved. The website now shows these changes.</Alert> : null}

        <fieldset className="grid gap-5 rounded-2xl border border-line bg-raised p-5 sm:grid-cols-2">
          <legend className="px-1 font-semibold">Dish</legend>
          <Field id="name" label="Name" error={errors.name} required>
            <Input
              id="name"
              value={f.name}
              error={errors.name}
              onChange={(e) => {
                set("name", e.target.value);
                if (!slugTouched) set("slug", slugify(e.target.value));
              }}
            />
          </Field>
          <Field id="slug" label="Web address" error={errors.slug} hint={`/menu/${f.slug || "…"}`} required>
            <Input
              id="slug"
              value={f.slug}
              error={errors.slug}
              onChange={(e) => {
                setSlugTouched(true);
                set("slug", e.target.value);
              }}
            />
          </Field>
          <Field id="categoryId" label="Category" error={errors.categoryId} required>
            <Select id="categoryId" value={f.categoryId} error={errors.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
              <option value="">Choose…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field id="price" label="Menu price (AUD)" error={errors.priceCents} required>
              <Input id="price" inputMode="decimal" value={f.price} error={errors.priceCents} onChange={(e) => set("price", e.target.value)} />
            </Field>
            <Field id="portion" label="Portion" hint="e.g. 750ml">
              <Input id="portion" value={f.portion ?? ""} onChange={(e) => set("portion", e.target.value)} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field id="short" label="Short description" error={errors.shortDescription} hint="Shown on menu cards (140 characters max)" required>
              <Input id="short" maxLength={140} value={f.shortDescription} error={errors.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field id="desc" label="Full description" error={errors.description}>
              <Textarea id="desc" value={f.description} onChange={(e) => set("description", e.target.value)} />
            </Field>
          </div>
          <Field id="spice" label="Spice level" required>
            <Select id="spice" value={f.spiceLevel} onChange={(e) => set("spiceLevel", Number(e.target.value))}>
              <option value={0}>Not spicy / not shown</option>
              <option value={1}>Mild</option>
              <option value={2}>Medium</option>
              <option value={3}>Hot</option>
            </Select>
          </Field>
          <div className="flex flex-wrap items-end gap-x-6 gap-y-3 pb-1">
            {(
              [
                ["isAvailable", "On sale"],
                ["isFeatured", "Featured on home"],
                ["isDailySpecial", "Special"],
                ["isVegetarian", "Vegetarian"],
              ] as const
            ).map(([k, label]) => (
              <label key={k} className="flex items-center gap-2 text-sm">
                <Switch checked={f[k]} onChange={(v) => set(k, v)} label={label} />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-4 rounded-2xl border border-line bg-raised p-5">
          <legend className="px-1 font-semibold">Ingredients &amp; allergens</legend>
          <Field id="ingredients" label="Ingredients" hint="Shown on the dish page">
            <Textarea id="ingredients" className="min-h-20" value={f.ingredients ?? ""} onChange={(e) => set("ingredients", e.target.value)} />
          </Field>
          {(["allergens", "mayContain"] as const).map((key) => (
            <div key={key}>
              <p className="mb-2 text-sm font-semibold">{key === "allergens" ? "Contains" : "May contain (cross-contact)"}</p>
              <div className="flex flex-wrap gap-2">
                {ALLERGEN_OPTIONS.map((a) => {
                  const on = f[key].includes(a);
                  return (
                    <label key={a} className={`cursor-pointer rounded-full border px-3 py-1 text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[var(--focus)] ${on ? "border-gold bg-gold/15" : "border-line text-muted"}`}>
                      <input type="checkbox" className="sr-only" checked={on} onChange={() => set(key, toggleIn(f[key], a))} />
                      {a}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
          <label className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm">
            <input type="checkbox" className="mt-1 size-4 accent-[var(--gold)]" checked={f.allergensConfirmed} onChange={(e) => set("allergensConfirmed", e.target.checked)} />
            <span>
              <strong>I&apos;ve checked this dish&apos;s allergens against the recipe and suppliers&apos; labels.</strong> Until this is ticked, the website
              asks customers to call or message you to verify allergens.
            </span>
          </label>
        </fieldset>

        <fieldset className="space-y-4 rounded-2xl border border-line bg-raised p-5">
          <legend className="px-1 font-semibold">Portions &amp; options</legend>
          <p className="text-sm text-muted">
            Portion groups let customers pick one size (e.g. Half kg / Full kg). Option groups are add-ons or preferences (e.g. spice level, extra dip).
            Price changes are added to the dish price.
          </p>
          {groups.map((g, gi) => (
            <div key={g.id ?? `new-${gi}`} className="rounded-xl border border-line p-4">
              <div className="grid gap-3 sm:grid-cols-[1fr_9rem_auto]">
                <Field id={`g-${gi}-name`} label="Group name" error={errors[`optionGroups.${gi}.name`]} required>
                  <Input id={`g-${gi}-name`} value={g.name} onChange={(e) => setGroup(gi, { name: e.target.value })} />
                </Field>
                <Field id={`g-${gi}-kind`} label="Type" required>
                  <Select
                    id={`g-${gi}-kind`}
                    value={g.kind}
                    onChange={(e) => {
                      const kind = e.target.value as Group["kind"];
                      setGroup(gi, kind === "PORTION" ? { kind, required: true, minSelect: 1, maxSelect: 1 } : { kind });
                    }}
                  >
                    <option value="PORTION">Portion size</option>
                    <option value="MODIFIER">Option / add-on</option>
                  </Select>
                </Field>
                <button type="button" onClick={() => setGroups((gs) => gs.filter((_, i) => i !== gi))} className="self-end pb-2.5 text-sm text-muted hover:text-danger">
                  Remove group
                </button>
              </div>
              {g.kind === "MODIFIER" ? (
                <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
                  <label className="flex items-center gap-2">
                    <Switch checked={g.required} onChange={(v) => setGroup(gi, { required: v, minSelect: v ? Math.max(1, g.minSelect) : 0 })} label="Required" />
                    Customer must choose
                  </label>
                  <label className="flex items-center gap-2">
                    Up to
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={g.maxSelect}
                      onChange={(e) => setGroup(gi, { maxSelect: Math.max(1, Number(e.target.value) || 1) })}
                      className="h-9 w-16 rounded-lg border border-line bg-sunken px-2"
                      aria-label="Maximum choices"
                    />
                    choices
                  </label>
                </div>
              ) : null}
              {Object.entries(errors)
                .filter(([k]) => k.startsWith(`optionGroups.${gi}.`) && !k.includes("choices."))
                .map(([k, v]) => (
                  <p key={k} className="mt-2 text-sm text-danger">
                    {v}
                  </p>
                ))}
              <ul className="mt-4 space-y-2">
                {g.choices.map((c, ci) => (
                  <li key={c.id ?? `c-${ci}`} className="grid grid-cols-[1fr_6.5rem] items-center gap-2 sm:grid-cols-[1fr_7rem_auto_auto_auto]">
                    <input aria-label="Choice name" value={c.name} onChange={(e) => setChoice(gi, ci, { name: e.target.value })} placeholder="Choice name" className="h-9 rounded-lg border border-line bg-sunken px-3" />
                    <input
                      aria-label={`Price change for ${c.name || "choice"}`}
                      value={c.price}
                      onChange={(e) => setChoice(gi, ci, { price: e.target.value })}
                      placeholder="+0.00"
                      inputMode="decimal"
                      className={`h-9 rounded-lg border bg-sunken px-3 text-right ${errors[`optionGroups.${gi}.choices.${ci}.priceDeltaCents`] ? "border-danger" : "border-line"}`}
                    />
                    <label className="flex items-center gap-1.5 text-xs">
                      <input type={g.maxSelect === 1 ? "radio" : "checkbox"} name={`def-${gi}`} checked={c.isDefault} onChange={(e) => setGroups((gs) => gs.map((gg, i) => (i !== gi ? gg : { ...gg, choices: gg.choices.map((cc, j) => ({ ...cc, isDefault: j === ci ? e.target.checked : gg.maxSelect === 1 ? false : cc.isDefault })) })))} />
                      Default
                    </label>
                    <label className="flex items-center gap-1.5 text-xs">
                      <input type="checkbox" checked={c.isAvailable} onChange={(e) => setChoice(gi, ci, { isAvailable: e.target.checked })} />
                      Available
                    </label>
                    <button type="button" onClick={() => setGroup(gi, { choices: g.choices.filter((_, j) => j !== ci) })} className="text-xs text-muted hover:text-danger" aria-label={`Remove ${c.name || "choice"}`}>
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
              <button type="button" onClick={() => setGroup(gi, { choices: [...g.choices, { name: "", price: "0.00", isDefault: false, isAvailable: true }] })} className="mt-3 text-sm font-semibold text-gold">
                + Add choice
              </button>
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <button type="button" className={buttonClass("outline", "sm")} onClick={() => setGroups((gs) => [...gs, { name: "Portion", kind: "PORTION", required: true, minSelect: 1, maxSelect: 1, choices: [{ name: "", price: "0.00", isDefault: true, isAvailable: true }] }])}>
              + Portion sizes
            </button>
            <button type="button" className={buttonClass("outline", "sm")} onClick={() => setGroups((gs) => [...gs, { name: "", kind: "MODIFIER", required: false, minSelect: 0, maxSelect: 1, choices: [{ name: "", price: "0.00", isDefault: false, isAvailable: true }] }])}>
              + Option group
            </button>
          </div>
        </fieldset>

        <fieldset className="grid gap-5 rounded-2xl border border-line bg-raised p-5 sm:grid-cols-2">
          <legend className="px-1 font-semibold">Ordering rules</legend>
          <Field id="maxPerOrder" label="Most per order" required>
            <Input id="maxPerOrder" type="number" min={1} value={f.maxPerOrder} onChange={(e) => set("maxPerOrder", Math.max(1, Number(e.target.value) || 1))} />
          </Field>
          <Field id="dailyLimit" label="Most we can make per day" error={errors.dailyLimit} hint="Leave blank for no limit">
            <Input id="dailyLimit" inputMode="numeric" value={f.dailyLimitText} error={errors.dailyLimit} onChange={(e) => set("dailyLimitText", e.target.value)} />
          </Field>
          <Field id="prep" label="Notice needed (hours)" hint="Used if longer than the business minimum notice" required>
            <Input id="prep" type="number" min={0} value={f.prepLeadHours} onChange={(e) => set("prepLeadHours", Math.max(0, Number(e.target.value) || 0))} />
          </Field>
          <Field id="gst" label="GST treatment" hint="Confirm with your tax adviser. Only applies once GST registration is switched on in Settings." required>
            <Select id="gst" value={f.gstTreatment} onChange={(e) => set("gstTreatment", e.target.value as "TAXABLE" | "GST_FREE")}>
              <option value="TAXABLE">Taxable</option>
              <option value="GST_FREE">GST-free</option>
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <p className="mb-2 text-sm font-semibold">Available on</p>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5, 6, 0].map((d) => {
                const on = f.availableDays.includes(d);
                return (
                  <label key={d} className={`cursor-pointer rounded-full border px-3 py-1 text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[var(--focus)] ${on ? "border-gold bg-gold/15" : "border-line text-muted"}`}>
                    <input type="checkbox" className="sr-only" checked={on} onChange={() => set("availableDays", toggleIn(f.availableDays, d))} />
                    {DAY_SHORT[d]}
                  </label>
                );
              })}
            </div>
            <p className="mt-1 text-sm text-muted">{f.availableDays.length ? "Only on the selected days." : "None selected = every day you're open."}</p>
          </div>
        </fieldset>
      </div>

      <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
        <div className="rounded-2xl border border-line bg-raised p-5">
          <p className="mb-3 font-semibold">Photo</p>
          <div className="arch relative mx-auto aspect-[4/5] w-48 overflow-hidden bg-sunken">
            {preview ? <Image src={preview} alt="" fill sizes="192px" className="object-cover" /> : <span className="absolute inset-0 grid place-items-center text-sm text-muted">No photo</span>}
          </div>
          <Field id="image" label="Choose photo">
            <Select id="image" value={f.imagePath ?? ""} onChange={(e) => set("imagePath", e.target.value || null)}>
              <option value="">No photo (shows “Photo coming soon”)</option>
              {imageList.map((i) => (
                <option key={i.path} value={i.path}>
                  {i.label}
                </option>
              ))}
            </Select>
          </Field>
          <div className="mt-3">
            <label htmlFor="photo-upload" className={buttonClass("outline", "md", "w-full cursor-pointer")}>
              {uploading ? "Uploading…" : "Upload a new photo"}
            </label>
            <input
              id="photo-upload"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif"
              className="sr-only"
              disabled={uploading}
              onChange={(e) => {
                void uploadPhoto(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <p className="mt-1 text-xs text-muted">From your phone or computer. Resized automatically.</p>
            {uploadMsg ? (
              <p role="status" className={`mt-1 text-sm ${uploadMsg.tone === "ok" ? "text-success" : "text-danger"}`}>
                {uploadMsg.text}
              </p>
            ) : null}
          </div>
          <div className="mt-3">
            <Field id="alt" label="Photo description" hint="For screen readers, e.g. “Chicken biryani in a foil tray”">
              <Input id="alt" value={f.imageAlt ?? ""} onChange={(e) => set("imageAlt", e.target.value)} />
            </Field>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? "Saving…" : f.id ? "Save changes" : "Create dish"}
          </Button>
          <Link href="/admin/menu" className={buttonClass("ghost", "md")}>
            Back to menu
          </Link>
          {f.id ? (
            <Link href={`/menu/${initial.slug}`} target="_blank" className="text-center text-sm text-muted underline">
              View on website
            </Link>
          ) : null}
        </div>
      </aside>
    </form>
  );
}
