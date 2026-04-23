import { EditableText } from "@/lib/cms";
import { Reveal } from "./reveal";

const days = [
  { key: "mon", day: "Mandag", time: "09:00 – 17:00" },
  { key: "tue", day: "Tirsdag", time: "09:00 – 17:00" },
  { key: "wed", day: "Onsdag", time: "09:00 – 17:00" },
  { key: "thu", day: "Torsdag", time: "09:00 – 17:00" },
  { key: "fri", day: "Fredag", time: "09:00 – 17:00" },
  { key: "sat", day: "Lørdag", time: "09:00 – 14:00" },
  { key: "sun", day: "Søndag", time: "Lukket" },
];

export function HoursSection() {
  return (
    <Reveal id="åbningstider" className="container kaffe-hours-section">
      <div className="kaffe-hours-inner">
        <div className="kaffe-hours-heading">
          <span className="kaffe-metadata">
            <EditableText
              cmsKey="home.hours.label"
              fallback="BESØG OS"
            />
          </span>
          <EditableText
            cmsKey="home.hours.title"
            fallback="Åbningstider"
            as="h2"
          />
          <EditableText
            cmsKey="home.hours.note"
            fallback="Tjek vores Facebook for eventuelle ændringer i åbningstiderne."
            as="p"
          />
        </div>
        <div className="kaffe-hours-table">
          {days.map(({ key, day, time }) => (
            <div key={key} className="kaffe-hours-row">
              <EditableText
                cmsKey={`home.hours.${key}.day`}
                fallback={day}
                as="span"
              />
              <EditableText
                cmsKey={`home.hours.${key}.time`}
                fallback={time}
                as="span"
              />
            </div>
          ))}
        </div>
      </div>
    </Reveal>
  );
}
