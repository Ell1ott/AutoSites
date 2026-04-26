import { ExpandableMenuItem } from "./ExpandableMenuItem";
import { MenuPizzaGraphic } from "./MenuPizzaGraphic";

const KALE_COPY =
  "The queen of greens. One cup of kale has only 33 calories, 3 grams of fiber and 3 grams of protein. It's great for aiding in digestion and absorption with its great fiber content. It's also filled with so many nutrients, vitamins, folate and magnesium. High in iron, Vitamin A, C, and Calcium.";

const GRILL_COPY =
  "Our grill specialties are all made in house using local beef. We take care to ensure each bite is just as delicious as the last. Each flame has its own strong personality and it's so good it just might make you say goodbye to shiny fryers for good. Tuck in and enjoy.";

export function MenuGridSection() {
  return (
    <section id="menu" className="menu-grid" aria-label="Menu highlights">
      <ExpandableMenuItem
        title={
          <>
            license
            <br />
            to kale—
          </>
        }
      >
        {KALE_COPY}
      </ExpandableMenuItem>
      <MenuPizzaGraphic />
      <ExpandableMenuItem
        title={
          <>
            proper
            <br />
            grill.
          </>
        }
      >
        {GRILL_COPY}
      </ExpandableMenuItem>
    </section>
  );
}
