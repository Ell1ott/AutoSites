import { expect, test } from "bun:test"

import {
  contactCounts,
  hasAnyContactHit,
  hasContacts,
  isLeadCrawled,
  parseWebsiteContacts,
  primaryEmail,
  socialChipLabel,
  socialHandle,
} from "./website-contacts"
import type { SlimLead } from "./types"

const baseLead = (over: Partial<SlimLead> = {}): SlimLead => ({
  place_id: "lead-1",
  name: "Lead",
  rating: null,
  review_count: null,
  website: "https://example.com",
  business_status: null,
  lead_score: null,
  dynamic: {},
  updated_at: "2026-01-01T00:00:00.000Z",
  ...over,
})

test("parseWebsiteContacts reads structured dynamic field", () => {
  const wc = parseWebsiteContacts({
    website_contacts: {
      emails: ["a@b.dk"],
      phones: [],
      socials: { instagram: ["https://instagram.com/x"] },
      extracted_at: "2026-01-01T00:00:00.000Z",
      pages_scanned: 2,
    },
  })
  expect(wc?.emails).toEqual(["a@b.dk"])
  expect(wc?.pages_scanned).toBe(2)
  expect(contactCounts(wc).total).toBe(2)
  expect(primaryEmail(wc)).toBe("a@b.dk")
})

test("hasContacts uses flag and dynamic fallback", () => {
  expect(hasContacts(baseLead({ has_contacts: true }))).toBe(true)
  expect(
    hasContacts(
      baseLead({
        dynamic: {
          website_contacts: { emails: [], phones: [], socials: {}, extracted_at: "x" },
        },
      }),
    ),
  ).toBe(true)
  expect(hasContacts(baseLead())).toBe(false)
})

test("isLeadCrawled uses screenshot flag and contact fallback", () => {
  expect(isLeadCrawled(baseLead({ has_screenshot: true }))).toBe(true)
  expect(isLeadCrawled(baseLead({ has_screenshot: false }))).toBe(false)
  expect(
    isLeadCrawled(
      baseLead({
        dynamic: {
          website_contacts: {
            emails: [],
            phones: ["+1"],
            socials: { facebook: ["https://facebook.com/x"] },
            extracted_at: "2026-01-01T00:00:00.000Z",
          },
        },
      }),
    ),
  ).toBe(true)
})

test("hasAnyContactHit detects non-empty bundles", () => {
  const empty = parseWebsiteContacts({
    website_contacts: {
      emails: [],
      phones: [],
      socials: {},
      extracted_at: "x",
    },
  })
  const withEmail = parseWebsiteContacts({
    website_contacts: {
      emails: ["x@y.z"],
      phones: [],
      socials: {},
      extracted_at: "x",
    },
  })
  expect(hasAnyContactHit(empty)).toBe(false)
  expect(hasAnyContactHit(withEmail)).toBe(true)

  const withSocial = parseWebsiteContacts({
    website_contacts: {
      emails: [],
      phones: [],
      socials: { facebook: ["https://facebook.com/cafenohr/"] },
      extracted_at: "x",
    },
  })
  expect(hasAnyContactHit(withSocial)).toBe(true)
})

test("socialHandle extracts profile slugs from common social URLs", () => {
  expect(socialHandle("facebook", "https://facebook.com/cafenohr/")).toBe(
    "cafenohr",
  )
  expect(
    socialHandle("facebook", "https://facebook.com/pg/MyCompanyPage"),
  ).toBe("MyCompanyPage")
  expect(socialHandle("instagram", "https://instagram.com/my.cafe")).toBe(
    "@my.cafe",
  )
  expect(socialHandle("twitter", "https://x.com/brand_handle")).toBe(
    "@brand_handle",
  )
  expect(socialHandle("tiktok", "https://tiktok.com/@shopname")).toBe(
    "@shopname",
  )
  expect(
    socialHandle("linkedin", "https://linkedin.com/company/acme-corp"),
  ).toBe("company/acme-corp")
  expect(socialHandle("youtube", "https://youtube.com/@MyChannel")).toBe(
    "@MyChannel",
  )
  expect(socialHandle("telegram", "https://t.me/mybot")).toBe("@mybot")
  expect(socialHandle("whatsapp", "https://wa.me/4512345678")).toBe(
    "4512345678",
  )
  expect(socialHandle("yelp", "https://yelp.com/biz/cafe-nohr-copenhagen")).toBe(
    "cafe-nohr-copenhagen",
  )
})

test("socialChipLabel combines platform name and handle", () => {
  expect(
    socialChipLabel("facebook", "https://facebook.com/cafenohr/"),
  ).toBe("Facebook · cafenohr")
  expect(
    socialChipLabel("instagram", "https://instagram.com/my.cafe"),
  ).toBe("Instagram · @my.cafe")
})
