import { Suspense, type ReactNode } from "react";
import { AnalyticsBoot } from "@autosites/analytics/server";
import { EditableProvider } from "@autosites/cms/components";
import { CmsClientLoggerBridge } from "./CmsClientLoggerBridge";

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <AnalyticsBoot>
        <CmsClientLoggerBridge />
        <EditableProvider>{children}</EditableProvider>
      </AnalyticsBoot>
    </Suspense>
  );
}
