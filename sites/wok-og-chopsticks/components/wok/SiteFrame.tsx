import type { ReactNode } from "react";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";
import { TopInfoBar } from "./TopInfoBar";

type SiteFrameProps = {
  children: ReactNode;
  overlayHeader?: boolean;
};

export function SiteFrame({ children, overlayHeader = false }: SiteFrameProps) {
  return (
    <>
      <TopInfoBar />
      <SiteHeader overlay={overlayHeader} />
      <main>{children}</main>
      <SiteFooter />
    </>
  );
}
