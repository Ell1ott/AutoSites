import { EditableImage, EditableText } from "@autosites/cms/components";
import { LINKS, SITE } from "@/lib/site-config";
import { IMAGES } from "@/lib/images";
import { ContactForm } from "./ContactForm";

export async function ContactFormSection() {
  return (
    <section id="contact" className="relative flex min-h-[600px] items-stretch">
      <div className="relative w-full overflow-hidden md:w-3/5">
        <EditableImage
          cmsKey="home.contact.image"
          fallback={{
            src: IMAGES.contact,
            alt: "Kontakt",
          }}
          fill
          sizes="(max-width: 768px) 100vw, 60vw"
          className="object-cover"
        />
        <div className="absolute inset-0 flex flex-col justify-center bg-black/50 p-12 md:p-20">
          <h3 className="mb-2 font-serif text-3xl text-white">
            <EditableText
              cmsKey="home.contact.heading"
              fallback="Kontakt os"
              as="span"
            />
          </h3>
          <p className="mb-8 text-gray-300">
            <EditableText
              cmsKey="home.contact.intro"
              fallback="Fortæl os om reservation, selskab eller spørgsmål — så vender vi tilbage."
              as="span"
            />
          </p>
          <ContactForm light />
        </div>
      </div>

      <div className="relative hidden w-2/5 flex-col justify-center bg-brand-blush p-12 md:flex md:p-20">
        <div className="relative z-10">
          <h3 className="mb-6 text-xl font-bold uppercase tracking-widest">
            Kontaktinformation
          </h3>
          <ul className="space-y-4 text-sm text-gray-700 list-none">
            <li>
              <EditableText
                cmsKey="home.contact.info.address"
                fallback={SITE.address}
                as="span"
              />
            </li>
            <li>
              Ring:{" "}
              <a
                href={SITE.phoneHref}
                className="hover:text-brand-red transition-colors"
              >
                <EditableText
                  cmsKey="home.contact.info.phone"
                  fallback={SITE.phone}
                  as="span"
                />
              </a>
            </li>
            <li>
              <a
                href={LINKS.wolt}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-brand-red transition-colors"
              >
                Bestil på Wolt →
              </a>
            </li>
          </ul>
          <div className="mt-12">
            <h4 className="mb-4 font-bold uppercase tracking-widest">Find vej</h4>
            <div className="flex flex-col gap-3">
              <a
                className="text-brand-dark hover:text-brand-red transition-colors"
                href={LINKS.maps}
                target="_blank"
                rel="noopener noreferrer"
              >
                Kort
              </a>
              <a
                className="text-brand-dark hover:text-brand-red transition-colors"
                href={LINKS.rejseplanen}
                target="_blank"
                rel="noopener noreferrer"
              >
                Rejseplanen
              </a>
            </div>
          </div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt=""
          src={IMAGES.decorContact}
          className="pointer-events-none absolute right-0 bottom-0 w-64 opacity-10"
        />
        <p className="pointer-events-none absolute right-10 bottom-10 select-none font-serif text-4xl italic text-brand-red/10">
          Kontakt
        </p>
      </div>
    </section>
  );
}
