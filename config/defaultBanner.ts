/**
 * The cover shown wherever a shop has no `banner_url` of its own — the banner
 * upload is optional at registration, so most new shops start here.
 *
 * Text-free on purpose: it sits BEHIND the shop's own name and logo, and art
 * carrying the iLokal wordmark or a tagline collided with both. Rendered at
 * display time, never written into `businesses.banner_url` (see
 * `public/brand/README.md` → "Default banner").
 */
export const DEFAULT_SHOP_BANNER_SRC = '/banner/ilokal-banner-default.png';
