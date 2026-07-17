import type { Metadata } from "next";
import { SiteFrame } from "@/components/wok/SiteFrame";
import { PageHero } from "@/components/wok/PageHero";
import { SITE } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Privatlivspolitik",
};

export default function PrivatlivPage() {
  return (
    <SiteFrame>
      <PageHero title="Privatlivspolitik" />
      <section className="bg-white py-20">
        <div className="mx-auto max-w-3xl space-y-6 px-6 text-gray-700 leading-relaxed">
          <p>
            {SITE.name} respekterer dit privatliv. Oplysninger, du deler via
            reservations- og kontaktformularer, bruges kun til at besvare din
            henvendelse og forbedre vores service.
          </p>
          <p>
            Vi sælger ikke personoplysninger. Kontakt os, hvis du ønsker at få
            opdateret eller slettet oplysninger, du tidligere har givet os.
          </p>
          <p>
            Telefon:{" "}
            <a href={SITE.phoneHref} className="text-brand-red">
              {SITE.phone}
            </a>
          </p>
        </div>
      </section>
    </SiteFrame>
  );
}
