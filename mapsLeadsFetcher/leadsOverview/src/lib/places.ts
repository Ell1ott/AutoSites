import type { Place } from './places.types';

export type { Place } from './places.types';

export function placeTitle(p: Place): string {
	return p.displayName?.text ?? p.id;
}

export function placeSubtitle(p: Place): string | undefined {
	return p.primaryTypeDisplayName?.text ?? p.formattedAddress;
}
