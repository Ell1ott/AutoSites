import { EditableList, EditableText } from "@autosites/cms/components";

type OpeningHoursFallback = {
  label: string;
};

const openingHoursRows = [
  { id: "man-fre", label: "Man–fre 06:00–17:30 · " },
  { id: "lor", label: "Lør 06:00–13:00 · " },
  { id: "son", label: "Søn 06:00–13:00" },
];

function renderOpeningHour({
  keyPrefix,
  fallback,
}: {
  keyPrefix: string;
  fallback: OpeningHoursFallback;
}) {
  return (
    <EditableText cmsKey={`${keyPrefix}.label`} fallback={fallback.label} as="span" />
  );
}

export async function OpeningHoursStrip() {
  return (
    <div className="hours-strip" role="region" aria-label="Åbningstider">
      <div className="container hours-strip-inner">
        <EditableText
          cmsKey="openingHours.stripLabel"
          fallback="Åbent"
          as="span"
          className="hours-strip-label"
        />
        <EditableList<OpeningHoursFallback>
          cmsKey="openingHours.stripItems"
          wrapperAs="span"
          wrapperClassName="hours-strip-times"
          fallback={openingHoursRows}
          newItemFallback={{ label: "Ny åbningstid" }}
          renderItem={renderOpeningHour}
        />
      </div>
    </div>
  );
}
