import type { Metadata } from "next";
import { SiteFrame } from "@/components/wok/SiteFrame";
import { PageHero } from "@/components/wok/PageHero";
import { ReservationForm } from "@/components/wok/ReservationForm";
import { IMAGES } from "@/lib/images";
import { PARTY_INFO, SITE } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Reservation",
  description: "Book bord hos Wok og Chopsticks i Næstved.",
};

export default function ReservationPage() {
  return (
    <SiteFrame>
      <PageHero
        title="Reservation"
        subtitle="Book bord til hverdag, weekend eller selskab."
      />
      <section className="py-24 bg-white" id="reservation">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
          <div className="relative">
            <div className="absolute -top-4 -left-4 w-full h-full border border-brand-red/20 rounded-lg" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt="Restaurantens interiør"
              className="relative rounded-lg shadow-xl w-full h-[500px] object-cover"
              src={IMAGES.reservation}
            />
          </div>
          <div>
            <h2 className="text-4xl font-serif uppercase tracking-widest mb-6">
              Book dit bord
            </h2>
            <p className="text-gray-600 mb-4 leading-relaxed">
              {PARTY_INFO.capacity} {PARTY_INFO.occasions}
            </p>
            <p className="text-gray-600 mb-10 leading-relaxed">
              Du kan også ringe direkte på{" "}
              <a href={SITE.phoneHref} className="text-brand-red">
                {SITE.phone}
              </a>
              . Husk at vi normalt har lukket tirsdag, og at køkkenet lukker 1
              time før lukketid.
            </p>
            <ReservationForm />
          </div>
        </div>
      </section>
    </SiteFrame>
  );
}
