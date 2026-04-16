import Image from "next/image";
import { Reveal } from "./reveal";

type MenuCardProps = {
  code: string;
  title: string;
  description: string;
  imageSrc: string;
  imageAlt: string;
  offset?: boolean;
};

export function MenuCard({
  code,
  title,
  description,
  imageSrc,
  imageAlt,
  offset,
}: MenuCardProps) {
  return (
    <Reveal
      className="kaffe-menu-card"
      style={offset ? { marginTop: "10vh" } : undefined}
    >
      <div className="kaffe-img-frame">
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          sizes="(max-width: 1440px) 33vw, 400px"
          className="object-cover"
        />
      </div>
      <h3>
        {code}. {title}
      </h3>
      <p>{description}</p>
    </Reveal>
  );
}
