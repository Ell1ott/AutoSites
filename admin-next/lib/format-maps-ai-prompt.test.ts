import { expect, test } from "bun:test"

import { formatMapsDataForAi } from "./format-maps-ai-prompt"
import type { SlimLead } from "./types"

const baseLead = (over: Partial<SlimLead> = {}): SlimLead => ({
  place_id: "places/ChIJabc",
  name: "Konya Kebab",
  rating: 4.5,
  review_count: 128,
  website: null,
  business_status: "OPERATIONAL",
  lead_score: null,
  dynamic: {},
  updated_at: "2026-01-01T00:00:00.000Z",
  ...over,
})

test("formatMapsDataForAi includes identity, contact, hours, and reviews", () => {
  const lead = baseLead({
    data: {
      displayName: { text: "Konya Kebab" },
      primaryTypeDisplayName: { text: "Turkish restaurant" },
      types: ["turkish_restaurant", "restaurant"],
      formattedAddress: "Nørrebrogade 1, 2200 København",
      nationalPhoneNumber: "33 12 34 56",
      internationalPhoneNumber: "+45 33 12 34 56",
      googleMapsUri: "https://maps.google.com/?cid=1",
      location: { latitude: 55.69, longitude: 12.55 },
      priceLevel: "PRICE_LEVEL_MODERATE",
      regularOpeningHours: {
        weekdayDescriptions: [
          "Monday: 11:00 AM – 10:00 PM",
          "Tuesday: 11:00 AM – 10:00 PM",
        ],
      },
      reviews: [
        {
          rating: 5,
          text: { text: "Best dürüm in town, friendly staff." },
          relativePublishTimeDescription: "2 weeks ago",
        },
        {
          rating: 4,
          text: { text: "Great portions, a bit slow at lunch." },
        },
      ],
    },
  })

  const text = formatMapsDataForAi(lead)

  expect(text).toContain("# Google Maps listing brief: Konya Kebab")
  expect(text).toContain("They do not appear to have a website")
  expect(text).toContain("- Category: Turkish restaurant")
  expect(text).toContain("- Address: Nørrebrogade 1, 2200 København")
  expect(text).toContain("- Phone: 33 12 34 56")
  expect(text).toContain("- Google Maps: https://maps.google.com/?cid=1")
  expect(text).toContain("- Coordinates: 55.69, 12.55")
  expect(text).toContain("- Monday: 11:00 AM – 10:00 PM")
  expect(text).toContain("- Rating: 4.5/5")
  expect(text).toContain("- Review count: 128")
  expect(text).toContain("Best dürüm in town")
  expect(text).toContain("## Website brief hints")
  expect(text).toContain("- Price level: moderate")
})

test("formatMapsDataForAi notes existing website", () => {
  const lead = baseLead({
    website: "https://konya.example.com",
    data: { formattedAddress: "Street 1" },
  })
  const text = formatMapsDataForAi(lead)
  expect(text).toContain("They already have a website (https://konya.example.com)")
  expect(text).toContain("- Website: https://konya.example.com")
})
