import { EditableImage, EditableText } from "@/lib/cms";

type MenuCardProps = {
  keyPrefix: string;
  fallbacks: {
    code: string;
    title: string;
    description: string;
    imageSrc: string;
    imageAlt: string;
  };
  offset?: boolean;
};

export function MenuCard({ keyPrefix, fallbacks, offset }: MenuCardProps) {
  return (
    <div
      className="kaffe-menu-card kaffe-reveal kaffe-reveal-active"
      style={offset ? { marginTop: "10vh" } : undefined}
    >
      <div className="kaffe-img-frame">
        <EditableImage
          cmsKey={`${keyPrefix}.image`}
          fallback={{ src: fallbacks.imageSrc, alt: fallbacks.imageAlt }}
          fill
          sizes="(max-width: 1440px) 33vw, 400px"
          className="object-cover"
        />
      </div>
      <h3>
        <EditableText
          cmsKey={`${keyPrefix}.code`}
          fallback={fallbacks.code}
        />
        .{" "}
        <EditableText
          cmsKey={`${keyPrefix}.title`}
          fallback={fallbacks.title}
        />
      </h3>
      <EditableText
        cmsKey={`${keyPrefix}.description`}
        fallback={fallbacks.description}
        as="p"
      />
    </div>
  );
}
