import type { Metadata } from "next";
import { SiteFrame } from "@/components/wok/SiteFrame";
import { PageHero } from "@/components/wok/PageHero";
import { SITE } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Vilkår",
};

export default function VilkaarPage() {
  return (
    <SiteFrame>
      <PageHero title="Vilkår" />
      <section className="bg-white py-20">
        <div className="mx-auto max-w-3xl space-y-6 px-6 text-gray-700 leading-relaxed">
          <p>
            Når du besøger vores hjemmeside eller spiser hos os, forventer vi
            respektfuld omgang med personale og øvrige gæster. Reservationer
            afhænger af ledighed og bekræftelse.
          </p>
          <p>
            Menuer, priser og åbningstider kan ændres uden varsel. Der tages
            forbehold for fejl og prisændringer. Kontakt restauranten direkte
            for aktuelle oplysninger.
          </p>
          <p>
            {SITE.name} · {SITE.address} ·{" "}
            <a href={SITE.phoneHref} className="text-brand-red">
              {SITE.phone}
            </a>
          </p>
        </div>
      </section>
    </SiteFrame>
  );
}
