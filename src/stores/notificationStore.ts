/**
 * Centralized Notification Store
 *
 * - Persists last 50 events to localStorage (idia_notifications_v1)
 * - Subscribed to via React useSyncExternalStore
 * - Single source of truth for the bell dropdown history
 */

import { useSyncExternalStore } from "react";

export type NotificationLevel = "info" | "success" | "warning" | "error";

export interface NotificationItem {
  id: string;
  level: NotificationLevel;
  title: string;
  description?: string;
  timestamp: number;
  read: boolean;
}

const STORAGE_KEY = "idia_notifications_v1";
const MAX_ITEMS = 50;

let items: NotificationItem[] = load();
const listeners = new Set<() => void>();

function load(): NotificationItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* quota — silently ignore */
  }
}

function emit() {
  for (const l of listeners) l();
}

export const notificationStore = {
  add(level: NotificationLevel, title: string, description?: string) {
    const item: NotificationItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      level,
      title,
      description,
      timestamp: Date.now(),
      read: false,
    };
    items = [item, ...items].slice(0, MAX_ITEMS);
    persist();
    emit();
    return item;
  },
  markAllRead() {
    items = items.map((i) => ({ ...i, read: true }));
    persist();
    emit();
  },
  clearAll() {
    items = [];
    persist();
    emit();
  },
  remove(id: string) {
    items = items.filter((i) => i.id !== id);
    persist();
    emit();
  },
  getSnapshot(): NotificationItem[] {
    return items;
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export function useNotifications() {
  return useSyncExternalStore(
    notificationStore.subscribe,
    notificationStore.getSnapshot,
    notificationStore.getSnapshot,
  );
}

export function useUnreadCount() {
  const list = useNotifications();
  return list.reduce((n, i) => (i.read ? n : n + 1), 0);
}
