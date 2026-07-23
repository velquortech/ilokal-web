'use client';

import { styleFromString as s } from '@/lib/utils/cssStyle';

/**
 * Thin strip under the landing nav telling visitors the platform is in beta.
 * Sits below the sticky nav on purpose — the mobile menu overlay assumes the
 * nav starts at the viewport top.
 */
export function BetaBanner() {
  return (
    <div
      role="status"
      style={s(
        'background:var(--tint);color:var(--brandhover);border-bottom:1px solid var(--border);text-align:center;font-size:13px;font-weight:600;padding:9px 16px;line-height:1.4;',
      )}
    >
      🚧 iLokal is in <strong>beta</strong> — things are still being polished
      and you may run into rough edges. Thanks for being an early explorer!
    </div>
  );
}
