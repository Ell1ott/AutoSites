import Link from "next/link";
import { SectionLabel } from "./SectionLabel";

export function PricingSection() {
  return (
    <div className="pricing-section">
      <SectionLabel title="Priser & åbningstider" meta="Buffet og takeaway" />

      <div className="pricing-simple">
        <div className="pricing-simple-band">
          <div className="pricing-simple-intro">
            <p className="pricing-simple-label">Åbningstider</p>
            <p className="pricing-simple-hours">Buffet hver dag kl. 16:30–22:00</p>
            <p className="pricing-simple-muted">
              Ad libitum med drikkevarer afsluttes kl. 22:00.
            </p>
          </div>

          <div className="pricing-simple-buffet-block">
            <p className="pricing-simple-label">Buffet</p>
            <dl className="pricing-simple-dl">
              <div className="pricing-simple-dl-row">
                <dt>Man–tors</dt>
                <dd>
                  198 kr. <span className="pricing-simple-unit">pr. person</span>
                </dd>
              </div>
              <div className="pricing-simple-dl-row">
                <dt>Fre–søn</dt>
                <dd>
                  228 kr. <span className="pricing-simple-unit">pr. person</span>
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <p className="pricing-simple-muted pricing-simple-kids">Børn 2–11 år: halv pris i buffet.</p>

        <div className="pricing-simple-split">
          <section className="pricing-simple-panel" aria-labelledby="pricing-adlib-heading">
            <h3 id="pricing-adlib-heading" className="pricing-simple-label">
              Ad libitum
            </h3>
            <p className="pricing-simple-highlight">398 kr. pr. person · 3 timer</p>
            <p className="pricing-simple-muted">
              Husets vin, fadøl og sodavand med i prisen.
            </p>
            <ul className="pricing-simple-list">
              <li>Gælder til kl. 22:00</li>
              <li>Sammen med buffet</li>
            </ul>
          </section>

          <section className="pricing-simple-panel" aria-labelledby="pricing-alacarte-heading">
            <h3 id="pricing-alacarte-heading" className="pricing-simple-label">
              A la carte &amp; takeaway
            </h3>
            <p className="pricing-simple-muted">
              Vejledende niveauer — se aktuelle priser på hjemmesiden.
            </p>
            <table className="pricing-simple-table">
              <tbody>
                <tr>
                  <th scope="row">Supper</th>
                  <td>30–45 kr.</td>
                </tr>
                <tr>
                  <th scope="row">Forretter</th>
                  <td>30–45 kr.</td>
                </tr>
                <tr>
                  <th scope="row">Hovedretter</th>
                  <td>85–110 kr.</td>
                </tr>
                <tr>
                  <th scope="row">Børnemenu</th>
                  <td>45 kr.</td>
                </tr>
              </tbody>
            </table>
            <p className="pricing-simple-links">
              <Link href="/menu">Menu-side</Link>
              <span aria-hidden="true"> · </span>
              <Link href="https://kinabuffet.com/">kinabuffet.com</Link>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
