"use client";

import { useEffect } from "react";

export function SiteHeaderNavToggle() {
  useEffect(() => {
    const nav = document.getElementById("bachs-mobile-menu");
    const backdrop = document.getElementById("bachs-mobile-backdrop");
    const openButton = document.getElementById("bachs-mobile-toggle");
    const closeButton = document.getElementById("bachs-mobile-close");

    if (!nav || !backdrop || !openButton || !closeButton) return;

    const setOpen = (open: boolean) => {
      nav.classList.toggle("is-open", open);
      backdrop.classList.toggle("is-open", open);
      openButton.setAttribute("aria-expanded", open ? "true" : "false");
      backdrop.setAttribute("aria-hidden", open ? "false" : "true");
      backdrop.setAttribute("tabindex", open ? "0" : "-1");
      document.body.style.overflow = open ? "hidden" : "";
    };

    const onOpen = () => setOpen(true);
    const onClose = () => setOpen(false);
    const onNavClick = (event: Event) => {
      if ((event.target as HTMLElement).closest("a")) {
        setOpen(false);
      }
    };

    openButton.addEventListener("click", onOpen);
    closeButton.addEventListener("click", onClose);
    backdrop.addEventListener("click", onClose);
    nav.addEventListener("click", onNavClick);

    return () => {
      openButton.removeEventListener("click", onOpen);
      closeButton.removeEventListener("click", onClose);
      backdrop.removeEventListener("click", onClose);
      nav.removeEventListener("click", onNavClick);
      document.body.style.overflow = "";
    };
  }, []);

  return null;
}
