import type { ReactNode } from "react";
import { NavBar } from "./NavBar";

type SiteFrameProps = {
  children: ReactNode;
};

export function SiteFrame({ children }: SiteFrameProps) {
  return (
    <div className="cafe-page">
      <div className="main-container">
        <NavBar />
        {children}
      </div>
    </div>
  );
}
