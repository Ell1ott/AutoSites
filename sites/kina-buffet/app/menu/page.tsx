import type { Metadata } from "next";
import { SectionLabel } from "@/components/kina-buffet/SectionLabel";
import { SiteFooter } from "@/components/kina-buffet/SiteFooter";
import { SiteHeader } from "@/components/kina-buffet/SiteHeader";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Menukort — Restaurant Kina Buffet | Ikast",
  description:
    "Buffetudvalg, sushi, mongolsk grill og komplet a la carte-menu. Takeaway-priser på kinabuffet.com.",
};

export default function MenuPage() {
  return (
    <div className="kina-buffet-landing menu-page">
      <SiteHeader />
      <main>
        <section className="grid-container" style={{ paddingBottom: 32 }}>
          <div className="section-label" style={{ gridColumn: "span 12" }}>
            <h2>Menukort</h2>
            <div className="card-meta">Buffet · a la carte · takeaway</div>
          </div>
          <p className="menu-intro">
            Buffet serveres alle dage kl. 16:30 – 22:00. A la carte og takeaway følger udvalget nedenfor;
            aktuelle takeaway-priser finder du på{" "}
            <Link href="https://kinabuffet.com/" style={{ color: "var(--red)", fontWeight: 700 }}>
              kinabuffet.com
            </Link>
            . Ring på{" "}
            <a href="tel:+4597181888" style={{ color: "var(--red)", fontWeight: 700 }}>
              97 18 18 88
            </a>{" "}
            ved bestilling eller spørgsmål.
          </p>
        </section>

        <section className="grid-container" style={{ paddingTop: 0 }}>
          <SectionLabel title="Buffet" meta="Dagligt 16:30 – 22:00" />

          <div className="menu-block">
            <h3>Forret</h3>
            <div className="menu-columns">
              <ul>
                <li>Peking suppe</li>
              </ul>
            </div>
          </div>

          <div className="menu-block">
            <h3>Sushi</h3>
            <div className="menu-columns">
              <ul>
                <li>Nigiri</li>
                <li>Inside-out</li>
                <li>Maki</li>
              </ul>
            </div>
          </div>

          <div className="menu-block">
            <h3>Mongolsk barbecue</h3>
            <div className="menu-columns">
              <ul>
                <li>4 slags kød</li>
                <li>8 forskellige grillspyd</li>
                <li>Diverse saucer og stor salatbar</li>
              </ul>
            </div>
          </div>

          <div className="menu-block">
            <h3>Hovedretter</h3>
            <div className="menu-columns">
              <ul>
                <li>Andesteg</li>
                <li>Dybstegte kinarejer</li>
                <li>Dybstegt svinekød</li>
                <li>Dybstegt kylling</li>
                <li>Dybstegte blæksprutter</li>
                <li>Forårsruller</li>
                <li>Hjemmelavede kyllingespyd</li>
                <li>Kyllingevinger</li>
                <li>Kylling i karry</li>
                <li>Kylling m. cashewnødder</li>
                <li>Oksekød m. porrer og løg</li>
                <li>Oksekød m. chilisauce</li>
                <li>Svinekød m. champignon og bambusskud</li>
                <li>Svinekød m. stærk sursød sauce</li>
                <li>Stegte kødboller</li>
                <li>Stegte ribben</li>
                <li>Stegte ris i karry</li>
              </ul>
              <ul>
                <li>Stegte nudler</li>
                <li>Stegte kartofler</li>
                <li>Pommes frites</li>
                <li>Rejechips</li>
                <li>Ris</li>
              </ul>
            </div>
          </div>

          <div className="menu-block">
            <h3>Dessert</h3>
            <div className="menu-columns">
              <ul>
                <li>Frisk frugt</li>
                <li>Is</li>
                <li>Kage</li>
                <li>Kaffe</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="grid-container">
          <SectionLabel title="A la carte" meta="Vejledende takeaway-priser på kinabuffet.com" />

          <div className="menu-block">
            <h3>Supper</h3>
            <div className="menu-columns">
              <ul>
                <li>1. Seafood suppe</li>
                <li>2. Wan-Ton suppe</li>
                <li>3. Peking suppe</li>
              </ul>
              <ul>
                <li>4. Asparges suppe m. krabbekød</li>
                <li>5. Hønsekød suppe</li>
                <li>6. Vegetar suppe</li>
              </ul>
            </div>
          </div>

          <div className="menu-block">
            <h3>Forretter</h3>
            <div className="menu-columns">
              <ul>
                <li>10. Dybstegte kinarejer (4 stk.) m. sursød sauce</li>
                <li>11. Mini forårsruller (5 stk.) m. sød chili sauce</li>
                <li>12. King forårsrulle m. soya sauce</li>
                <li>13. Dybstegte Wan-Tan (5 stk.) m. sød chili sauce</li>
                <li>14. Dybstegte blæksprutter (5 stk.) m. sursød sauce</li>
              </ul>
              <ul>
                <li>15. Rejecocktail</li>
                <li>16. Dybstegt kylling (4 stk.)</li>
                <li>17. Kyllingspyd (2 stk.)</li>
                <li>18. Salat</li>
              </ul>
            </div>
          </div>

          <div className="menu-block">
            <h3>Fisk &amp; skaldyr</h3>
            <div className="menu-columns">
              <ul>
                <li>21. Kinarejer á la Sichuan</li>
                <li>22. Kinarejer m. ingefær og porrer</li>
                <li>23. Dybstegte kinarejer m. sursød sauce</li>
                <li>24. Blæksprutte i sojabønne sauce</li>
              </ul>
              <ul>
                <li>25. Gong Pao blæksprutte m. grøntsager</li>
                <li>26. Fisk m. sursød sauce</li>
                <li>27. Fisk i sojabønne sauce</li>
              </ul>
            </div>
          </div>

          <div className="menu-block">
            <h3>Oksekød</h3>
            <div className="menu-columns">
              <ul>
                <li>31. Oksekød m. bambusskud og champignon</li>
                <li>32. Oksekød i karry sauce</li>
                <li>33. Gong Pao oksekød m. cashewnødder (stærk)</li>
              </ul>
              <ul>
                <li>34. Oksekød i trimler m. løg og peberfrugt</li>
                <li>35. Oksekød i østers sauce m. broccoli</li>
              </ul>
            </div>
          </div>

          <div className="menu-block">
            <h3>Svinekød</h3>
            <div className="menu-columns">
              <ul>
                <li>41. Svinekød m. bambusskud og champignon</li>
                <li>42. Svinekød i karry sauce</li>
                <li>43. Svinekød chop suey</li>
                <li>44. Dybstegt svinekød m. sursød sauce</li>
              </ul>
              <ul>
                <li>45. Gong Pao svinekød m. cashewnødder (stærk)</li>
                <li>46. Stegte ribben i sojabønne sauce</li>
                <li>47. Stegte ribben m. sirup &amp; sursød sauce</li>
              </ul>
            </div>
          </div>

          <div className="menu-block">
            <h3>Kylling</h3>
            <div className="menu-columns">
              <ul>
                <li>51. Kylling m. bambusskud og champignon</li>
                <li>52. Kylling i karry sauce</li>
                <li>53. Kylling m. porrer og løg</li>
                <li>54. Dybstegt kylling m. sursød sauce</li>
              </ul>
              <ul>
                <li>55. Kylling m. ananas sauce</li>
                <li>56. Gong Pao kylling m. cashewnødder (stærk)</li>
                <li>57. Kylling østers sauce m. broccoli</li>
              </ul>
            </div>
          </div>

          <div className="menu-block">
            <h3>And</h3>
            <div className="menu-columns">
              <ul>
                <li>61. Andesteg m. bambusskud og champignon</li>
                <li>62. Andesteg på kantonesisk vis</li>
              </ul>
              <ul>
                <li>63. Andesteg á la Sichuan (stærk)</li>
                <li>64. Andesteg m. ananas sauce</li>
              </ul>
            </div>
          </div>

          <div className="menu-block">
            <h3>Jernfadsretter</h3>
            <div className="menu-columns">
              <ul>
                <li>65. Andekød på jernfad m. grøntsager</li>
                <li>66. Kongerejer på jernfad m. hvidløg</li>
                <li>67. Seafood på jernfad m. grøntsager</li>
              </ul>
              <ul>
                <li>68. Kylling på jernfad m. grøntsager</li>
                <li>69. Oksekød på jernfad m. grøntsager</li>
                <li>70. Svinekød på jernfad m. grøntsager</li>
              </ul>
            </div>
          </div>

          <div className="menu-block">
            <h3>Stegte ris &amp; nudler</h3>
            <div className="menu-columns">
              <ul>
                <li>71. Stegte ris De Luxe m. kylling og rejer</li>
                <li>72. Stegte ris m. grøntsager</li>
                <li>73. Stegte nudler De Luxe m. kylling og rejer</li>
              </ul>
              <ul>
                <li>74. Stegte nudler m. grøntsager</li>
                <li>75. Stegte nudler m. oksekød</li>
              </ul>
            </div>
          </div>

          <div className="menu-block">
            <h3>Børnemenuer</h3>
            <div className="menu-columns">
              <ul>
                <li>81. Pølser m. pommes frites og remoulade</li>
                <li>82. Kødboller m. pommes frites og remoulade</li>
                <li>83. Fiskefilet m. pommes frites og remoulade</li>
              </ul>
            </div>
          </div>

          <div className="menu-block">
            <h3>Tilbehør</h3>
            <div className="menu-columns">
              <ul>
                <li>84. Ekstra ris</li>
                <li>85. Nudler i stedet for ris</li>
                <li>86. Chili-mayonnaise</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="grid-container" style={{ paddingTop: 20 }}>
          <p className="menu-intro" style={{ margin: 0 }}>
            <Link href="/" style={{ color: "var(--red)", fontWeight: 700 }}>
              ← Til forsiden
            </Link>
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
