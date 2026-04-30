import { Fragment, type CSSProperties, type ElementType, type ReactNode } from "react";
import { getCmsContent } from "../server/content";
import { getEditMode } from "../server/mode";
import { getSiteId } from "../server/site";

export type EditableListItemContext<F = Record<string, unknown>> = {
  id: string;
  keyPrefix: string;
  fallback: F;
};

type EditableListProps<F extends Record<string, unknown>> = {
  cmsKey: string;
  fallback: ({ id: string } & F)[];
  newItemFallback: F;
  renderItem: (ctx: EditableListItemContext<F>) => ReactNode;
  wrapperAs?: ElementType;
  wrapperClassName?: string;
  wrapperStyle?: CSSProperties;
};

export async function EditableList<F extends Record<string, unknown>>({
  cmsKey,
  fallback,
  newItemFallback,
  renderItem,
  wrapperAs: Wrapper = "div",
  wrapperClassName,
  wrapperStyle,
}: EditableListProps<F>) {
  const siteId = await getSiteId();
  const row = await getCmsContent<"list">(siteId, cmsKey);
  const editMode = await getEditMode();

  const fallbackIds = fallback.map((f) => f.id);
  const ids = row?.kind === "list" ? row.value.ids : fallbackIds;

  const fallbackById = new Map<string, F>();
  for (const item of fallback) {
    const { id: _id, ...rest } = item;
    fallbackById.set(item.id, rest as unknown as F);
  }

  const items = ids.map((id) => {
    const itemFallback = fallbackById.get(id) ?? newItemFallback;
    return {
      id,
      keyPrefix: `${cmsKey}.${id}`,
      fallback: itemFallback,
    };
  });

  if (!editMode) {
    return (
      <Wrapper className={wrapperClassName} style={wrapperStyle}>
        {items.map((ctx) => (
          <Fragment key={ctx.id}>{renderItem(ctx)}</Fragment>
        ))}
      </Wrapper>
    );
  }

  const { EditableListItemShell } = await import(
    "../client/EditableListItemShell"
  );
  const { EditableListAddButton } = await import(
    "../client/EditableListAddButton"
  );

  return (
    <Wrapper className={wrapperClassName} style={wrapperStyle}>
      {items.map((ctx, idx) => (
        <EditableListItemShell
          key={ctx.id}
          listKey={cmsKey}
          itemId={ctx.id}
          fallbackIds={fallbackIds}
          isFirst={idx === 0}
          isLast={idx === items.length - 1}
        >
          {renderItem(ctx)}
        </EditableListItemShell>
      ))}
      <EditableListAddButton listKey={cmsKey} fallbackIds={fallbackIds} />
    </Wrapper>
  );
}
