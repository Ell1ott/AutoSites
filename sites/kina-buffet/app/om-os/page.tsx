import type { Metadata } from "next";
import { homemadeApple } from "@/app/fonts";
import { SiteFooter } from "@/components/kina-buffet/SiteFooter";
import { SiteHeader } from "@/components/kina-buffet/SiteHeader";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Om os — Restaurant Kina Buffet | Ikast",
  description:
    "Byens største kinesiske restaurant i Ikast. Autentisk stemning, buffet og a la carte til over 150 gæster. Elite Smiley.",
};

export default function OmOsPage() {
  return (
    <div className="kina-buffet-landing om-os-page">
      <SiteHeader />
      <main>
        <section className="om-os-hero" aria-label="Om Restaurant Kina Buffet">
          <div className="om-os-hero-backdrop" aria-hidden />
          <div className="om-os-hero-inner">
            <p className="om-os-hero-kicker">Restaurant Kina Buffet · Kinabuffet</p>
            <h1 className="om-os-hero-title">Om os</h1>
            <p className={`om-os-hero-script ${homemadeApple.className}`}>Byens største kinesiske restaurant</p>
            <p className="om-os-hero-lede">
              Midt i Ikast finder du en restaurant bygget til både hverdagshygge og fest: masser af plads,
              et gennemarbejdet udvalg og en atmosfære, der minder om Kina — med moderne møbler og
              traditionelle detaljer.
            </p>
          </div>
        </section>

        <section className="grid-container om-os-story">
          <div
            className="om-os-story-media notched-frame"
            role="img"
            aria-label="Kinesisk-inspireret restaurantinteriør"
          />
          <div className="om-os-story-copy">
            <h2 className="om-os-story-heading">Vores historie</h2>
            <p className="om-os-story-lead">
              Vi skaber en autentisk kinesisk oplevelse, hvor mad, betjening og omgivelser går hånd i hånd.
            </p>
            <p className="om-os-story-body">
              Hos os møder du originale retter og en stemning, der føles ægte kinesisk. Restauranten er den
              største af sin slags i byen med plads til over 150 siddende gæster — ideelt til familiemidd,
              fødselsdage, firmaarrangementer og alt derimellem.
            </p>
            <p className="om-os-story-body">
              Uanset om du vælger buffet, a la carte eller takeaway, er fokus det samme: kvalitet, varme og
              et hus, hvor du gerne vil blive hængende lidt længere.
            </p>
            <ul className="om-os-pill-list">
              <li>Buffet &amp; a la carte</li>
              <li>Takeaway &amp; catering</li>
              <li>Bordbooking</li>
            </ul>
          </div>
        </section>

        <section className="om-os-mission-wrap">
          <blockquote className="om-os-mission">
            <p>
              Vores mål er at give dig en autentisk kinesisk oplevelse — hvor smag, nærvær og rammerne omkring
              måltidet spiller sammen fra første bid til sidste skål.
            </p>
          </blockquote>
        </section>

        <section className="grid-container om-os-stats">
          <article className="om-os-stat notched-frame">
            <span className="om-os-stat-value">150+</span>
            <h3 className="om-os-stat-label">Gæster</h3>
            <p className="om-os-stat-note">Plads til store selskaber uden at gå på kompromis med hyggen.</p>
          </article>
          <article className="om-os-stat notched-frame">
            <span className="om-os-stat-value">Elite Smiley</span>
            <h3 className="om-os-stat-label">Fødevarestyrelsen</h3>
            <p className="om-os-stat-note">
              Bedste karakter for hygiejne og fødevaresikkerhed — det kan du stole på.
            </p>
          </article>
          <article className="om-os-stat notched-frame">
            <span className="om-os-stat-value">Hver dag</span>
            <h3 className="om-os-stat-label">Buffet</h3>
            <p className="om-os-stat-note">Buffet fra kl. 16:30 til 22:00 — sushi, grill og klassikere.</p>
          </article>
        </section>

        <section className="grid-container om-os-bottom">
          <div className="om-os-elite-card notched-frame">
            <div>
              <h2 className="om-os-elite-title">Tryghed i hver detalje</h2>
              <p className="om-os-elite-text">
                Elite Smiley er din garanti for, at vi arbejder seriøst med hygiejne og fødevaresikkerhed —
                så du kan koncentrere dig om maden og selskabet.
              </p>
            </div>
            <div className="om-os-elite-badge" aria-hidden>
              ☺
            </div>
          </div>
          <div className="om-os-actions">
            <Link href="/menu" className="btn-primary om-os-btn">
              Se menukort
            </Link>
            <Link href="https://kinabuffet.com/" className="om-os-btn-secondary">
              Bestil bord på kinabuffet.com
            </Link>
            <Link href="/" className="om-os-link-back">
              ← Til forsiden
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
