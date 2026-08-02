import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, CalendarDays, MapPin, Store, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getEventById } from '@/lib/api/events/eventQuery';
import { eventPath, explorePath, ROUTES } from '@/config/routeConfig';
import { eventPhase, formatEventWhen } from '@/lib/utils/eventSchedule';
import { safeExternalUrl, displayUrlLabel } from '@/lib/utils/safeExternalUrl';
import { brandToneFor } from '@/lib/utils/brandTone';
import { businessSocialCard } from '@/lib/utils/socialCard';
import { cn } from '@/lib/utils';

type Params = Promise<{ eventId: string }>;

/**
 * `getEventById` is `React.cache`d, so this and the page body share one read
 * rather than fetching twice per request.
 */
export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { eventId } = await params;
  const result = await getEventById(eventId);

  if ('error' in result) {
    return { title: 'Event' };
  }

  const { event } = result;
  const description =
    event.description?.slice(0, 200) ??
    `${formatEventWhen(event)} · ${event.address}`;

  return {
    title: event.name,
    description,
    alternates: { canonical: eventPath(event.id) },
    // Next REPLACES a parent `openGraph` rather than merging it, so the helper
    // restates site name, type, locale and url — without it a share card loses
    // them and reads like a scrape.
    ...businessSocialCard({
      name: event.name,
      description,
      banner: event.image_url,
      url: eventPath(event.id),
    }),
  };
}

export default async function EventDetailPage({ params }: { params: Params }) {
  const { eventId } = await params;
  const result = await getEventById(eventId);

  // NOT_FOUND and LOAD_FAILED are separate for a reason: a transient DB blip
  // must not tell a crawler that a healthy event page is gone.
  if ('error' in result) {
    if (result.error === 'NOT_FOUND') notFound();
    return <LoadFailed />;
  }

  const { event } = result;
  const phase = eventPhase(event);

  // Never render a stored URL raw. Zod guards the write path, but rows written
  // before that check — and any admin edit — bypass it entirely.
  const website = safeExternalUrl(event.link_url);
  const tickets = safeExternalUrl(event.ticket_url);

  return (
    <article className="space-y-8">
      <Link
        href={ROUTES.EVENTS.HOME}
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="size-4" aria-hidden />
        All events
      </Link>

      <header className="space-y-4">
        <div className="relative aspect-[16/7] w-full overflow-hidden rounded-xl border">
          {event.image_url ? (
            <Image
              src={event.image_url}
              alt=""
              fill
              unoptimized
              priority
              sizes="(max-width: 1024px) 100vw, 1024px"
              className="object-cover"
            />
          ) : (
            <div
              className={cn(
                'flex h-full w-full items-center justify-center px-8 text-center',
                brandToneFor(event.id),
              )}
            >
              <span className="font-display text-3xl leading-tight font-bold sm:text-5xl">
                {event.name}
              </span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {phase === 'live' && (
              <span className="bg-primary text-primary-foreground rounded-full px-2.5 py-1 text-xs font-medium">
                Happening now
              </span>
            )}
            {phase === 'past' && (
              // A shared link must keep resolving after the event — say it is
              // over rather than 404ing on someone who clicked in good faith.
              <span className="bg-muted text-muted-foreground rounded-full px-2.5 py-1 text-xs font-medium">
                This event has finished
              </span>
            )}
          </div>

          <h1 className="text-3xl font-semibold sm:text-4xl">{event.name}</h1>

          <p className="text-muted-foreground flex items-center gap-2">
            <CalendarDays className="size-4 shrink-0" aria-hidden />
            {formatEventWhen(event)}
          </p>
          <p className="text-muted-foreground flex items-center gap-2">
            <MapPin className="size-4 shrink-0" aria-hidden />
            {event.address}
          </p>
        </div>

        {/* The two links are what this page is FOR. Absent when unset rather
            than disabled — a dead button is worse than no button. */}
        {(tickets || website) && (
          <div className="flex flex-wrap items-center gap-3">
            {tickets && (
              <Button asChild size="lg">
                <a href={tickets} target="_blank" rel="noopener noreferrer">
                  <Ticket aria-hidden />
                  Get tickets
                </a>
              </Button>
            )}
            {website && (
              <Button asChild size="lg" variant="outline">
                <a href={website} target="_blank" rel="noopener noreferrer">
                  Visit {displayUrlLabel(website) ?? 'the website'}
                </a>
              </Button>
            )}
          </div>
        )}
      </header>

      {event.description && (
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">About</h2>
          {/* Plain text, deliberately: this is owner-supplied copy and nothing
              here renders markup. `whitespace-pre-line` keeps their line
              breaks without letting them author HTML. */}
          <p className="text-muted-foreground whitespace-pre-line">
            {event.description}
          </p>
        </section>
      )}

      {event.business && (
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Who&rsquo;s behind it</h2>
          <Link
            href={explorePath(event.business.id)}
            className="hover:bg-accent flex items-center gap-3 rounded-lg border p-4 transition-colors"
          >
            <div className="bg-muted relative size-12 shrink-0 overflow-hidden rounded-full">
              {event.business.logo_url ? (
                <Image
                  src={event.business.logo_url}
                  alt=""
                  fill
                  unoptimized
                  sizes="48px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Store className="text-muted-foreground size-5" aria-hidden />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="font-medium">{event.business.shop_name}</p>
              {event.product && (
                <p className="text-muted-foreground text-sm">
                  Featuring {event.product.name}
                </p>
              )}
            </div>
          </Link>
        </section>
      )}
    </article>
  );
}

function LoadFailed() {
  return (
    <div className="flex flex-col items-center gap-2 py-16 text-center">
      <p className="font-medium">We couldn&rsquo;t load this event</p>
      <p className="text-muted-foreground max-w-sm text-sm">
        Something went wrong on our side. Try again in a moment.
      </p>
      <Button asChild variant="outline" className="mt-2">
        <Link href={ROUTES.EVENTS.HOME}>All events</Link>
      </Button>
    </div>
  );
}
