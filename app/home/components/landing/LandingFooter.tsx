import type { ComponentType } from 'react';
import { styleFromString as s } from '@/lib/utils/cssStyle';
import { footerColumns } from './data';
import { FacebookIcon, InstagramIcon, TikTokIcon } from './icons';

const socials: { label: string; href: string; Icon: ComponentType }[] = [
  { label: 'Facebook', href: '#', Icon: FacebookIcon },
  { label: 'Instagram', href: '#', Icon: InstagramIcon },
  { label: 'TikTok', href: '#', Icon: TikTokIcon },
];

/**
 * Landing footer — presentational, driven by `footerColumns`/`socials`. Reusable
 * on any page rendered inside a `[data-ilokal-root]` theme wrapper.
 */
export function LandingFooter() {
  return (
    <footer
      style={s('border-top:1px solid var(--border);padding:56px 0 32px;')}
    >
      <div className="wrap">
        <div className="footgrid" style={s('margin-bottom:40px;')}>
          <div>
            <div
              style={s(
                'font-size:22px;font-weight:800;color:var(--brand);margin-bottom:12px;',
              )}
            >
              iLokal
            </div>
            <p
              style={s(
                'font-size:14.5px;line-height:1.6;color:var(--muted);max-width:280px;margin-bottom:18px;',
              )}
            >
              Connecting Ilonggos with the local shops and deals that make
              Iloilo City special.
            </p>
            <div style={s('display:flex;gap:10px;')}>
              {socials.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  style={s(
                    'width:38px;height:38px;border-radius:10px;border:1px solid var(--border);display:flex;align-items:center;justify-content:center;color:var(--text);',
                  )}
                >
                  <Icon />
                </a>
              ))}
            </div>
          </div>
          {footerColumns.map((col) => (
            <div key={col.title}>
              <div
                style={s(
                  'font-size:13px;font-weight:700;color:var(--text);margin-bottom:16px;',
                )}
              >
                {col.title}
              </div>
              <div style={s('display:flex;flex-direction:column;gap:11px;')}>
                {col.links.map((l) => (
                  <a
                    key={l.label}
                    href={l.href}
                    style={s('font-size:14.5px;color:var(--muted);')}
                  >
                    {l.label}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div
          style={s(
            'border-top:1px solid var(--border);padding-top:24px;font-size:13.5px;color:var(--muted);',
          )}
        >
          © 2026 iLokal · Made in Iloilo City 🇵🇭
        </div>
      </div>
    </footer>
  );
}
