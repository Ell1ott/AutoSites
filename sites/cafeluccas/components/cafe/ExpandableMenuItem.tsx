import { EditableText } from "@autosites/cms/components";
import { ExpandableMenuBody } from "./ExpandableMenuBody";

type ExpandableMenuItemProps = {
  titleCmsKey: string;
  titleFallback: string;
  bodyCmsKey: string;
  bodyFallback: string;
  previewLen?: number;
};

export async function ExpandableMenuItem({
  titleCmsKey,
  titleFallback,
  bodyCmsKey,
  bodyFallback,
  previewLen,
}: ExpandableMenuItemProps) {
  return (
    <div className="menu-item">
      <EditableText
        cmsKey={titleCmsKey}
        fallback={titleFallback}
        as="h3"
      />
      <ExpandableMenuBody measureText={bodyFallback} previewLen={previewLen}>
        <EditableText
          cmsKey={bodyCmsKey}
          fallback={bodyFallback}
          as="span"
        />
      </ExpandableMenuBody>
    </div>
  );
}
