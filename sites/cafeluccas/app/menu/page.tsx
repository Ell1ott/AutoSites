import "../cafe-home.css";
import { FooterMapSection } from "../../components/cafe/FooterMapSection";
import { MenuPageContent } from "../../components/cafe/MenuPageContent";
import { SiteFrame } from "../../components/cafe/SiteFrame";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Menu",
  description:
    "Menukort: sandwich, burgere, pizza og frokosttilbud. Café Luccas, Storgade 38, Sorø. Alle dage 11–22.",
};

export default function MenuPage() {
  return (
    <SiteFrame>
      <div className="menu-page" aria-labelledby="menu-heading">
        <MenuPageContent />
      </div>
      <FooterMapSection />
    </SiteFrame>
  );
}
