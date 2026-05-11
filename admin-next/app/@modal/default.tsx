// Default fallback for the @modal parallel route slot. Required by Next so
// non-modal navigations don't 404 the slot. Returns null — when no modal is
// open, the slot renders nothing.
export default function ModalDefault() {
  return null
}
