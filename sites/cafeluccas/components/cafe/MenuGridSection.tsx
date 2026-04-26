import { ExpandableMenuItem } from "./ExpandableMenuItem";
import { MenuPizzaGraphic } from "./MenuPizzaGraphic";

const UDVALG_COPY =
  "Hos os finder du et stort udvalg af pizzaer, saftige burgere, cremet pasta, friske salater og grillretter. Alt tilberedes med omhu og de bedste råvarer, vi kan få fat i.";

const GÆSTER_COPY =
  "Vi har plads til op til 34 gæster i caféen — perfekt til en hurtig frokost, en burger med vennerne eller en aften med familien. Vil du hellere spise hjemme? Ring og bestil, så er maden klar, når du henter den.";

export function MenuGridSection() {
  return (
    <section id="udvalg" className="menu-grid" aria-label="Udvalg og café">
      <ExpandableMenuItem
        title={
          <>
            friske
            <br />
            råvarer.
          </>
        }
      >
        {UDVALG_COPY}
      </ExpandableMenuItem>
      <MenuPizzaGraphic />
      <ExpandableMenuItem
        title={
          <>
            spis her
            <br />
            eller tag med.
          </>
        }
      >
        {GÆSTER_COPY}
      </ExpandableMenuItem>
    </section>
  );
}
