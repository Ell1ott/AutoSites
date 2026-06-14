import { expect, test } from "bun:test"

import {
  getListingAddress,
  getListingPhone,
  getListingPhones,
} from "./lead-contacts"
import type { SlimLead } from "./types"

const baseLead = (over: Partial<SlimLead> = {}): SlimLead => ({
  place_id: "lead-1",
  name: "Lead",
  rating: null,
  review_count: null,
  website: null,
  business_status: null,
  lead_score: null,
  dynamic: {},
  updated_at: "2026-01-01T00:00:00.000Z",
  ...over,
})

test("getListingPhone reads data.nationalPhoneNumber", () => {
  const lead = baseLead({
    data: { nationalPhoneNumber: "+45 12 34 56 78" },
  })
  expect(getListingPhone(lead)).toBe("+45 12 34 56 78")
})

test("getListingPhones returns national and international when distinct", () => {
  const lead = baseLead({
    data: {
      nationalPhoneNumber: "+45 12 34 56 78",
      internationalPhoneNumber: "+45 12345678",
    },
  })
  expect(getListingPhones(lead)).toEqual(["+45 12 34 56 78"])
})

test("getListingAddress reads data.formattedAddress", () => {
  const lead = baseLead({
    data: { formattedAddress: "Mock St 1, 2100 Copenhagen" },
  })
  expect(getListingAddress(lead)).toBe("Mock St 1, 2100 Copenhagen")
})
