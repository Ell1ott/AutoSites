import Link from "next/link";
import type { ReactNode } from "react";
import "./cms-admin-link.css";

type CmsFooterAdminLinkProps = {
  /** Defaults to the CMS sign-in route for this app. */
  href?: string;
  className?: string;
  children?: ReactNode;
};

/**
 * Small, muted link to the CMS admin sign-in page. Intended for footer
 * utility rows alongside copyright — typography matches typical fine-print
 * footer copy (uppercase, wide tracking).
 */
export function CmsFooterAdminLink({
  href = "/cms/login",
  className,
  children = "Admin",
}: CmsFooterAdminLinkProps) {
  return (
    <Link
      href={href}
      className={["cms-footer-admin-link", className].filter(Boolean).join(" ")}
      aria-label="CMS admin sign in"
    >
      {children}
    </Link>
  );
}
