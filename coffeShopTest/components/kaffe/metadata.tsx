type MetadataProps = {
  children: React.ReactNode;
  className?: string;
};

export function Metadata({ children, className }: MetadataProps) {
  return (
    <span className={["kaffe-metadata", className].filter(Boolean).join(" ")}>
      {children}
    </span>
  );
}
