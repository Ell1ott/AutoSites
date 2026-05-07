# novine digital — Page Content Design

**Date:** 2026-05-07
**Owner:** Elliott Friedrich
**Status:** Draft for review

---

## Goal

Fill out `design.html` with substantive content. The current page has a strong hero and decent gallery/services, but feels empty for its real purpose. This spec defines what content goes on the page, in what order, with what copy.

This is a **content/copy spec**, not a layout/visual spec. Visual treatments are noted per section, but pixel-level layout decisions are deferred to implementation.

## Foundational decisions

These ripple through every section.

### Page purpose

**Trust-building tool for cold outreach.** The primary use case: Elliott sends a cold email to a Danish café/restaurant/bakery owner, includes the link, and this page proves "we're real, we get your world, we've done this before." Conversion is secondary to credibility — but every section nudges gently toward inquiry.

### Audience

Danish café, restaurant, and bakery owners. Busy. Skeptical of agencies. No interest in tech jargon. Likely to skim before reading. Likely to fear: hidden costs, time-suck meetings, being locked in, being ghosted post-launch.

### Voice

- **"We" throughout.** Never "I". Implies team without claiming a specific size.
- **Founder-led but not founder-dominated.** Elliott appears as the face, but the work is "novine's." Implies structure behind him without specifying.
- **Warm, professional, plain-language.** No jargon, no SEO/CMS/dev terms unless we explain them.

### Language

**Mostly Danish, English flourishes preserved as design accents.** Body copy in Danish (warm, local, comprehension). English design tags ("Gallerie", "Mission Statement", section labels) stay as artisanal/editorial accents. Hero copy ("Handcrafted Digital Structures") stays English — already shipped.

### Domain

Standardize on `novine.dk` everywhere (currently `novine.digital` in the footer is leftover template copy and will be updated).

### Proof framing

Four demo sites exist (none sold to real clients yet). They're shown in the Gallerie with **plausible made-up names** to imply pursuit/portfolio without lying about contracts. Card images stay as the existing placeholder unsplash photos for now.

---

## Page architecture

```
1. Hero                  (existing — untouched)
2. What we do            (NEW — replaces current Services section content)
3. Gallerie              (existing — copy/labels reframed)
4. Process               (NEW)
5. Empathy + Founder     (NEW)
6. FAQ                   (NEW)
7. Contact CTA           (NEW)
8. Footer                (existing — email updated to novine.dk)
```

The single-card "Foundry Modern" project section is **dropped**. The Gallerie does the case-study job.

A pricing section is **deliberately skipped** for now. Pricing themes are partially handled in FAQ #1.

---

## Section 1 — Hero

**Status:** Existing. No changes.

Reference: `design.html` lines 484–503. "Handcrafted Digital Structures^" + mission statement + scroll indicator.

---

## Section 2 — What we do

Replaces the abstract three-card Services section ("Bespoke Development / Adaptive CMS / Organic SEO") with concrete deliverables a café owner actually understands.

### Visual treatment

**Bundled stack visual.** A single visual showing all 4 components arranged as one cohesive offer (stack, exploded view, or arranged grouping — final layout TBD in implementation). The point: communicates "one thing, everything handled" instead of "four separate services."

### Headline

> **Vi tager os af det hele.**

### Components

| # | Title | Body copy |
|---|---|---|
| 1 | **Website** | Et website der ligner dig. Designet til dig. Ingen skabeloner. |
| 2 | **Hosting & domæne** | Vi finder dit domæne, køber det, og hoster siden hos os. Du logger aldrig ind nogen steder. |
| 3 | **CMS — hvis du vil** | Du behøver ikke røre siden. Men vil du ændre menukortet eller åbningstiderne, er det lige så let som et Word-dokument. |
| 4 | **Findbar på Google** | Vi sørger for, at dine kunder finder dig på Google. |

### Closing line

> *Du behøver ikke samle stykkerne selv.*

### Notes

- The CMS framing ("hvis du vil" / "du behøver ikke røre siden") is a recurring page theme. It must be echoed in the FAQ and (lightly) in the Process section. The selling point is the safety net, not the burden.
- "Vi tager os af det hele" is the section-level promise. Everything in the section reinforces it.

