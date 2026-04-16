export const SITE_NAME = "Kaffe&mere";

export const navLinks = [
  { href: "#", label: "The Brew" },
  { href: "#", label: "Spaces" },
  { href: "#", label: "Ethics" },
  { href: "#", label: "Visit" },
] as const;

export const menuItems = [
  {
    code: "001",
    title: "Origin V60",
    description: "Notes of stone fruit, bergamot, and morning air.",
    imageSrc:
      "https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&q=80&w=1000",
    imageAlt: "V60",
    offset: false,
  },
  {
    code: "002",
    title: "Dark Matter",
    description: "Viscous, velvety, with a lingering cocoa finish.",
    imageSrc:
      "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&q=80&w=1000",
    imageAlt: "Espresso",
    offset: true,
  },
  {
    code: "003",
    title: "Still Cold",
    description: "Steeped for 18 hours in stone crocks.",
    imageSrc:
      "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&q=80&w=1000",
    imageAlt: "Cold Brew",
    offset: false,
  },
] as const;

export const heroImageSrc =
  "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80&w=2070";

export const spaceImageSrc =
  "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=2047";
