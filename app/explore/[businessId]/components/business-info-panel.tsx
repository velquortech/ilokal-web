import { Clock, Facebook, Globe, Instagram, Music2, Phone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  DAY_LABELS,
  formatOperatingHours,
  hasOperatingHours,
  isOpenNow,
} from '@/lib/utils/operatingHours';
import {
  displayUrlLabel,
  safeExternalUrl,
  safeTelHref,
} from '@/lib/utils/safeExternalUrl';
import type { DayKey, PublicBusinessInfo } from '@/lib/types';

/**
 * Operating hours, public contact details, and social links for the public
 * shop page.
 *
 * Two rules this component exists to hold:
 *
 * 1. **Every link goes through `safeExternalUrl`.** These columns are
 *    owner-supplied and `z.url()` historically accepted `javascript:` — see
 *    `lib/utils/safeExternalUrl.ts`. A link that fails the guard renders as
 *    nothing, never as a broken or dangerous anchor.
 * 2. **Absent means absent.** A settings row only exists once the owner saves,
 *    so most shops have nothing here. Each block hides itself, and the whole
 *    panel disappears when all three are empty — no empty shells, no "—".
 */

const SOCIAL_ENTRIES = [
  { key: 'facebook', label: 'Facebook', Icon: Facebook },
  { key: 'instagram', label: 'Instagram', Icon: Instagram },
  // lucide has no TikTok glyph; Music2 is the closest honest stand-in.
  { key: 'tiktok', label: 'TikTok', Icon: Music2 },
] as const;

/** Sunday-indexed `getDay()` → our keys, for highlighting today's row. */
const WEEKDAY_KEYS: readonly DayKey[] = [
  'sun',
  'mon',
  'tue',
  'wed',
  'thu',
  'fri',
  'sat',
];

export function BusinessInfoPanel({
  info,
}: {
  info: PublicBusinessInfo | null;
}) {
  if (!info) return null;

  const days = formatOperatingHours(info.operating_hours);
  const showHours = hasOperatingHours(info.operating_hours);
  const openNow = isOpenNow(info.operating_hours);

  // `contact_website` wins over `social_links.website` — the two columns hold
  // the same idea and rendering both shows the site twice.
  const website =
    safeExternalUrl(info.contact_website) ??
    safeExternalUrl(info.social_links?.website);
  const websiteLabel = displayUrlLabel(website);
  const phoneHref = safeTelHref(info.contact_phone_public);

  const socials = SOCIAL_ENTRIES.map((entry) => ({
    ...entry,
    href: safeExternalUrl(info.social_links?.[entry.key]),
  })).filter((entry) => entry.href !== null);

  const showContact = Boolean(website || phoneHref);

  if (!showHours && !showContact && socials.length === 0) return null;

  // Today's key in shop-local terms is close enough for a highlight; the
  // authoritative open/closed answer comes from `isOpenNow`.
  const todayKey = WEEKDAY_KEYS[new Date().getDay()];

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold tracking-tight">Shop information</h2>

      <div className="space-y-4 rounded-xl border p-4">
        {showHours && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="inline-flex items-center gap-2 text-sm font-medium">
                <Clock className="text-primary h-4 w-4" />
                Opening hours
              </p>
              {/* null = no usable hours; claiming "Closed" would be a guess. */}
              {openNow !== null && (
                <Badge
                  variant="outline"
                  className={
                    openNow
                      ? 'border-primary/20 bg-primary/10 text-primary'
                      : 'text-muted-foreground'
                  }
                >
                  {openNow ? 'Open now' : 'Closed'}
                </Badge>
              )}
            </div>
            <dl className="space-y-1 text-sm">
              {days.map((day) => (
                <div
                  key={day.key}
                  className={
                    day.key === todayKey
                      ? 'flex justify-between gap-4 font-medium'
                      : 'text-muted-foreground flex justify-between gap-4'
                  }
                >
                  <dt>{DAY_LABELS[day.key]}</dt>
                  <dd>{day.hours ?? 'Closed'}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {showContact && (
          <div className="space-y-2 border-t pt-4 first:border-0 first:pt-0">
            <p className="text-sm font-medium">Contact</p>
            <ul className="space-y-1.5 text-sm">
              {phoneHref && (
                <li>
                  <a
                    href={phoneHref}
                    className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 underline-offset-2 hover:underline"
                  >
                    <Phone className="h-4 w-4 shrink-0" />
                    {info.contact_phone_public}
                  </a>
                </li>
              )}
              {website && (
                <li>
                  <a
                    href={website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 underline-offset-2 hover:underline"
                  >
                    <Globe className="h-4 w-4 shrink-0" />
                    {websiteLabel ?? website}
                  </a>
                </li>
              )}
            </ul>
          </div>
        )}

        {socials.length > 0 && (
          <div className="space-y-2 border-t pt-4 first:border-0 first:pt-0">
            <p className="text-sm font-medium">Follow along</p>
            <ul className="flex flex-wrap gap-2">
              {socials.map(({ key, label, Icon, href }) => (
                <li key={key}>
                  <a
                    href={href as string}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${label} (opens in a new tab)`}
                    className="text-muted-foreground hover:text-foreground hover:border-primary/40 inline-flex size-9 items-center justify-center rounded-lg border transition-colors"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