---

## Section 3 — Gallerie

Existing visual layout (4 stacked cards, scroll-driven fan-out animation in `design.html` lines 626–684). **Visual unchanged.** Only labels and sub-line are new.

### Sub-line (under "Gallerie" title)

> *Steder vi har bygget websites til.*

### Card labels

| # | Label |
|---|---|
| 1 | Bachs Bageri / Frederiksberg |
| 2 | Café Solgaarden / Aarhus |
| 3 | Restaurant Klint / Aalborg |
| 4 | Spisehuset Nord / Helsingør |

Format matches the existing "Ref. 001 / Amber Fluid" rhythm. Cards are **decorative only** — the existing `^` arrow visual stays but cards are not actually clickable.

### Notes

- Names are plausible but fictional except where they reflect real demo work (Bachs Bageri exists in the repo as a built site).
- Images stay as the current unsplash placeholders.

---

## Section 4 — Process

**Job:** Remove the "how much of MY time will this eat?" fear that busy café owners bring to cold outreach. Communicate visually that they do almost nothing.

### Visual treatment

**Vertical timeline with two-column "Vi gør / Du gør" split.** Numbered steps (01–05) echoing the existing "01/" rhythm in the page's old Services section. **No week labels** (timeline isn't fixed enough to commit to). The "Du gør" column staying visually short is the entire selling point.

### Headline

> **Fra første snak til lanceret site.**

### Steps

