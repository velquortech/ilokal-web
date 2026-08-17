import { ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * The "image missing" placeholder — a muted panel with a small icon, shown when
 * a storage URL fails to load. That is the graceful alternative to the
 * browser's broken glyph, which is what a card otherwise renders when a URL
 * resolves but the object no longer exists (or is blocked).
 *
 * Shared so every card, logo container and gallery tile shows the same state;
 * `SafeImage` renders this in place of the `<Image>` on error.
 *
 * `h-full w-full` fills the positioned frame a `fill` image would have used;
 * pass `className` with explicit sizing (e.g. `h-10 w-10 rounded-full`) when
 * rendering instead of a width/height image.
 */
export function BrokenImage({
  className,
  iconClassName = 'size-6',
}: {
  className?: string;
  iconClassName?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        'bg-muted text-muted-foreground flex h-full w-full items-center justify-center',
        className,
      )}
    >
      <ImageOff className={iconClassName} />
    </div>
  );
}
