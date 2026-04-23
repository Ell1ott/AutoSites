import type { ReactNode } from "react";

type CmsFooterAdminLinkProps = {
  /** Defaults to the CMS sign-in route for this app. */
  href?: string;
  className?: string;
  children?: ReactNode;
};

/**
 * Link to enter edit mode (sets the `cms-edit` cookie when already signed in;
 * otherwise redirects to sign-in). Unstyled — pass `className` (and layout
 * wrappers) from the site so the footer can match its design.
 */
export function CmsFooterAdminLink({
  href = "/cms/edit",
  className,
  children = "Admin",
}: CmsFooterAdminLinkProps) {
  // Use a plain <a> so the browser does a full navigation. <Link> client
  // transitions can apply the redirect before the new cookie is visible to RSC.
  return (
    <a href={href} className={className} aria-label="Enter CMS edit mode">
      {children}
    </a>
  );
}
