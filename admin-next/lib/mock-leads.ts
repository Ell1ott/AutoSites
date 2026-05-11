// Fallback list used when the backend is unreachable AND
// `NEXT_PUBLIC_USE_MOCKS=1`. Hand-rolled rather than fixture-generated so
// the list reads naturally during local dev.

import type { SlimLead } from "./types"

const NOW = "2026-05-11T10:00:00.000Z"

export const MOCK_LEADS: SlimLead[] = [
  {
    place_id: "mock-001",
    name: "Bachs Bageri",
    rating: 4.6,
    review_count: 184,
    website: "https://bachs.example.com",
    business_status: "OPERATIONAL",
    lead_score: 9,
    dynamic: {
      visual_rating: 8,
      design_prompt:
        "Warm, hand-drawn bakery wordmark on cream background; rye-bread photography hero; light Scandinavian serif headlines.",
      has_email: true,
    },
    updated_at: NOW,
  },
  {
    place_id: "mock-002",
    name: "Novine Digital",
    rating: 4.9,
    review_count: 42,
    website: null,
    business_status: "OPERATIONAL",
    lead_score: 7,
    dynamic: {
      visual_rating: 9,
      design_prompt:
        "Dark, type-driven landing; bright accent gradient; agency case-studies grid; very tight 8px baseline.",
      tags: ["agency", "design"],
    },
    updated_at: NOW,
  },
  {
    place_id: "mock-003",
    name: "Cafe Lykke",
    rating: 4.3,
    review_count: 311,
    website: "https://lykke.example.com",
    business_status: "OPERATIONAL",
    lead_score: null,
    dynamic: {
      design_prompt:
        "Editorial cafe site; lifestyle photography; pastel olive palette; menu card with handwritten prices.",
    },
    updated_at: NOW,
  },
  {
    place_id: "mock-004",
    name: "Sunset Auto Detailing",
    rating: 4.1,
    review_count: 56,
    website: null,
    business_status: "OPERATIONAL",
    lead_score: 4,
    dynamic: {
      visual_rating: 3,
    },
    updated_at: NOW,
  },
  {
    place_id: "mock-005",
    name: "Vintage Vinyl & Co",
    rating: 4.8,
    review_count: 921,
    website: "https://vinyl.example.com",
    business_status: "OPERATIONAL",
    lead_score: 10,
    dynamic: {
      visual_rating: 10,
      design_prompt:
        "Retro newsprint hero; oversized record-store-day type; grungy halftones; black/yellow palette.",
      has_email: true,
      tags: ["music", "retail"],
    },
    updated_at: NOW,
  },
  {
    place_id: "mock-006",
    name: "Closed Bistro",
    rating: 3.2,
    review_count: 18,
    website: null,
    business_status: "CLOSED_PERMANENTLY",
    lead_score: null,
    dynamic: {},
    updated_at: NOW,
  },
  {
    place_id: "mock-007",
    name: "Greenhouse Yoga Studio",
    rating: 4.7,
    review_count: 142,
    website: "https://greenhouse-yoga.example.com",
    business_status: "OPERATIONAL",
    lead_score: 6,
    dynamic: {
      visual_rating: 7,
      design_prompt:
        "Calming sage gradient; serif/sans mix; class timetable with hover tooltips; soft cards.",
    },
    updated_at: NOW,
  },
  {
    place_id: "mock-008",
    name: "Tre Måneder Tattoo",
    rating: 4.9,
    review_count: 72,
    website: null,
    business_status: "OPERATIONAL",
    lead_score: 8,
    dynamic: {
      visual_rating: 9,
      design_prompt:
        "Heavy black canvas; oversized brush wordmark; portfolio masonry; minimal contact form.",
      has_email: false,
    },
    updated_at: NOW,
  },
  {
    place_id: "mock-009",
    name: "Aalto Wood Workshop",
    rating: 4.5,
    review_count: 39,
    website: "https://aalto-wood.example.com",
    business_status: "OPERATIONAL",
    lead_score: 5,
    dynamic: {
      design_prompt:
        "Editorial product photography of furniture; honest off-white; Finnish-modern typography.",
    },
    updated_at: NOW,
  },
  {
    place_id: "mock-010",
    name: "Mikros Mobile Mechanic",
    rating: 4.2,
    review_count: 11,
    website: null,
    business_status: "OPERATIONAL",
    lead_score: 3,
    dynamic: {},
    updated_at: NOW,
  },
]
