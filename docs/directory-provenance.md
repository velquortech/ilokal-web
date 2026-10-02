# Where the seeded business directory came from, and why we may use it

**Status:** authoritative record for the Iloilo City directory import.
**Last verified:** 2026-10-03 against the live database.

iLokal shipped open beta with a directory it did not collect from owners. This
document records what that data is, where it came from, the licence it carries,
and the reasoning for believing our use of it is lawful. It exists so the
question can be answered without reconstructing the import from the scripts.

The short version: **no business in this directory has been verified by iLokal,
and none of it is DTI-checked.** It is open map data about where shops are. The
whole design follows from being honest about that.

---

## 1. What the directory actually is

| | Count |
|---|---|
| Admin-seeded listings (`source = 'osm'`) | 1,482 |
| Owner-registered listings (`source = 'owner'`) | 21 |

Every seeded row is stamped `origin = 'admin'`, `source = 'osm'`,
`source_license = 'ODbL'`, and `source_ref` = the OpenStreetMap element id it
came from (`node/625522978`).

**Two columns, two questions.** `origin` answers *who listed this* —
`owner` (the business registered itself) or `admin` (we created it). `source`
answers *where the data came from* — `owner`, `osm`, `foursquare`, `manual`.
They were one column until migration `20261003000000`, which was a latent bug:
every "is this ours?" predicate was written as `source = 'owner'`, correct only
while every non-owner source happened to be admin-created. Adding one data feed
— Mapillary, a BPLO dataset, a partner — would have silently reclassified all
1,482 listings as owner-claimed, with no error to notice it by. Use `origin`
for the party question, always.
That reference is not decoration: it is the key that makes a takedown or an
upstream correction actionable on a single row.

### What we took

Only facts, and only these:

- the business **name**
- its **coordinates** (one branch pin per listing)
- enough tags to **classify** it into our category tree — `amenity`, `shop`,
  `leisure`, `healthcare`, `craft`, `cuisine`
- a coarse **address** — `addr:street`, `addr:suburb`, `addr:village`,
  `addr:neighbourhood`
- `brand` / `brand:wikidata`, used only to detect and exclude chains

The importer enforces this with a `KEEP_TAGS` allowlist
(`scripts/import-directory.mjs`); everything else in the upstream element is
discarded before the response is even cached.

### What we deliberately did not take

| Not imported | Why |
|---|---|
| Photographs, logos, banners | Copyright belongs to whoever took the picture, never to the platform hosting it |
| Ratings and review text | Copyrightable expression owned by its authors; also misleading if attributed to us |
| Written descriptions | Same |
| Phone numbers and email addresses | Personal data under RA 10173 with no lawful basis and no operational need |

The first row is enforced in the schema, not by convention. Migration
`20261001000000_business_provenance.sql` carries:

```sql
ALTER TABLE public.businesses
  ADD CONSTRAINT businesses_admin_listed_no_images CHECK (
    origin = 'owner'
    OR (logo_url IS NULL AND banner_url IS NULL
        AND (interior_images IS NULL OR cardinality(interior_images) = 0))
  );
```

A listing we created physically cannot hold an image. If someone later writes an
import that tries, the database refuses it.

Note the constraint keys on `origin`, not `source` — deliberately. The rule is
about who made the row, so a future admin import using some new source is still
caught. The practical consequence: **an importer must set `origin` explicitly**,
because the column defaults to `'owner'` and owner rows are exempt. The SQL test
suite covers exactly that case.

**Verified 2026-10-03:** 0 seeded rows with any image, 0 with a description,
0 ratings attached to a seeded business, 0 branch phone numbers. (`businesses`
has no phone/email/website columns at all, so that class of leak is structurally
impossible on the business row.)

---

## 2. The source and its licence

**OpenStreetMap**, queried through the Overpass API, clipped to the Iloilo City
administrative area.

OSM data is published under the **Open Database License 1.0 (ODbL)**. Three
obligations follow, and all three are met:

**Attribution.** We must credit "© OpenStreetMap contributors". This appears in
the app's Terms under *Where our business listings come from*
(`constants/legal.ts`, mirrored in `legal/TERMS_OF_SERVICE.md`), naming both the
source and the licence.

**Share-alike on derived databases.** ODbL's copyleft attaches to a *derived
database*. Our listings table mixes ODbL facts with owner-contributed content,
which makes it a **collective database** rather than a derived one — the ODbL's
own community guideline on collective databases is the basis for that reading.
Either way, `source`/`source_ref` keep the ODbL-origin rows individually
identifiable, so if we ever have to produce or relicense that subset we can
isolate it with one query. **This is the obligation most worth re-checking with
counsel before any bulk export or data-sharing deal.**

