type CtaMonolithProps = {
  href: string;
  children: React.ReactNode;
};

export function CtaMonolith({ href, children }: CtaMonolithProps) {
  return (
    <a href={href} className="kaffe-cta-monolith">
      {children}
    </a>
  );
}
