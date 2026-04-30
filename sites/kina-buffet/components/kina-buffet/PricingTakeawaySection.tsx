import { PricingSection } from "./PricingSection";
import { TakeawaySection } from "./TakeawaySection";

export function PricingTakeawaySection() {
  return (
    <section className="grid-container pricing-takeaway-combo" aria-label="Priser og takeaway">
      <div id="priser" className="pricing-takeaway-pane pricing-takeaway-pane--pricing">
        <PricingSection />
      </div>
      <div id="takeaway" className="pricing-takeaway-pane pricing-takeaway-pane--takeaway">
        <TakeawaySection />
      </div>
    </section>
  );
}
