import { EditableImage, EditableText } from "@autosites/cms/components";
import { IMAGES } from "@/lib/images";
import { ReservationForm } from "./ReservationForm";

export async function ReservationSection() {
  return (
    <section id="reservation" className="bg-white py-24">
      <div className="mx-auto grid max-w-7xl items-center gap-16 px-6 md:grid-cols-2">
        <div className="wok-img-frame relative order-2 md:order-1">
          <EditableImage
            cmsKey="home.reservation.image"
            fallback={{
              src: IMAGES.reservation,
              alt: "Restaurantens interiør",
            }}
            width={800}
            height={600}
            sizes="(max-width: 768px) 100vw, 50vw"
            className="relative h-[500px] w-full rounded-lg object-cover shadow-xl"
          />
        </div>
        <div className="order-1 md:order-2">
          <h2 className="mb-6 font-serif text-4xl uppercase tracking-widest">
            <EditableText
              cmsKey="home.reservation.heading"
              fallback="Book dit bord"
              as="span"
            />
          </h2>
          <p className="mb-10 leading-relaxed text-gray-600">
            <EditableText
              cmsKey="home.reservation.body"
              fallback="Book bord til hverdag, weekend eller selskab. Vi kan have selskaber op til 140 personer — bryllup, konfirmation, fødselsdage, firmafest og julefrokost."
              as="span"
            />
          </p>
          <ReservationForm />
        </div>
      </div>
    </section>
  );
}