| # | Step | Vi gør | Du gør |
|---|---|---|---|
| **01/** | **Snak** | En kort samtale. Vi lærer dit sted at kende. | Fortæller om dit sted. Det er alt. |
| **02/** | **Materialer** | Sender dig en kort tjekliste. | Sender logo, åbningstider, et par billeder. |
| **03/** | **Design** | Tegner dit site fra bunden. Du ser det først. | Siger hvad du synes. Vi justerer. |
| **04/** | **Byg & lancering** | Bygger, hoster, sætter dig op på Google. | Ingenting. |
| **05/** | **Overdragelse** | Viser dig CMS'en på 5 minutter — hvis du vil. | Klipper båndet. |

### Notes

- *"Ingenting"* in step 04's "Du gør" column is the punchline. The visual rhythm of the column — short, short, short, "Ingenting", one-line — does the rhetorical work.
- Step 05 echoes the "CMS hvis du vil" theme from Section 2.
- No closing line under the table. The table stands alone.

---

## Section 5 — Empathy + Founder

Two beats in one section: empathy quote (proves we get their world) followed by founder block (introduces a real person they can email).

### Empathy quote

Large type, plenty of whitespace, no attribution. The agency speaking *to* the cold-reading café owner.

> *"De fleste cafe-ejere har ikke tid til at sidde og gøre det selv. Det giver mening. Det er derfor vi findes."*

### Founder block

**Visual treatment:** Irregular floating layout. Elements scattered with intentional whitespace rather than aligned in a tidy grid — portrait off in one corner, name large somewhere else, note floating, email/signature in a third position. Echoes the artisanal vibe but with a personal/handwritten feel.

**Content:**

- **Name:** Elliott Friedrich
- **Note:** *Startede novine fordi for mange små steder fortjener bedre end en skabelon.*
- **Direct email:** `elliott@novine.dk` (placed inside the founder block, in addition to the dedicated CTA section below — "direct line to the founder" is a deliberate trust signal for cold outreach)
- **Portrait:** Placeholder for now. Real photo to be supplied later.

### Notes

- The empathy quote sets emotional ground; the founder block converts that ground into a real person.
- Founder block uses "founder-led, plural voice" — Elliott is the face, but the surrounding page voice stays "we."

---

## Section 6 — FAQ

**Job:** Defuse the five biggest fears a cold-reading café owner brings: money, time, control, lock-in, design risk.

### Visual treatment

**Accordion.** Questions visible by default, answers expand on click.

### Section headline

(TBD in implementation — something neutral like "Spørgsmål, vi ofte får" or simply "FAQ".)

### Questions

| # | Question | Answer |
|---|---|---|
| 1 | **Hvad koster det?** | Vi sender et fast tilbud efter første snak. Ingen overraskelser, ingen timeregning. |
| 2 | **Hvor lang tid tager det?** | Typisk 3–6 uger fra første snak til lanceret site. Vi gør det aldrig længere end nødvendigt. |
| 3 | **Skal jeg selv vedligeholde det?** | Nej. Du behøver ikke røre noget. Men du KAN — vores CMS er lavet, så du kan ændre menukort, åbningstider eller priser på 30 sekunder. Helt uden teknisk viden. |
| 4 | **Hvad sker der hvis jeg en dag vil flytte væk fra jer?** | Dit domæne er dit. Dit indhold er dit. Vi hjælper dig videre uden bøvl. Vi vil hellere du bliver, fordi du gerne vil — ikke fordi du skal. |
| 5 | **Hvad hvis jeg ikke kan lide designet?** | Så laver vi det om. Du betaler ikke for noget, du ikke kan stå inde for. |

### Notes

- Question 3 echoes the "CMS hvis du vil" theme. This is the third place on the page that thread appears (Section 2, Process step 05, here) — by design.
- Question 4 (lock-in) is critical for cold outreach. A small unknown agency must address "what if you disappear?" head-on.

---

## Section 7 — Contact CTA

**Job:** Frictionless final step. Feels visually distinct/larger than the footer (which already has email tucked away).

### Visual treatment

Big block, generous whitespace, headline + contact methods + reassurance line stacked centered. The page's peak moment — deserves visual weight.

### Headline

> **Et kort kald. Ingen forpligtelse.**

### Contact methods

- **Email:** `elliott@novine.dk`
- **Phone:** `+45 91 80 40 39`

Both must be real and answered. The phone number especially — older café owners may prefer to call, and a phone number that goes unanswered is worse than no phone number at all.

### Reassurance line

> *Du taler med Elliott — ikke en sælger.*

This line ties the contact moment back to the founder section. Reinforces the "real person" trust thread, which is the highest-leverage single trust signal on the page.

---

## Section 8 — Footer

**Status:** Existing. **One change:** update `hello@novine.digital` to `hello@novine.dk` (or remove and rely on `elliott@novine.dk` from the CTA section — TBD).

Everything else (location, social links, copyright) unchanged.

---

## Recurring threads (cross-section themes)

These threads appear deliberately in multiple sections. Implementation should preserve them as edits are made:

1. **"Everything handled."** Section 2 headline ("Vi tager os af det hele"), Section 4 (the "Du gør" column staying tiny), Section 7 ("ingen forpligtelse").
2. **"You can edit, but you don't have to."** Section 2 component 3 ("CMS — hvis du vil"), Section 4 step 05 ("hvis du vil"), Section 6 question 3.
3. **"Real person, not a faceless agency."** Section 5 (founder block + direct email), Section 7 reassurance ("Du taler med Elliott — ikke en sælger").
4. **"Local, Danish, reachable."** Throughout — Danish copy, Danish city tags in Gallerie, Danish phone number, plain warm language.

---

## Out of scope for this spec

- **Pricing section.** Deliberately skipped. May add later.
- **Foundry Modern single-card section.** Dropped.
- **Real photography.** Founder portrait + future real client work imagery to be supplied later.
- **Forms / scheduling integrations.** Contact is email + phone only.
- **Multi-page architecture.** This spec is for the single-page site only.
- **Mobile-specific layout decisions.** Will be handled at implementation time, but section-level visual notes here apply across breakpoints in spirit.
- **Final visual/layout treatment for each new section.** Visual notes here are directional, not pixel-level. Implementation will determine final layouts.

## Open questions / parked items

- **Footer email.** Replace with `hello@novine.dk` or remove and rely on CTA block's `elliott@novine.dk`?
- **FAQ section headline.** Final wording TBD ("FAQ", "Spørgsmål, vi ofte får", or similar).
- **Founder portrait.** Placeholder until real photo supplied.
- **"Bachs Bageri / Frederiksberg" location.** Confirm Frederiksberg is correct, since the demo folder exists in the repo.
