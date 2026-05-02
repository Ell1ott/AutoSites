"use client";

import { useSyncExternalStore } from "react";
import * as RadixToast from "@radix-ui/react-toast";

export type Toast = {
  id: string;
  kind: "success" | "error" | "info";
  message: string;
};

type Listener = (toasts: Toast[]) => void;

const store = {
  toasts: [] as Toast[],
  listeners: new Set<Listener>(),
};

function emit() {
  for (const l of store.listeners) l(store.toasts);
}

function subscribe(l: Listener) {
  store.listeners.add(l);
  return () => {
    store.listeners.delete(l);
  };
}

function getSnapshot() {
  return store.toasts;
}

const emptySnapshot: Toast[] = [];
function getServerSnapshot() {
  return emptySnapshot;
}

export const useToastStore = {
  push: (toast: Omit<Toast, "id"> & { id?: string }): { id: string } => {
    const id = toast.id ?? crypto.randomUUID();
    store.toasts = [...store.toasts, { ...toast, id }];
    emit();
    return { id };
  },
  dismiss: (id: string) => {
    store.toasts = store.toasts.filter((t) => t.id !== id);
    emit();
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _: undefined as any,
};

export function useToastStoreSelector<T>(
  selector: (store: typeof useToastStore) => T,
): T {
  return selector(useToastStore);
}

export function Toaster() {
  const toasts = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return (
    <RadixToast.Provider swipeDirection="right" duration={2500}>
      {toasts.map((t) => (
        <RadixToast.Root
          key={t.id}
          className={`cms-toast cms-toast--${t.kind}`}
          duration={t.kind === "error" ? Infinity : 2500}
          onOpenChange={(open) => {
            if (!open) useToastStore.dismiss(t.id);
          }}
        >
          <RadixToast.Description>{t.message}</RadixToast.Description>
          {t.kind === "error" ? (
            <RadixToast.Close className="cms-toast__close" aria-label="Dismiss">
              ×
            </RadixToast.Close>
          ) : null}
        </RadixToast.Root>
      ))}
      <RadixToast.Viewport className="cms-toast-viewport" />
    </RadixToast.Provider>
  );
}
