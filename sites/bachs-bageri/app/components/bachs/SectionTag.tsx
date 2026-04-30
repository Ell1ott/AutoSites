type SectionTagProps = {
  children: React.ReactNode;
  id?: string;
  className?: string;
};

export function SectionTag({ children, id, className = "" }: SectionTagProps) {
  return (
    <span id={id} className={`section-tag ${className}`.trim()}>
      {children}
    </span>
  );
}
