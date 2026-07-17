import { EditableText } from "@autosites/cms/components";
import { STATS } from "@/lib/site-config";

const ICONS = {
  guests: GuestsIcon,
  dishes: DishesIcon,
  years: YearsIcon,
  events: EventsIcon,
} as const;

export async function StatisticsSection() {
  return (
    <section className="border-y border-gray-100 bg-white py-16">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-6 text-center md:grid-cols-4">
        {STATS.map((stat, i) => {
          const Icon = ICONS[stat.icon];
          return (
            <div key={stat.label}>
              <div className="mb-2 flex justify-center text-brand-red">
                <Icon />
              </div>
              <div className="font-serif text-3xl font-bold">
                <EditableText
                  cmsKey={`home.stats.${i}.value`}
                  fallback={stat.value}
                  as="span"
                />
              </div>
              <div className="mt-1 text-sm uppercase tracking-widest text-gray-500">
                <EditableText
                  cmsKey={`home.stats.${i}.label`}
                  fallback={stat.label}
                  as="span"
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function GuestsIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="16" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M3.5 19c.8-3 2.8-4.5 5.5-4.5S14 16 14.5 19"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M14 14.5c2.2 0 3.8 1.2 4.5 3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DishesIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <ellipse cx="12" cy="14" rx="8" ry="4" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M4 14v2c0 2.2 3.6 4 8 4s8-1.8 8-4v-2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M8 10c1-2 2.5-3 4-3s3 1 4 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function YearsIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="m12 3 2.2 4.5 5 .7-3.6 3.5.9 5L12 14.5 7.5 16.7l.9-5L4.8 8.2l5-.7L12 3Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EventsIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3.5" y="5" width="17" height="15" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3.5 10h17M8 3.5v3M16 3.5v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
