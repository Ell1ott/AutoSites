import { menuProducts } from "./menu-data";
import { ProductCard } from "./ProductCard";
import { SectionTag } from "./SectionTag";

export function MenuSection() {
  return (
    <section
      className="section-menu"
      id="sortiment"
      aria-labelledby="menu-heading"
    >
      <div className="container">
        <div className="menu-intro">
          <SectionTag>Fra disken</SectionTag>
          <h2 className="section-title" id="menu-heading">
            Sortiment
          </h2>
          <p className="menu-intro-text">
            Rugbrød i centrum, wienerbrød og spandauer fra konditoriet, og alt det
            salty og søde der gør en takeaway-frokost komplet. Kom forbi —
            udvalget skifter lidt fra dag til dag.
          </p>
        </div>

        <div className="menu-grid">
          {menuProducts.map((product) => (
            <ProductCard key={product.title} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
