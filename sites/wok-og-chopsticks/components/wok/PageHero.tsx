type PageHeroProps = {
  title: string;
  subtitle?: string;
};

export function PageHero({ title, subtitle }: PageHeroProps) {
  return (
    <section className="relative overflow-hidden bg-brand-dark px-6 py-24 text-center text-white md:py-32">
      <div className="relative z-10 mx-auto max-w-3xl">
        <h1 className="mb-4 font-serif text-4xl uppercase tracking-widest md:text-5xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="mx-auto max-w-xl text-base leading-relaxed text-white/75 md:text-lg">
            {subtitle}
          </p>
        ) : null}
        <div className="mx-auto mt-8 h-px w-24 bg-brand-red" />
      </div>
    </section>
  );
}
