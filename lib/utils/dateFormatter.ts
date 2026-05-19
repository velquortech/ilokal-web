/**
 * Format a date as relative time (e.g., "2 minutes ago", "1 hour ago")
 * @param dateString - The date string or Date object to format
 * @returns A human-readable relative time string
 */
export function getTimeAgo(dateString: string | Date): string {
  try {
    const date = new Date(dateString);

    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffMonths / 12);

    // Future date
    if (diffSecs < 0) {
      return 'in the future';
    }

    // Less than 1 minute
    if (diffSecs < 60) {
      return 'now';
    }

    // Less than 1 hour
    if (diffMins < 60) {
      return diffMins === 1 ? '1 minute ago' : `${diffMins} minutes ago`;
    }

    // Less than 1 day
    if (diffHours < 24) {
      return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
    }

    // Less than 30 days
    if (diffDays < 30) {
      return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
    }

    // Less than 12 months
    if (diffMonths < 12) {
      return diffMonths === 1 ? '1 month ago' : `${diffMonths} months ago`;
    }

    // 1 year or more
    return diffYears === 1 ? '1 year ago' : `${diffYears} years ago`;
  } catch {
    return 'Invalid date';
  }
}

/**
 * Format a date as a readable date string (e.g., "Mar 4, 2026")
 * @param dateString - The date string or Date object to format
 * @returns A formatted date string
 */
export function formatDateShort(dateString: string | Date): string {
  try {
    const date = new Date(dateString);

    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return 'Invalid date';
  }
}
