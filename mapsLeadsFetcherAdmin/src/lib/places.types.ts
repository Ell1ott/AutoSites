/** Subset of Google Places API fields used by the lead overview UI. */
export interface LocalizedText {
	text?: string;
	languageCode?: string;
}

export interface OpeningHoursPeriod {
	open?: { day?: number; hour?: number; minute?: number };
	close?: { day?: number; hour?: number; minute?: number };
}

export interface OpeningHours {
	openNow?: boolean;
	weekdayDescriptions?: string[];
	periods?: OpeningHoursPeriod[];
}

export interface PlaceReview {
	name?: string;
	rating?: number;
	text?: { text?: string };
	publishTime?: string;
	relativePublishTimeDescription?: string;
}

export interface LatLng {
	latitude?: number;
	longitude?: number;
}

export interface PlusCode {
	globalCode?: string;
	compoundCode?: string;
}

/** Output of `screenshot_store_websites.py` — website crawl / subpage screenshots. */
export interface WebsiteCrawlRoot {
	url_requested?: string;
	url_final?: string | null;
	nav_seconds?: number | null;
}

export interface WebsiteCrawlPage {
	url_requested?: string;
	url_final?: string | null;
	depth?: number;
	screenshot_path?: string | null;
	screenshot_error?: string | null;
	link_count_seen_on_page?: number | null;
}

export interface WebsiteDiscoveredLink {
	resolved_url?: string;
	raw_href?: string;
	tag?: string | null;
	text?: string | null;
	aria_label?: string | null;
	rel?: string | null;
	source_page_url?: string;
	is_internal?: boolean;
}

export interface WebsiteCrawl {
	root?: WebsiteCrawlRoot;
	discovered_links?: WebsiteDiscoveredLink[];
	pages?: WebsiteCrawlPage[];
}

export interface Place {
	id: string;
	/** ISO 8601 timestamp when the lead was first stored (from fetch script). */
	added?: string;
	name?: string;
	types?: string[];
	nationalPhoneNumber?: string;
	internationalPhoneNumber?: string;
	formattedAddress?: string;
	rating?: number;
	/** AI visual appeal score (1–10), from `visuel_rating` task output. */
	visuel_rating?: number | string;
	userRatingCount?: number;
	googleMapsUri?: string;
	websiteUri?: string;
	website_crawl?: WebsiteCrawl;
	businessStatus?: string;
	displayName?: LocalizedText;
	primaryTypeDisplayName?: LocalizedText;
	regularOpeningHours?: OpeningHours;
	currentOpeningHours?: OpeningHours;
	reviews?: PlaceReview[];
	location?: LatLng;
	plusCode?: PlusCode;
	priceLevel?: string;
	[key: string]: unknown;
}

export interface MapsBusinessesFile {
	fetched_at?: string;
	query?: string;
	requested_count?: number;
	returned_count?: number;
	search_center?: { latitude?: number; longitude?: number };
	bias_radius_meters?: number;
	rank_preference?: string;
	api_response?: { places?: Place[] };
}
