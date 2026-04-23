export const EVENTS = {
  ADMIN_SIGNED_IN: "admin_signed_in",
  ADMIN_SIGN_IN_FAILED: "admin_sign_in_failed",
  ADMIN_SIGNED_OUT: "admin_signed_out",
  EDIT_MODE_ENTERED: "edit_mode_entered",
  EDIT_MODE_DENIED: "edit_mode_denied",
  AUTH_CALLBACK_SUCCEEDED: "auth_callback_succeeded",
  AUTH_CALLBACK_FAILED: "auth_callback_failed",
  CMS_CONTENT_UPDATED: "cms_content_updated",
  CMS_CONTENT_REVALIDATED: "cms_content_revalidated",
  CMS_IMAGE_UPLOADED: "cms_image_uploaded",
  CMS_FIELD_FOCUSED: "cms_field_focused",
  CMS_IMAGE_PICKER_OPENED: "cms_image_picker_opened",
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];

export type AnalyticsContext = {
  userId: string | null;
  email: string | null;
  siteId: string;
  isLoggedIn: boolean;
  editMode: boolean;
};