**No DRM / no additional restriction** on the ODbL portion. Nothing in the
product restricts the underlying facts.

### Why not Google Maps

This was the original request, and it was declined on three independent grounds,
any one of which is sufficient:

1. The Google Maps Platform Terms prohibit scraping and prohibit creating a
   derived dataset from Places content.
2. Place photographs belong to the contributors who took them, not to Google —
   so even the paid Places API does not grant the right to store and re-publish
   them in our product.
3. Ratings and reviews are their authors' copyrightable expression.

No Google-derived data is in this directory by any route. Facts about where a
shop is are not themselves protected by copyright — but the *compilation* and
the contributed media are, which is what makes the source choice matter rather
than the facts.

---

## 3. Philippine law as it applies here

**RA 8293 (Intellectual Property Code).** Factual information — a business
exists, it is at these coordinates, it is a bakery — is not copyrightable.
Photographs, review text and descriptions are. We took only the first category.

**RA 10173 (Data Privacy Act).** A sole proprietorship's business name can also
be its owner's name, so a commercial listing is not automatically free of
personal data. Our position is that publishing a shop's name, type and public
trading location is processing for a **legitimate interest** — operating a local
business directory — and is proportionate because the data is already public,
is minimised to what a directory needs, and excludes every contact identifier.

Two things make that position defensible rather than merely asserted:

- **Minimisation is enforced in code**, not promised in prose — the `KEEP_TAGS`
  allowlist strips contact tags before caching, and the schema check blocks
  images.
- **A removal route exists and is published.** The Terms tell an owner they can
  claim a listing *or ask for it to be taken down*, via support@ilokal.shop.

Still outstanding, and tracked as a follow-up rather than done: a written
legitimate-interest assessment, and a removal flow with a UI rather than only an
email address.

---

## 4. How the listings are presented

The presentation is part of the legal posture, not separate from it.

- A seeded listing is **marked unclaimed** in the UI. Claimed businesses carry a
  seal; the 1,482 unclaimed ones do not. Rendering seeded data as though an
  owner put it there would misrepresent a relationship we do not have, and is
  the weaker position if an owner objects.
- Seeded listings are **excluded from the Home "nearby" feed**, which shows
  claimed businesses only.
- In Explore, claimed businesses **sort first in every filter**.
- All 1,482 are held by a single placeholder owner account, so no real person is
  recorded as owning a business they never registered.

### A naming problem worth knowing about

`businesses.status = 'verified'` on all 1,503 rows. **It does not mean verified.**
It is the visibility gate — the RPC, the RLS policy and the detail route all
require it — and the importer sets it for that reason alone. The column name
promises an audit that has not happened, for seeded and owner-registered rows
alike (`auto_verify_businesses = true` and `require_business_documents = false`,
so even owner registration is self-asserted today).

Nothing user-facing says "verified". Keep it that way until claims are
document-reviewed by an admin, which is the point at which the word would become
true.

---

## 5. Re-running, correcting, removing

The importer is `scripts/import-directory.mjs`; the OSM-tag → category mapping
is `scripts/directory/category-map.mjs`.

```bash
node scripts/import-directory.mjs --dry-run          # no writes
node scripts/import-directory.mjs --limit 50         # bounded trial
node scripts/import-directory.mjs                    # full run (idempotent)
```

Idempotency is by `source_ref`: a partial unique index
(`businesses_source_ref_key`) makes a re-run insert nothing it already has, and
branch pins derive a deterministic uuid from `${ref}:branch` so a second run
cannot double them. A verified re-run adds 0 rows.

**To remove one listing** (owner objection, or an upstream OSM deletion):

```sql
UPDATE public.businesses SET archived_at = NOW() WHERE source_ref = 'node/625522978';
```

Archive rather than delete — it keeps the row out of every feed while preserving
the audit trail of what we published and when.

**On claim approval, `source` and `source_ref` are retained.** They are the
provenance record and the ODbL takedown key; they are not a flag to clear once a
listing becomes owner-managed. Pinned by
`supabase/tests/business_provenance.test.sql`.

### Upstream currency

OSM does not assert a business still trades. A shop that closed last year may
still be a node. We do not re-sync on a schedule yet — a periodic refresh
against `source_ref` is a known follow-up, and until it exists, staleness is the
directory's main quality weakness.

---

## 6. Open items

- Periodic re-sync against OSM so closed businesses age out.
- A written RA 10173 legitimate-interest assessment.
- A removal flow with a UI, not only the support email.
- Counsel review of the collective-vs-derived database reading in §2, before any
  bulk export.
- Real photographs: either owner uploads through the claim flow, or Mapillary
  (CC-BY-SA, needs an API token). Never third-party platform media.
