"use client";

import { useSyncExternalStore } from "react";
import { lineKey } from "@/lib/domain/pricing";

/**
 * Persistent cart kept in localStorage. Prices stored here are display hints only;
 * the server re-prices everything from the database before any total is trusted.
 */
export type CartItem = {
  key: string;
  menuItemId: string;
  slug: string;
  name: string;
  image: string | null;
  quantity: number;
  choiceIds: string[];
  optionLabels: string[];
  unitPriceHintCents: number;
  maxPerOrder: number;
};

const STORAGE_KEY = "dsk-cart-v1";
const EMPTY: CartItem[] = [];
let memory: CartItem[] = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function read(): CartItem[] {
  if (!loaded) {
    loaded = true;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as CartItem[]) : [];
      memory = Array.isArray(parsed) ? parsed.filter((x) => x && typeof x.menuItemId === "string" && Number.isInteger(x.quantity) && x.quantity > 0) : [];
    } catch {
      memory = [];
    }
  }
  return memory;
}

function write(next: CartItem[]) {
  memory = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable (private mode): cart still works for this visit */
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      loaded = false;
      cb();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export const cart = {
  get: read,
  add(item: Omit<CartItem, "key">) {
    const key = lineKey(item.menuItemId, item.choiceIds);
    const items = read();
    const existing = items.find((i) => i.key === key);
    if (existing) {
      write(items.map((i) => (i.key === key ? { ...i, quantity: Math.min(i.quantity + item.quantity, item.maxPerOrder), unitPriceHintCents: item.unitPriceHintCents } : i)));
    } else {
      write([...items, { ...item, key, quantity: Math.min(item.quantity, item.maxPerOrder) }]);
    }
  },
  setQuantity(key: string, quantity: number) {
    write(read().flatMap((i) => (i.key !== key ? [i] : quantity <= 0 ? [] : [{ ...i, quantity: Math.min(quantity, i.maxPerOrder) }])));
  },
  remove(key: string) {
    write(read().filter((i) => i.key !== key));
  },
  clear() {
    write([]);
  },
};

export function useCart(): CartItem[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function useCartCount(): number {
  return useCart().reduce((s, i) => s + i.quantity, 0);
}
