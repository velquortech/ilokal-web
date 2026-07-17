'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'motion/react';
import { styleFromString as s } from '@/lib/utils/cssStyle';
import { ROUTES } from '@/config/routeConfig';
import './landing.css';
import { rootStyle } from './tokens';
import { LandingNav } from './LandingNav';
import { LandingFooter } from './LandingFooter';
import { fadeUp, inViewOnce, staggerContainer } from './motion';
import { useCountUp } from './useCountUp';
import {
  avatarStack,
  bizPoints,
  bizSteps,
  categories,
  COUNTER_TARGETS,
  dealAvatarColor,
  dealBadgeLabel,
  deals,
  features,
  shopperSteps,
  testimonials,
} from './data';
import {
  AppleLogo,
  BrowserLock,
  CheckIcon,
  featureIcon,
  GooglePlayLogo,
  LockUnlock,
  LoginArrow,
  PhonePin,
  PhoneStore,
  PhoneTicket,
  StrokeIcon,
  UserPlus,
  VerifiedSeal,
} from './icons';

const eyebrow =
  'font-size:14px;font-weight:700;color:var(--brand);text-transform:uppercase;letter-spacing:.08em;margin-bottom:12px;';
const h2Style =
  'font-size:clamp(28px,3.4vw,40px);font-weight:800;letter-spacing:-0.02em;line-height:1.1;';
const primaryCta =
  'display:inline-flex;align-items:center;gap:9px;background:var(--brand);color:#fff;font-size:16px;font-weight:600;padding:15px 26px;border-radius:12px;box-shadow:0 4px 14px rgba(101,163,13,.3);';

