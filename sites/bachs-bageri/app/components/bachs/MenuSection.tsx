import { EditableList, EditableText } from "@autosites/cms/components";
import { menuProducts } from "./menu-data";
import { ProductCard } from "./ProductCard";
import { SectionTag } from "./SectionTag";

type MenuProductFallback = {
  category: string;
  title: string;
  description: string;
  note: string;
};

function renderMenuProduct({
  keyPrefix,
  fallback,
}: {
  keyPrefix: string;
  fallback: MenuProductFallback;
}) {
  return <ProductCard keyPrefix={keyPrefix} product={fallback} />;
}

export async function MenuSection() {
  return (
    <section
      className="section-menu"
      id="sortiment"
      aria-labelledby="menu-heading"
    >
      <div className="container">
        <div className="menu-intro">
          <SectionTag>
            <EditableText cmsKey="menu.tag" fallback="Fra disken" as="span" />
          </SectionTag>
          <h2 className="section-title" id="menu-heading">
            <EditableText cmsKey="menu.title" fallback="Sortiment" as="span" />
          </h2>
          <EditableText
            cmsKey="menu.intro"
            fallback="Rugbrød i centrum, wienerbrød og spandauer fra konditoriet, og alt det salty og søde der gør en takeaway-frokost komplet. Kom forbi — udvalget skifter lidt fra dag til dag."
            as="p"
            className="menu-intro-text"
          />
        </div>
        <EditableList<MenuProductFallback>
          cmsKey="menu.products.items"
          wrapperClassName="menu-grid"
          fallback={menuProducts}
          newItemFallback={{
            category: "Kategori",
            title: "Nyt produkt",
            description: "Beskrivelse",
            note: "Notat",
          }}
          renderItem={renderMenuProduct}
        />
      </div>
    </section>
  );
}
