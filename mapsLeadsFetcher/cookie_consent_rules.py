"""
CMP / cookie-banner accept selectors (ordered: specific vendors first, generic last).
Each rule is a list of steps: iframe hop(s) then click(s). css_list tries alternatives.
"""

from __future__ import annotations

# One step: ("iframe", css) | ("css", selector) | ("css_list", [selectors...])
CookieRule = list[tuple[str, str | list[str]]]

_GENERIC_ACCEPT: list[str] = [
    "#AcceptCookiesButton, #acceptCookies, .cookie-accept, #cookie-accept",
    "#acptBtn, #js-first-screen-accept-all-button, .consentAgree",
    "button[class*='accept-all'], button[id*='accept-all'], button[class*='acceptall'], button[id*='acceptall'], a[class*='accept-all'], a[id*='accept-all'], a[class*='acceptall'], a[id*='acceptall']",
    "button[class*='confirm'], button[id*='confirm'], a[class*='confirm'], a[id*='confirm']",
    ".optIn, .opt-in, .optin, [class*='opt-in'], [id*='opt-in'], [class*='optin'], [id*='optin'], [class*='optIn'], [id*='optIn']",
    "[class*='accept-all'], [id*='accept-all'], [class*='acceptall'], [id*='acceptall']",
    "button[class*='accept'], button[id*='accept'], a[class*='accept'], a[id*='accept']",
    "input[value*='Tracking']",
    "[class*='accept'], [id*='accept'], [class*='Accept'], [id*='Accept']",
    "[class*='onfirm'], [id*='onfirm']",
    "[title*='kzept'], [title*='ustimmen'], [id*='kzept'], [id*='ustimmen'], [class*='akzept'], [class*='zustimmen']",
    "[aria-label*='ccept'], [aria-label*='optin'], [aria-label*='opt-in'], [aria-label*='kzept'], [aria-label*='ustimmen']",
    "#cookiebanner button, [class*='cookie']",
    "[class*='ookie'] button, [id*='ookie'] button",
    "[data-tracking-name*='opt-in'], [data-tracking-name*='optin'], [data-tracking-name*='optIn']",
]

_GENERIC_IFRAME = (
    "iframe[src*='consent'],iframe[src*='cookie'], iframe[src*='gdpr'], "
    "iframe[id*='consent'], iframe[id*='cookie'], iframe[id*='gdpr']"
)

COOKIE_CONSENT_RULES: list[CookieRule] = [
    [("css", "#onetrust-accept-btn-handler")],
    [("css_list", ["#accept-recommended-btn-handler"])],
    [("css", ".optanon-allow-all")],
    [("css", "#cookielaw_accept")],
    [("css", "[class*=eu-cookie-compliance-] .agree-button")],
    [
        ("iframe", "[id*='sp_message_iframe']"),
        (
            "css_list",
            [
                "[title*='ccept'], [title*='agree']",
                "[title*='kzept'], [title*='ustimmen']",
                "button.sp_choice_type_11",
            ],
        ),
    ],
    [("css", ".sp-cookie-consent .sp-cookie-allow")],
    [
        ("iframe", "iframe#fast-cmp-iframe"),
        ("css", ".fast-cmp-home-accept"),
    ],
    [("css", ".fc-cta-consent")],
    [("css", ".cookie-notice .cm-btn-success")],
    [
        ("css_list", [
            "#ensNotifyBanner #ensBtnYes",
            "#ensNotifyBanner #ensCloseBanner",
        ])
    ],
    [("css", ".bcGDPR .bcpConsentOKButton")],
    [("css", ".ez-cookie-dialog #ez-accept-all")],
    [
        ("css_list", [
            "#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll",
            "#CybotCookiebotDialogBodyLevelButtonAccept",
        ])
    ],
    [("css", "#CybotCookiebotDialog [data-controller*='accept']")],
    [("css", ".ch2-container .ch2-allow-all-btn")],
    [("css", ".waconcookiemanagement .cookie-accept")],
    [("css", ".dp--cookie-consent .cc-all")],
    [
        ("css_list", [
            "#tc-privacy-wrapper [title*='ccept']",
            "#tc-privacy-wrapper [title*='kzept']",
            "#tc-privacy-wrapper #popin_tc_privacy_button",
        ])
    ],
    [("css", "[data-cookiefirst-action='accept']")],
    [("css", ".osano-cm-accept-all")],
    [("css", ".orejime-Button--save")],
    [("css", "#axeptio_btn_acceptAll")],
    [("css", "#ccc-notify-accept")],
    [
        ("css_list", [
            "[data-testid='uc-accept-all-button']",
            "#uc-btn-accept-banner",
            "cmm-cookie-banner .button--accept-all",
        ])
    ],
    [("css", "[data-cky-tag='accept-button']")],
    [("css", ".evSpAcceptBtn")],
    [("css", "#qc-cmp2-ui button[mode='primary']")],
    [
        ("css_list", [
            "#didomi-notice-agree-button",
            ".Cmp__action--yes",
        ])
    ],
    [("css", "[data-name='mediavine-gdpr-cmp'] [format='primary']")],
    [("css", "[data-cli_action='accept']")],
    [("css", "#cmpwrapper #cmpbntyestxt")],
    [("css", "#hs-eu-confirmation-button")],
    [
        ("iframe", "#gdpr-consent-notice"),
        ("css", "button#save"),
    ],
    [
        ("iframe", "iframe[src*='trustarc.com']"),
        (
            "css_list",
            [
                "#truste-consent-button, a.call",
                ".acceptAll",
            ],
        ),
    ],
    [
        ("iframe", "#appconsent > iframe"),
        ("css", ".button__acceptAll"),
    ],
    [("css", ".cmplz-accept")],
    [("css", "#cookiescript_accept")],
    [("css", "[fs-cc=allow]")],
    [("css", "button#ppms_cm_agree-to-all")],
    [("css", "#shopify-pc__banner__btn-accept")],
    [("css_list", list(_GENERIC_ACCEPT))],
    [
        ("iframe", _GENERIC_IFRAME),
        ("css_list", list(_GENERIC_ACCEPT)),
    ],
]
