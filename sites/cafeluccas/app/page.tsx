import "./cafe-home.css";
import { FeaturedSection } from "../components/cafe/FeaturedSection";
import { FooterMapSection } from "../components/cafe/FooterMapSection";
import { HeroSection } from "../components/cafe/HeroSection";
import { MenuGridSection } from "../components/cafe/MenuGridSection";
import { SiteFrame } from "../components/cafe/SiteFrame";
import { SplitSection } from "../components/cafe/SplitSection";
import { WaveDivider } from "../components/cafe/WaveDivider";

export default function Home() {
  return (
    <SiteFrame>
      <HeroSection />
      <WaveDivider />
      <MenuGridSection />
      <FeaturedSection />
      <SplitSection />
      <FooterMapSection />
    </SiteFrame>
  );
}
