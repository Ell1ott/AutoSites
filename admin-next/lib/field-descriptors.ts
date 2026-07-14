import { FIELD_FORMAT_DISCARD_SCORE, type FieldDescriptor } from "./types"

/** Apply known metadata overrides for structured fields stored as objects. */
export function enrichFieldDescriptor(f: FieldDescriptor): FieldDescriptor {
  if (f.source === "dynamic" && f.key === "discard_score") {
    return {
      ...f,
      display: f.display && f.display.trim() !== "" ? f.display : "Discard score",
      format: FIELD_FORMAT_DISCARD_SCORE,
    }
  }
  return f
}

export function enrichFieldDescriptors(
  fields: FieldDescriptor[],
): FieldDescriptor[] {
  return fields.map(enrichFieldDescriptor)
}

/** Fields that can appear in sort/filter/table column pickers. */
export function isComparableLeadField(f: FieldDescriptor): boolean {
  if (f.type.startsWith("array")) return false
  if (f.type === "object" && f.format !== FIELD_FORMAT_DISCARD_SCORE) {
    return false
  }
  return true
}
