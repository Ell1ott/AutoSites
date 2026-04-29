import { BookingPortal } from "@/components/kina-buffet/BookingPortal";
import { CateringSection } from "@/components/kina-buffet/CateringSection";
import { ExperienceSection } from "@/components/kina-buffet/ExperienceSection";
import { Hero } from "@/components/kina-buffet/Hero";
import { SiteFooter } from "@/components/kina-buffet/SiteFooter";
import { SiteHeader } from "@/components/kina-buffet/SiteHeader";

export default function Home() {
  return (
    <div className="kina-buffet-landing">
      <SiteHeader />
      <main>
        <Hero />
        <ExperienceSection />
        <BookingPortal />
        <CateringSection />
      </main>
      <SiteFooter />
    </div>
  );
}
