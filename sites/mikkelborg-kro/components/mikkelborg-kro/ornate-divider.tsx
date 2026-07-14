type OrnateDividerProps = {
  icon?: string;
};

export function OrnateDivider({ icon = "history_edu" }: OrnateDividerProps) {
  return (
    <div className="mx-auto max-w-container-max px-margin-mobile py-base md:px-margin-desktop">
      <div className="ornate-divider">
        <span
          className="material-symbols-outlined scale-125 text-primary"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          {icon}
        </span>
      </div>
    </div>
  );
}
