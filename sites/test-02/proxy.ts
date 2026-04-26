export { proxy } from "@autosites/cms/proxy";

// Config must be declared statically at the app root — Next can't see it
// through a re-export. Keep the matcher in sync with packages/cms/src/proxy.ts.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|woff2?)).*)",
  ],
};
