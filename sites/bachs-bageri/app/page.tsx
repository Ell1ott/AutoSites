import { CraftSection } from "./components/bachs/CraftSection";
import { HeroSection } from "./components/bachs/HeroSection";
import { MenuSection } from "./components/bachs/MenuSection";
import { OrderSection } from "./components/bachs/OrderSection";
import { SiteFooter } from "./components/bachs/SiteFooter";
import { TextureOverlay } from "./components/bachs/TextureOverlay";

export default function Home() {
  return (
    <>
      <TextureOverlay />
      <HeroSection />
      <CraftSection />
      <MenuSection />
      <OrderSection />
      <SiteFooter />
    </>
  );
}
