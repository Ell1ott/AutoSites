import type { ReactNode } from "react";
import { getEditMode } from "../server/mode";

/**
 * Root-level provider. For non-admin visitors this is a no-op that renders
 * children directly — the client provider module is never loaded. For admins
 * in edit mode it dynamically imports the client provider (which in turn
 * mounts the toast system, edit banner, and React context used by client
 * editors).
 */
export async function EditableProvider({ children }: { children: ReactNode }) {
  const editMode = await getEditMode();
  if (!editMode) return <>{children}</>;

  const { EditableProviderClient } = await import(
    "../client/EditableProvider"
  );
  return <EditableProviderClient>{children}</EditableProviderClient>;
}
