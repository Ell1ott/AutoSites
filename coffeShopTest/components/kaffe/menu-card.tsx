import { EditableImage, EditableText } from "@/lib/cms";
import { Reveal } from "./reveal";

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
    <Reveal
      className="kaffe-menu-card"
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
    </Reveal>
  );
}
