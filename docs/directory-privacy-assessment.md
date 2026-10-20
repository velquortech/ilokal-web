# Legitimate-interest assessment — the seeded business directory

**Subject:** publishing 1,482 business listings compiled from OpenStreetMap.
**Law:** Republic Act 10173 (Data Privacy Act of 2012) and its IRR.
**Status:** internal assessment. **Not legal advice and not a substitute for
counsel review** — it records our reasoning so that review has something to
start from, and so the position is written down before it is challenged rather
than after.
**Date:** 2026-10-03.

---

## 1. Why a business directory raises the question at all

Most entries are businesses, and a company is not a data subject. But in the
Philippines a great many of these are **sole proprietorships**, where the
registered business name can contain the owner's own name and the trading
address can be their home. "Aling Nena's Carinderia" at a barangay address may
identify a living individual as directly as a name field would.

So the honest position is not "this is business data, the Act does not apply."
It is: some of this is personal data, and we need a lawful basis.

## 2. The basis relied on

**Legitimate interests** — §12(f): processing is necessary for the purposes of
the legitimate interests pursued by the personal information controller, except
where overridden by the data subject's fundamental rights and freedoms.

Not consent. We have not obtained consent from 1,482 proprietors and should not
pretend a claim flow is retrospective consent.

### The three-part test

**(a) Is the interest legitimate?**
Operating a local business discovery directory for Iloilo City. Lawful,
commercially ordinary, and of direct benefit to the listed businesses — the
product exists to send customers to them. It is the same interest any directory,
map or listings publication has relied on.

**(b) Is the processing necessary for it?**
A discovery app cannot function without knowing which businesses exist and
where. The necessity test is about the *minimum* needed, and the data taken is
deliberately that minimum:

| Taken | Why necessary |
|---|---|
| Business name | Without it there is no listing |
| Coordinates | The entire product is proximity search |
| Category tags | Filtering and browsing |
| Coarse address (street / barangay) | Finding the premises |

| Not taken | Why not necessary |
|---|---|
| Phone numbers | Not needed to *discover* a business; a claimed listing can add its own |
| Email addresses | Same |
| Photographs | Copyright, and not needed for discovery |
| Ratings, reviews, descriptions | Other platforms' content; not ours to republish |

This is not a promise in prose. The importer's `KEEP_TAGS` allowlist discards
every other tag before the upstream response is even cached, and `businesses`
has no phone, email or website column at all, so contact data cannot be stored
on a listing even by mistake. **Verified 2026-10-03: zero contact identifiers
across all 1,482 rows.**

**(c) Do the individual's rights override it?**

The factors that weigh in our favour:

- **The data is already public**, and public specifically as trading
  information. A shop sign on a street, and an OSM node describing it, are both
  publication to the world. We are not exposing anything previously private.
- **It is commercial, not intimate.** No special category data under §13 — no
  health, religion, ethnicity, political affiliation, or financial detail.
- **The purpose is one the data subject would expect and generally welcome.** A
  business wants to be findable; that is why it has a sign.
- **Minimisation is enforced in code**, as above.
- **No profiling, no automated decisions, no advertising to the proprietor, no
  enrichment against other sources, no sale of the data.**

The factors that weigh against, and what we do about each:

| Concern | Mitigation |
|---|---|
| The proprietor did not ask to be listed and may not know | Listings are marked unclaimed and the Terms publish a removal route |
| A sole proprietor's name may be their own | Only the trading name as it appears publicly; no separate person record |
| Data may be stale — a closed business still listed | Acknowledged weakness. No periodic re-sync yet; this is the open item most relevant to accuracy (§4) |
| A listing could be mistaken for an endorsed or verified partner | Unclaimed listings are visually distinguished, excluded from the curated Home feed, and ranked below claimed ones. Nothing user-facing calls them "verified" |

**Conclusion:** the balance favours processing, provided the removal route stays
real and the accuracy gap is closed. The assessment should be revisited if we
start enriching listings from additional sources, or if the data is ever
exported or shared outside the product.

## 3. The other principles

**Transparency (§16(a)–(b)).** The Terms of Service §2, *Where our business
listings come from*, names the source, the licence, the fact that a listing may
not have been created by the business, and how to claim or remove it. Shown
in-app and published in `legal/TERMS_OF_SERVICE.md`.

**Proportionality (§11(d)).** Covered by the minimisation above.

**Accuracy (§11(c)).** The weakest point. OSM does not assert a business still
trades, and we do not yet re-sync. A claim corrects a listing at the owner's
initiative, but nothing corrects a listing nobody claims. **Open.**

**Retention (§11(e)).** Listings persist for as long as the directory operates.
Removal is `archived_at`, which keeps the row out of every surface while
preserving the record of what was published and when — appropriate for an
accountability trail, and it should not be mistaken for erasure if a data
subject requests deletion rather than delisting.

**Rights of the data subject (§16(c)–(f)).** Access, correction and objection
are all served by the same route: claim the listing to correct it, or email
support@ilokal.shop to have it removed. Erasure beyond archival is handled
manually on request.

**Security (§20).** No contact identifiers are held, so the breach surface for
this dataset is limited to already-public trading information.

## 4. Open items

1. **Counsel review of this assessment.** It is reasoning, not advice.
2. **A removal flow with a UI**, not only a support email. The email route works
   and is published, but a self-service control is the stronger position and is
   what a regulator would expect to see.
3. **Periodic re-sync against OSM**, to address the accuracy gap in §3.
4. **NPC registration**, if and when iLokal crosses the thresholds in the IRR —
   a separate question from this assessment, flagged here so it is not lost.
5. **Revisit before any bulk export or data-sharing arrangement**, which would
   change the balancing in §2(c) and also raises the ODbL question recorded in
   `directory-provenance.md`.