export function LandingPage() {
  const [dark, setDark] = useState(false);
  const [category, setCategory] = useState('All');
  const [statsActive, setStatsActive] = useState(false);

  const shops = useCountUp(COUNTER_TARGETS.shops, 1400, statsActive);
  const dealsCount = useCountUp(COUNTER_TARGETS.deals, 1700, statsActive);

  const filteredDeals =
    category === 'All' ? deals : deals.filter((d) => d.cat === category);

  return (
    <div data-ilokal-root style={rootStyle(dark)}>
      <LandingNav dark={dark} onToggleDark={() => setDark((v) => !v)} />

      {/* HERO */}
      <section id="top" style={s('padding:72px 0 64px;')}>
        <div className="wrap herogrid">
          <motion.div
            className="herotext"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <span
              style={s(
                'display:inline-flex;align-items:center;gap:6px;padding:6px 13px;border-radius:999px;background:var(--tint);color:var(--brandhover);font-size:13px;font-weight:600;margin-bottom:22px;',
              )}
            >
              🌿 Proudly Ilonggo · Local-first
            </span>
            <h1
              style={s(
                'font-size:clamp(34px,4.6vw,56px);line-height:1.05;font-weight:800;letter-spacing:-0.03em;text-wrap:balance;margin-bottom:20px;',
              )}
            >
              Discover Iloilo&apos;s best local shops — and their best deals.
            </h1>
            <p
              style={s(
                'font-size:18px;line-height:1.6;color:var(--muted);max-width:520px;margin-bottom:32px;',
              )}
            >
              Find verified cafés, restaurants, and stores near you. Claim
              exclusive coupons, follow your favorites, and plan your next trip
              around town.
            </p>
            <div
              style={s(
                'display:flex;flex-wrap:wrap;gap:14px;margin-bottom:28px;',
              )}
            >
              <a href="#" className="il-btn-primary" style={s(primaryCta)}>
                Get the App
              </a>
              <a
                href="#businesses"
                className="il-btn-outline"
                style={s(
                  'display:inline-flex;align-items:center;gap:9px;color:var(--text);font-size:16px;font-weight:600;padding:15px 26px;border-radius:12px;border:1.5px solid var(--border);background:var(--surface);',
                )}
              >
                For Business Owners
              </a>
            </div>
            <div
              className="trustrow"
              style={s('display:flex;align-items:center;gap:12px;')}
            >
              <div style={s('display:flex;')}>
                {avatarStack.map((a, i) => (
                  <span
                    key={i}
                    style={s(
                      `width:34px;height:34px;border-radius:999px;background:${a.bg};color:${a.fg};display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;border:2px solid var(--bg);${i > 0 ? 'margin-left:-10px;' : ''}`,
                    )}
                  >
                    {a.initials}
                  </span>
                ))}
              </div>
              <span
                style={s('font-size:14px;color:var(--muted);font-weight:500;')}
              >
                Trusted by local Ilonggo businesses.
              </span>
            </div>
          </motion.div>

          {/* PHONE MOCK */}
          <motion.div
            className="herophone"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <div style={s('position:relative;width:310px;')}>
              <div
                style={s(
                  'position:absolute;inset:-30px -30px auto auto;width:180px;height:180px;background:radial-gradient(circle,rgba(101,163,13,.18),transparent 70%);border-radius:50%;filter:blur(6px);',
                )}
              />
              <div
                className="il-floaty"
                style={s(
                  'position:relative;width:310px;height:620px;background:#0F172A;border-radius:44px;padding:11px;box-shadow:0 30px 70px rgba(16,24,40,.28);',
                )}
              >
                <div
                  style={s(
                    'position:absolute;top:22px;left:50%;transform:translateX(-50%);width:120px;height:26px;background:#0F172A;border-radius:0 0 16px 16px;z-index:3;',
                  )}
                />
                <div
                  style={s(
                    'width:100%;height:100%;background:#121814;border-radius:34px;overflow:hidden;position:relative;display:flex;flex-direction:column;',
                  )}
                >
                  {/* collage — TODO(real-data): swap placeholder blocks for next/image local photos */}
                  <div
                    style={s(
                      'position:absolute;inset:0;display:flex;gap:7px;padding:34px 0 0 6px;',
                    )}
                  >
                    {[-22, 26, -30, 20, -12].map((mt, i) => (
                      <div
                        key={i}
                        style={s(
                          `width:74px;height:300px;margin-top:${mt}px;flex-shrink:0;border-radius:14px;background:linear-gradient(160deg,#1f2a22,#16211a);`,
                        )}
                      />
                    ))}
                  </div>
                  <div
                    style={s(
                      'position:absolute;inset:0;background:linear-gradient(180deg,rgba(18,24,20,.12) 0%,rgba(18,24,20,.5) 38%,#121814 74%);pointer-events:none;',
                    )}
                  />
                  {/* content */}
                  <div
                    style={s(
                      'position:relative;margin-top:auto;padding:0 18px 22px;z-index:2;',
                    )}
                  >
                    <h3
                      style={s(
                        'font-size:27px;font-weight:800;letter-spacing:-0.02em;line-height:1.08;color:#fff;margin-bottom:9px;',
                      )}
                    >
                      Discover{' '}
                      <span style={s('color:#4ADE80;')}>Hidden Gems.</span>
                    </h3>
                    <p
                      style={s(
                        'font-size:12px;line-height:1.5;color:rgba(255,255,255,.78);margin-bottom:15px;',
                      )}
                    >
                      Your local neighborhood, just a tap away. Join iLokal to
                      support your local heroes.
                    </p>
                    <div
                      style={s(
                        'display:flex;flex-wrap:wrap;gap:7px;margin-bottom:16px;',
                      )}
                    >
                      <span
                        style={s(
                          'display:inline-flex;align-items:center;gap:5px;padding:6px 11px;border-radius:999px;border:1px solid rgba(255,255,255,.22);color:#fff;font-size:11px;font-weight:600;',
                        )}
                      >
                        <PhonePin />
                        Find Nearby
                      </span>
                      <span
                        style={s(
                          'display:inline-flex;align-items:center;gap:5px;padding:6px 11px;border-radius:999px;border:1px solid rgba(255,255,255,.22);color:#fff;font-size:11px;font-weight:600;',
                        )}
                      >
                        <PhoneTicket />
                        Exclusive Deals
                      </span>
                      <span
                        style={s(
                          'display:inline-flex;align-items:center;gap:5px;padding:6px 11px;border-radius:999px;border:1px solid rgba(255,255,255,.22);color:#fff;font-size:11px;font-weight:600;',
                        )}
                      >
                        <PhoneStore />
                        500+ Shops
                      </span>
                    </div>
                    <button
                      style={s(
                        'width:100%;background:#15803D;color:#fff;font-size:15px;font-weight:700;padding:14px;border-radius:999px;margin-bottom:10px;',
                      )}
                    >
                      Get Started
                    </button>
                    <div style={s('display:flex;gap:9px;')}>
                      <span
                        style={s(
                          'flex:1;display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:12px;border-radius:999px;border:1px solid rgba(74,222,128,.4);color:#fff;font-size:13px;font-weight:600;',
                        )}
                      >
                        <LoginArrow />
                        Log In
                      </span>
                      <span
                        style={s(
                          'flex:1;display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:12px;border-radius:999px;border:1px solid rgba(74,222,128,.4);color:#fff;font-size:13px;font-weight:600;',
                        )}
                      >
                        <UserPlus />
                        Sign Up
                      </span>
                    </div>
                    <div
                      style={s(
                        'text-align:center;font-size:10px;color:rgba(255,255,255,.5);margin-top:13px;',
                      )}
                    >
                      By continuing, you agree to our{' '}
                      <span style={s('color:rgba(255,255,255,.82);')}>
                        Terms
                      </span>{' '}
                      &amp;{' '}
                      <span style={s('color:rgba(255,255,255,.82);')}>
                        Privacy
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* STATS STRIP */}
      <section style={s('padding:8px 0 40px;')}>
        <motion.div
          className="wrap"
          {...inViewOnce}
          viewport={{ once: true, amount: 0.35 }}
          onViewportEnter={() => setStatsActive(true)}
          variants={fadeUp}
        >
          <div
            className="statsrow"
            style={s(
              'background:var(--tint);border:1px solid color-mix(in srgb,var(--brand) 18%,transparent);border-radius:16px;padding:26px 22px;',
            )}
          >
            <div style={s('flex:1;text-align:center;padding:8px 0;')}>
              <div
                style={s(
                  'font-size:38px;font-weight:800;letter-spacing:-0.02em;color:var(--brandhover);',
                )}
              >
                {shops}+
              </div>
              <div
                style={s(
                  'font-size:14px;color:var(--muted);font-weight:500;margin-top:4px;',
                )}
              >
                Verified Shops
              </div>
            </div>
            <div
              style={s(
                'width:1px;background:color-mix(in srgb,var(--brand) 20%,transparent);',
              )}
            />
            <div style={s('flex:1;text-align:center;padding:8px 0;')}>
              <div
                style={s(
                  'font-size:38px;font-weight:800;letter-spacing:-0.02em;color:var(--brandhover);',
                )}
              >
                {dealsCount}+
              </div>
              <div
                style={s(
                  'font-size:14px;color:var(--muted);font-weight:500;margin-top:4px;',
                )}
              >
                Deals Redeemed
              </div>
            </div>
            <div
              style={s(
                'width:1px;background:color-mix(in srgb,var(--brand) 20%,transparent);',
              )}
            />
            <div style={s('flex:1;text-align:center;padding:8px 0;')}>
              <div
                style={s(
                  'font-size:38px;font-weight:800;letter-spacing:-0.02em;color:var(--brandhover);',
                )}
              >
                📍
              </div>
              <div
                style={s(
                  'font-size:14px;color:var(--muted);font-weight:500;margin-top:4px;',
                )}
              >
                All across Iloilo City
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* FOR SHOPPERS */}
      <section id="shoppers" style={s('padding:64px 0;')}>
        <div className="wrap">
          <motion.div
            style={s('text-align:center;max-width:640px;margin:0 auto 44px;')}
            variants={fadeUp}
            {...inViewOnce}
          >
            <div style={s(eyebrow)}>For Shoppers</div>
            <h2 style={s(h2Style)}>Everything local, one tap away</h2>
          </motion.div>
          <motion.div
            className="featgrid"
            variants={staggerContainer}
            {...inViewOnce}
          >
            {features.map((f) => {
              const Icon = featureIcon[f.icon];
              return (
                <motion.div
                  key={f.title}
                  className="il-card"
                  variants={fadeUp}
                  style={s(
                    'background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:26px 22px;box-shadow:var(--shadow);',
                  )}
                >
                  <div
                    style={s(
                      'width:46px;height:46px;border-radius:12px;background:var(--tint);display:flex;align-items:center;justify-content:center;color:var(--brand);margin-bottom:18px;',
                    )}
                  >
                    <Icon />
                  </div>
                  <h3
                    style={s(
                      'font-size:18px;font-weight:700;margin-bottom:8px;letter-spacing:-0.01em;',
                    )}
                  >
                    {f.title}
                  </h3>
                  <p
                    style={s(
                      'font-size:14.5px;line-height:1.55;color:var(--muted);',
                    )}
                  >
                    {f.desc}
                  </p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* FOR BUSINESSES */}
      <section
        id="businesses"
        style={s('padding:64px 0;background:var(--tint);')}
      >
        <div className="wrap bizgrid">
          <motion.div
            style={s('position:relative;')}
            variants={fadeUp}
            {...inViewOnce}
          >
            <div
              style={s(
                'background:var(--surface);border:1px solid var(--border);border-radius:18px;box-shadow:var(--shadow);overflow:hidden;',
              )}
            >
              <div
                style={s(
                  'padding:16px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;',
                )}
              >
                <div style={s('display:flex;align-items:center;gap:10px;')}>
                  <span
                    style={s(
                      'width:34px;height:34px;border-radius:9px;background:#16A34A;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;',
                    )}
                  >
                    KC
                  </span>
                  <div>
                    <div
                      style={s(
                        'font-size:14px;font-weight:700;display:flex;align-items:center;gap:5px;',
                      )}
                    >
                      Kap Ising&apos;s Café <VerifiedSeal />
                    </div>
                    <div style={s('font-size:11.5px;color:var(--muted);')}>
                      Owner Dashboard · Iloilo City
                    </div>
                  </div>
                </div>
                <span
                  style={s(
                    'font-size:11px;font-weight:700;color:var(--brandhover);background:var(--tint);padding:5px 10px;border-radius:999px;',
                  )}
                >
                  Verified
                </span>
              </div>
              <div
                style={s(
                  'padding:18px;display:grid;grid-template-columns:1fr 1fr;gap:12px;',
                )}
              >
                <div
                  style={s(
                    'background:var(--bg);border:1px solid var(--border);border-radius:11px;padding:14px;',
                  )}
                >
                  <div style={s('font-size:12px;color:var(--muted);')}>
                    Redemptions this week
                  </div>
                  <div
                    style={s(
                      'font-size:26px;font-weight:800;color:var(--text);',
                    )}
                  >
                    248
                  </div>
                  <div
                    style={s('font-size:11.5px;color:#16A34A;font-weight:600;')}
                  >
                    ▲ 18% vs last week
                  </div>
                </div>
                <div
                  style={s(
                    'background:var(--bg);border:1px solid var(--border);border-radius:11px;padding:14px;',
                  )}
                >
                  <div style={s('font-size:12px;color:var(--muted);')}>
                    New followers
                  </div>
                  <div
                    style={s(
                      'font-size:26px;font-weight:800;color:var(--text);',
                    )}
                  >
                    +63
                  </div>
                  <div
                    style={s('font-size:11.5px;color:#16A34A;font-weight:600;')}
                  >
                    ▲ 9% vs last week
                  </div>
                </div>
                <div
                  style={s(
                    'grid-column:1/-1;background:var(--bg);border:1px solid var(--border);border-radius:11px;padding:14px;',
                  )}
                >
                  <div
                    style={s(
                      'font-size:12px;color:var(--muted);margin-bottom:10px;',
                    )}
                  >
                    Coupon redemptions
                  </div>
                  <svg
                    viewBox="0 0 260 60"
                    style={s('width:100%;height:52px;')}
                  >
                    <polyline
                      points="0,48 40,40 80,44 120,26 160,30 200,14 260,6"
                      fill="none"
                      stroke="#65A30D"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <polyline
                      points="0,48 40,40 80,44 120,26 160,30 200,14 260,6 260,60 0,60"
                      fill="rgba(101,163,13,.1)"
                      stroke="none"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </motion.div>
          <motion.div variants={fadeUp} {...inViewOnce}>
            <div style={s(eyebrow)}>For Business Owners</div>
            <h2 style={s(h2Style + 'margin-bottom:22px;')}>
              Grow your local shop with iLokal.
            </h2>
            <div
              style={s(
                'display:flex;flex-direction:column;gap:14px;margin-bottom:30px;',
              )}
            >
              {bizPoints.map((p) => (
                <div
                  key={p}
                  style={s('display:flex;align-items:flex-start;gap:12px;')}
                >
                  <span
                    style={s(
                      'flex-shrink:0;width:24px;height:24px;border-radius:999px;background:var(--brand);color:#fff;display:flex;align-items:center;justify-content:center;margin-top:1px;',
                    )}
                  >
                    <CheckIcon />
                  </span>
                  <span
                    style={s(
                      'font-size:16px;line-height:1.5;color:var(--text);',
                    )}
                  >
                    {p}
                  </span>
                </div>
              ))}
            </div>
            <Link
              href={ROUTES.BUSINESS.registration}
              className="il-btn-primary"
              style={s(primaryCta)}
            >
              List Your Business — it&apos;s free to start
            </Link>
          </motion.div>
        </div>
      </section>

      {/* WEB DASHBOARD SHOWCASE */}
      <section style={s('padding:64px 0;')}>
        <div className="wrap">
          <motion.div
            style={s('text-align:center;max-width:680px;margin:0 auto 44px;')}
            variants={fadeUp}
            {...inViewOnce}
          >
            <div style={s(eyebrow)}>One platform, two experiences</div>
            <h2 style={s(h2Style + 'margin-bottom:14px;')}>
              A mobile app for shoppers, a web dashboard for owners.
            </h2>
            <p style={s('font-size:17px;line-height:1.6;color:var(--muted);')}>
              Ilonggos discover and claim deals on their phone. Shop owners
              manage branches, products, and coupons — and watch redemptions
              roll in — from any browser.
            </p>
          </motion.div>
          <motion.div
            style={s('max-width:1040px;margin:0 auto;')}
            variants={fadeUp}
            {...inViewOnce}
          >
            <div
              style={s(
                'border:1px solid var(--border);border-radius:16px;overflow:hidden;box-shadow:0 24px 60px rgba(16,24,40,.14);background:var(--surface);',
              )}
            >
              <div
                style={s(
                  'display:flex;align-items:center;gap:14px;padding:12px 16px;border-bottom:1px solid var(--border);background:var(--chip);',
                )}
              >
                <div style={s('display:flex;gap:7px;')}>
                  <span
                    style={s(
                      'width:12px;height:12px;border-radius:999px;background:#EF4444;',
                    )}
                  />
                  <span
                    style={s(
                      'width:12px;height:12px;border-radius:999px;background:#F97316;',
                    )}
                  />
                  <span
                    style={s(
                      'width:12px;height:12px;border-radius:999px;background:#22C55E;',
                    )}
                  />
                </div>
                <div
                  style={s(
                    'flex:1;max-width:420px;display:flex;align-items:center;gap:8px;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:7px 12px;font-size:12.5px;color:var(--muted);',
                  )}
                >
                  <BrowserLock />
                  dashboard.ilokal.ph/overview
                </div>
              </div>
              {/* Real dashboard capture (animated walkthrough) — replaces the
                  hand-built mock so the section always matches the product.
                  `unoptimized` keeps the GIF animated (the image optimizer
                  would serve a single frame). */}
              <Image
                src="/images/dashboard-preview.gif"
                alt="iLokal business dashboard walkthrough showing retention rate, new followers, active deals, average rating, a 6-month follower and redemption trend, and customer segments"
                width={1903}
                height={906}
                unoptimized
                style={s('display:block;width:100%;height:auto;')}
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" style={s('padding:64px 0;')}>
        <div className="wrap">
          <motion.div
            style={s('text-align:center;max-width:640px;margin:0 auto 44px;')}
            variants={fadeUp}
            {...inViewOnce}
          >
            <div style={s(eyebrow)}>How It Works</div>
            <h2 style={s(h2Style)}>Simple for shoppers, simple for shops</h2>
          </motion.div>
          <div className="howgrid">
            {[
              { label: 'For Shoppers', steps: shopperSteps },
              { label: 'For Businesses', steps: bizSteps },
            ].map((col) => (
              <div key={col.label}>
                <div
                  style={s(
                    'font-size:17px;font-weight:700;margin-bottom:20px;display:flex;align-items:center;gap:9px;',
                  )}
                >
                  <span
                    style={s(
                      'width:9px;height:9px;border-radius:999px;background:var(--brand);',
                    )}
                  />
                  {col.label}
                </div>
                <motion.div
                  className="stepsrow"
                  variants={staggerContainer}
                  {...inViewOnce}
                >
                  {col.steps.map((st) => (
                    <motion.div
                      key={st.num}
                      variants={fadeUp}
                      style={s(
                        'background:var(--surface);border:1px solid var(--border);border-radius:13px;padding:20px 18px;box-shadow:var(--shadow);',
                      )}
                    >
                      <div
                        style={s(
                          'font-size:13px;font-weight:800;color:var(--brand);margin-bottom:10px;',
                        )}
                      >
                        {st.num}
                      </div>
                      <div
                        style={s(
                          'font-size:15px;font-weight:600;line-height:1.45;color:var(--text);',
                        )}
                      >
                        {st.text}
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CATEGORIES + DEALS */}
      <section id="deals" style={s('padding:64px 0;background:var(--tint);')}>
        <div className="wrap">
          <motion.div
            style={s('text-align:center;max-width:680px;margin:0 auto 30px;')}
            variants={fadeUp}
            {...inViewOnce}
          >
            <div style={s(eyebrow)}>Featured Categories &amp; Deals</div>
            <h2 style={s(h2Style)}>Browse by category, claim the deal</h2>
          </motion.div>
          <div className="catrow" style={s('margin-bottom:36px;')}>
            {categories.map((c) => {
              const on = c.name === category;
              return (
                <button
                  key={c.name}
                  onClick={() => setCategory(c.name)}
                  style={s(
                    `display:inline-flex;align-items:center;gap:7px;padding:10px 17px;border-radius:999px;font-size:14px;font-weight:600;border:1px solid ${on ? 'var(--brand)' : 'var(--border)'};background:${on ? 'var(--brand)' : 'var(--surface)'};color:${on ? '#fff' : 'var(--text)'};transition:all .18s;`,
                  )}
                >
                  <StrokeIcon paths={c.icon} size={16} />
                  {c.name}
                </button>
              );
            })}
          </div>
          <motion.div
            className="dealsgrid"
            variants={staggerContainer}
            {...inViewOnce}
            key={category}
          >
            {filteredDeals.map((d) => (
              <motion.div
                key={d.name}
                variants={fadeUp}
                style={s(
                  'position:relative;background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:22px;box-shadow:var(--shadow);',
                )}
              >
                {d.hot && (
                  <span
                    style={s(
                      'position:absolute;top:14px;right:14px;z-index:2;display:inline-flex;align-items:center;gap:4px;background:linear-gradient(90deg,#EF4444,#F97316);color:#fff;font-size:11px;font-weight:700;padding:5px 10px;border-radius:999px;box-shadow:0 3px 8px rgba(239,68,68,.35);',
                    )}
                  >
                    🔥 Hot Deal
                  </span>
                )}
                <div
                  style={s(
                    `display:flex;align-items:center;gap:12px;margin-bottom:16px;${d.hot ? 'padding-right:96px;' : ''}`,
                  )}
                >
                  <span
                    style={s(
                      `width:46px;height:46px;border-radius:12px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;color:#fff;background:${dealAvatarColor(d.color)};`,
                    )}
                  >
                    {d.initials}
                  </span>
                  <div style={s('min-width:0;')}>
                    <div
                      style={s(
                        'font-size:15px;font-weight:700;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;',
                      )}
                    >
                      {d.name}
                    </div>
                    <div style={s('font-size:12.5px;color:var(--muted);')}>
                      {d.cat}
                    </div>
                  </div>
                </div>
                <div
                  style={s(
                    'font-size:21px;font-weight:800;letter-spacing:-0.02em;line-height:1.2;color:var(--text);margin-bottom:14px;',
                  )}
                >
                  {d.text}
                </div>
                <div
                  style={s(
                    'display:flex;align-items:center;justify-content:space-between;gap:10px;',
                  )}
                >
                  <span
                    style={s(
                      'display:inline-flex;align-items:center;gap:5px;background:var(--tint);color:var(--brandhover);font-size:12px;font-weight:700;padding:6px 11px;border-radius:8px;',
                    )}
                  >
                    {dealBadgeLabel(d.type)}
                  </span>
                  <span
                    style={s(
                      'font-size:12.5px;color:var(--muted);font-weight:500;',
                    )}
                  >
                    {d.expiry}
                  </span>
                </div>
                {d.unlock && (
                  <div
                    style={s(
                      'margin-top:14px;display:flex;align-items:center;gap:7px;font-size:12.5px;font-weight:600;color:var(--brandhover);background:var(--tint);padding:9px 12px;border-radius:9px;',
                    )}
                  >
                    <LockUnlock />
                    Follow to unlock this deal
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="about" style={s('padding:64px 0;')}>
        <div className="wrap">
          <motion.div
            style={s('text-align:center;max-width:640px;margin:0 auto 44px;')}
            variants={fadeUp}
            {...inViewOnce}
          >
            <div style={s(eyebrow)}>Loved by Ilonggos</div>
            <h2 style={s(h2Style)}>From our shoppers and shop owners</h2>
          </motion.div>
          <motion.div
            className="testigrid"
            variants={staggerContainer}
            {...inViewOnce}
          >
            {testimonials.map((t) => (
              <motion.div
                key={t.name}
                variants={fadeUp}
                style={s(
                  'background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:26px 24px;box-shadow:var(--shadow);display:flex;flex-direction:column;gap:18px;',
                )}
              >
                <div style={s('color:var(--brand);font-size:15px;')}>★★★★★</div>
                <p
                  style={s(
                    'font-size:16px;line-height:1.6;color:var(--text);flex:1;',
                  )}
                >
                  “{t.quote}”
                </p>
                <div style={s('display:flex;align-items:center;gap:12px;')}>
                  <span
                    style={s(
                      `width:44px;height:44px;border-radius:999px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;color:#fff;background:${t.color};`,
                    )}
                  >
                    {t.initials}
                  </span>
                  <div>
                    <div
                      style={s(
                        'font-size:14.5px;font-weight:700;color:var(--text);',
                      )}
                    >
                      {t.name}
                    </div>
                    <div style={s('font-size:12.5px;color:var(--muted);')}>
                      {t.role}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section style={s('padding:36px 0 72px;')}>
        <div className="wrap">
          <motion.div
            style={s(
              'background:linear-gradient(135deg,#65A30D,#15803D);border-radius:24px;padding:56px 40px;text-align:center;position:relative;overflow:hidden;',
            )}
            variants={fadeUp}
            {...inViewOnce}
          >
            <div
              style={s(
                'position:absolute;top:-40px;right:-30px;width:200px;height:200px;background:rgba(255,255,255,.08);border-radius:50%;',
              )}
            />
            <div
              style={s(
                'position:absolute;bottom:-60px;left:-20px;width:180px;height:180px;background:rgba(255,255,255,.06);border-radius:50%;',
              )}
            />
            <h2
              style={s(
                'position:relative;font-size:clamp(30px,4vw,46px);font-weight:800;letter-spacing:-0.02em;color:#fff;margin-bottom:14px;',
              )}
            >
              Ready to explore Iloilo?
            </h2>
            <p
              style={s(
                'position:relative;font-size:18px;color:rgba(255,255,255,.9);max-width:520px;margin:0 auto 30px;',
              )}
            >
              Discover local shops, claim exclusive deals, and support Ilonggo
              businesses — all in one app.
            </p>
            <div
              style={s(
                'position:relative;display:flex;flex-wrap:wrap;gap:14px;justify-content:center;margin-bottom:28px;',
              )}
            >
              <a
                href="#"
                className="il-cta-light"
                style={s(
                  'background:#fff;color:var(--brandhover);font-size:16px;font-weight:700;padding:15px 28px;border-radius:12px;',
                )}
              >
                Download the App
              </a>
              <Link
                href={ROUTES.BUSINESS.registration}
                className="il-cta-ghost"
                style={s(
                  'background:transparent;color:#fff;font-size:16px;font-weight:700;padding:15px 28px;border-radius:12px;border:1.5px solid rgba(255,255,255,.6);',
                )}
              >
                Register Your Business
              </Link>
            </div>
            <div
              style={s(
                'position:relative;display:flex;flex-wrap:wrap;gap:12px;justify-content:center;',
              )}
            >
              <div
                style={s(
                  'display:flex;align-items:center;gap:9px;background:rgba(0,0,0,.28);color:#fff;padding:9px 18px;border-radius:11px;',
                )}
              >
                <AppleLogo />
                <div style={s('text-align:left;line-height:1.1;')}>
                  <div style={s('font-size:9px;opacity:.85;')}>
                    Download on the
                  </div>
                  <div style={s('font-size:15px;font-weight:700;')}>
                    App Store
                  </div>
                </div>
              </div>
              <div
                style={s(
                  'display:flex;align-items:center;gap:9px;background:rgba(0,0,0,.28);color:#fff;padding:9px 18px;border-radius:11px;',
                )}
              >
                <GooglePlayLogo />
                <div style={s('text-align:left;line-height:1.1;')}>
                  <div style={s('font-size:9px;opacity:.85;')}>GET IT ON</div>
                  <div style={s('font-size:15px;font-weight:700;')}>
                    Google Play
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
