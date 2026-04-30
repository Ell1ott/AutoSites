import { CraftSection } from "./components/bachs/CraftSection";
import { HeroSection } from "./components/bachs/HeroSection";
import { MenuSection } from "./components/bachs/MenuSection";
import { OpeningHoursStrip } from "./components/bachs/OpeningHoursStrip";
import { OrderSection } from "./components/bachs/OrderSection";
import { ServicesSection } from "./components/bachs/ServicesSection";
import { SiteFooter } from "./components/bachs/SiteFooter";
import { TextureOverlay } from "./components/bachs/TextureOverlay";

export default function Home() {
  return (
    <>
      <TextureOverlay />
      <HeroSection />
      <OpeningHoursStrip />
      <CraftSection />
      <MenuSection />
      <ServicesSection />
      <OrderSection />
      <SiteFooter />
    </>
  );
}
