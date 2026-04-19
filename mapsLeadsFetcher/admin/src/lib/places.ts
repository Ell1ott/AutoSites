import type { Place } from './places.types';

export type { Place } from './places.types';

export function placeTitle(p: Place): string {
	return p.displayName?.text ?? p.id;
}

export function placeSubtitle(p: Place): string | undefined {
	return p.primaryTypeDisplayName?.text ?? p.formattedAddress;
}

export function ratingLabel(p: Place): string {
	const parts: string[] = [];
	if (p.rating != null) parts.push(`${p.rating}★`);
	if (p.userRatingCount != null) parts.push(`${p.userRatingCount} reviews`);
	return parts.join(' · ');
}
