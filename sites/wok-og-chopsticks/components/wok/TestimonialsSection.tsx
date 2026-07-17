"use client";

import { useState } from "react";
import { TESTIMONIALS } from "@/lib/site-config";
import { IMAGES } from "@/lib/images";

export function TestimonialsSection() {
  const [index, setIndex] = useState(0);
  const item = TESTIMONIALS[index] ?? TESTIMONIALS[0];

  return (
    <section className="relative overflow-hidden bg-brand-dark py-24 text-white">
      <div className="mb-16 text-center">
        <h2 className="mb-2 font-serif text-4xl uppercase tracking-widest">
          Hvad gæsterne siger
        </h2>
        <div className="wok-rule mx-auto h-px w-24 bg-brand-red" />
      </div>

      <div className="relative mx-auto max-w-4xl px-6 text-center">
        <span
          className="absolute -top-10 left-0 font-serif text-6xl leading-none text-brand-red opacity-50 md:left-20"
          aria-hidden
        >
          “
        </span>
        <div className="mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt=""
            src={IMAGES.testimonial}
            className="mx-auto mb-6 h-20 w-20 rounded-full border-2 border-brand-red p-1 object-cover"
          />
          <p className="text-lg italic leading-relaxed text-gray-300 transition-opacity duration-300">
            {item.quote}
          </p>
        </div>
        <div className="flex flex-col items-center">
          <div className="mb-4 flex gap-1 text-brand-gold" aria-label="5 star rating">
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} aria-hidden>
                ★
              </span>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <div className="h-px w-16 bg-gray-600" />
            <p className="font-serif text-2xl italic text-brand-gold">{item.name}</p>
          </div>
        </div>

        <div className="mt-12 flex justify-center gap-2" role="tablist" aria-label="Testimonials">
          {TESTIMONIALS.map((t, i) => (
            <button
              key={t.name}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Vis anmeldelse fra ${t.name}`}
              className={`h-2 w-2 cursor-pointer rounded-full border transition-colors ${
                i === index
                  ? "border-brand-red bg-brand-red"
                  : "border-gray-600 bg-transparent hover:border-brand-red"
              }`}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
