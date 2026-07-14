type PageHeroProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  image?: string;
  imageAlt?: string;
};

export function PageHero({ eyebrow, title, description, image, imageAlt }: PageHeroProps) {
  if (image) {
    return (
      <section className="relative flex min-h-[50vh] items-end overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="hero-gradient absolute inset-0 z-10" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt={imageAlt ?? title} className="h-full w-full object-cover" />
        </div>
        <div className="relative z-20 mx-auto w-full max-w-container-max px-margin-mobile pb-16 pt-32 md:px-margin-desktop">
          {eyebrow ? (
            <span className="font-label-caps mb-4 block text-label-caps tracking-[0.3em] text-primary uppercase">
              {eyebrow}
            </span>
          ) : null}
          <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg max-w-3xl">
            {title}
          </h1>
          {description ? (
            <p className="font-body-lg text-body-lg mt-6 max-w-2xl text-on-surface-variant">
              {description}
            </p>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-container-max px-margin-mobile pt-36 pb-12 md:px-margin-desktop">
      {eyebrow ? (
        <span className="font-label-caps mb-4 block text-label-caps tracking-[0.3em] text-primary uppercase">
          {eyebrow}
        </span>
      ) : null}
      <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg max-w-3xl">{title}</h1>
      {description ? (
        <p className="font-body-lg text-body-lg mt-6 max-w-2xl text-on-surface-variant">
          {description}
        </p>
      ) : null}
    </section>
  );
}
