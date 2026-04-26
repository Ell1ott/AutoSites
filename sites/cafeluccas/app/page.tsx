import "./cafe-home.css";
import { FeaturedSection } from "../components/cafe/FeaturedSection";
import { FooterMapSection } from "../components/cafe/FooterMapSection";
import { HeroSection } from "../components/cafe/HeroSection";
import { MenuGridSection } from "../components/cafe/MenuGridSection";
import { NavBar } from "../components/cafe/NavBar";
import { SplitSection } from "../components/cafe/SplitSection";
import { WaveDivider } from "../components/cafe/WaveDivider";

export default function Home() {
  return (
    <div className="cafe-page">
      <div className="main-container">
        <NavBar />
        <HeroSection />
        <WaveDivider />
        <MenuGridSection />
        <FeaturedSection />
        <SplitSection />
        <FooterMapSection />
      </div>
    </div>
  );
}
