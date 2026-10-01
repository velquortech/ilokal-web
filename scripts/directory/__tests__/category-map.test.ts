import { describe, expect, it } from 'vitest';

// The map is plain ESM (`.mjs`) because this repo has no TypeScript script
// runner — `scripts/export-user-emails.mjs` set that precedent. tsc infers the
// exports from the source, so no declaration file is needed.
import * as map from '../category-map.mjs';

const { classify, refineFood, isInstitutional, referencedCategories } = map;

describe('classify', () => {
  it('maps the common OSM keys to Philippine category names', () => {
    expect(classify({ amenity: 'restaurant' }).category).toBe('Restaurant');
    expect(classify({ shop: 'bakery' }).category).toBe('Bakery / Pastry Shop');
    expect(classify({ leisure: 'fitness_centre' }).category).toBe(
      'Fitness Studio / Gym',
    );
    expect(classify({ healthcare: 'laboratory' }).category).toBe(
      'Diagnostic / Medical Laboratory',
    );
    expect(classify({ craft: 'dressmaker' }).category).toBe(
      'Tailoring / Alterations',
    );
  });

  it('reads shop=convenience as a sari-sari store, not a generic convenience store', () => {
    // The whole reason to map to this taxonomy rather than a generic one. This
    // is also the single largest category in the Iloilo extract (~341 records),
    // so getting it wrong would mis-file a fifth of the import.
    expect(classify({ shop: 'convenience' }).category).toBe(
      'Sari-sari / Convenience Store',
    );
  });

  it('reads shop=second_hand as ukay-ukay', () => {
    expect(classify({ shop: 'second_hand' }).category).toBe(
      'Thrift / Ukay-ukay',
    );
  });

  it('files a pharmacy under Retail, where this taxonomy puts it', () => {
    // Pharmacy / Drugstore belongs to Retail here, NOT Health & Wellness — an
    // easy and invisible mis-mapping, since every instinct says otherwise.
    expect(classify({ amenity: 'pharmacy' }).category).toBe(
      'Pharmacy / Drugstore',
    );
    expect(classify({ shop: 'chemist' }).category).toBe('Pharmacy / Drugstore');
  });

  it('prefers amenity over shop when an element carries both', () => {
    const r = classify({ amenity: 'cafe', shop: 'hardware' });
    expect(r.category).toBe('Café');
    expect(r.via).toBe('amenity=cafe');
  });

  it('takes the first known value from a multi-value tag', () => {
    // OSM permits `shop=hardware;paint`.
    const r = classify({ shop: 'hardware;paint' });
    expect(r.category).toBe('Hardware / Construction Supply');
    expect(r.via).toBe('shop=hardware');
  });

  it('maps both spellings of a car-repair workshop', () => {
    // Regression: `amenity=car_repair` was mapped from the start while
    // `shop=car_repair` was missed — 43 records in Iloilo City, silently
    // skipped, because different mappers use different keys for the same shop.
    expect(classify({ amenity: 'car_repair' }).category).toBe(
      'Auto Repair / Mechanic',
    );
    expect(classify({ shop: 'car_repair' }).category).toBe(
      'Auto Repair / Mechanic',
    );
  });

  it('returns null and reports the rejected tag rather than guessing', () => {
    // A wrong category is worse than an absent listing: it makes the filters
    // lie. The `via` string is what makes a coverage gap countable.
    const r = classify({ shop: 'spaceship_parts' });
    expect(r.category).toBeNull();
    expect(r.via).toBe('shop=spaceship_parts');
  });

  it('refuses shop=yes, which means "a shop, unspecified"', () => {
    expect(classify({ shop: 'yes' }).category).toBeNull();
  });

  it('skips institutions and age-restricted trades by omission', () => {
    for (const tags of [
      { amenity: 'school' },
      { amenity: 'university' },
      { amenity: 'hospital' },
      { amenity: 'bank' },
      { shop: 'alcohol' },
      { shop: 'mall' },
    ]) {
      expect(classify(tags).category).toBeNull();
    }
  });

  it('reports untagged elements distinctly', () => {
    expect(classify({ name: 'Just A Name' }).via).toBe('untagged');
  });
});

describe('refineFood', () => {
  it('uses cuisine to reach the categories tags alone cannot', () => {
    expect(refineFood('Restaurant', { cuisine: 'seafood' }).category).toBe(
      'Seafood / Grill House',
    );
    expect(refineFood('Restaurant', { cuisine: 'barbecue' }).category).toBe(
      'Seafood / Grill House',
    );
    expect(refineFood('Fast Food', { cuisine: 'donut' }).category).toBe(
      'Bakery / Pastry Shop',
    );
  });

  it('recognises bachoy — the Iloilo dish — as a casual eatery', () => {
    // La Paz batchoy is the signature local dish and appears as a real
    // `cuisine` value in the extract. A batchoy house is an eatery, not a
    // restaurant in the sit-down sense.
    expect(refineFood('Restaurant', { cuisine: 'bachoy' }).category).toBe(
      'Carinderia / Eatery',
    );
    expect(refineFood('Restaurant', { cuisine: 'batchoy' }).category).toBe(
      'Carinderia / Eatery',
    );
  });

  it('does NOT refine on cuisine=regional', () => {
    // The most common cuisine value in the extract (80 hits) and the most
    // dangerous: OSM's catch-all could equally mean a carinderia or fine
    // dining. Guessing it would mis-file at scale.
    const r = refineFood('Restaurant', { cuisine: 'regional' });
    expect(r.category).toBe('Restaurant');
    expect(r.refinedBy).toBeNull();
  });

  it('falls back to narrow name hints when cuisine is absent', () => {
    expect(refineFood('Restaurant', { name: 'Lechon Haus' }).category).toBe(
      'Roast / Lechon House',
    );
    expect(
      refineFood('Restaurant', { name: "Tatoy's Manokan and Seafoods" })
        .category,
    ).toBe('Seafood / Grill House');
    expect(
      refineFood('Restaurant', { name: 'Samurai Talabahan' }).category,
    ).toBe('Seafood / Grill House');
    expect(refineFood('Restaurant', { name: "Mackie's Eatery" }).category).toBe(
      'Carinderia / Eatery',
    );
  });

  it('prefers the structured cuisine tag over a name hint', () => {
    const r = refineFood('Restaurant', {
      cuisine: 'seafood',
      name: 'Lechon Haus',
    });
    expect(r.category).toBe('Seafood / Grill House');
    expect(r.refinedBy).toBe('cuisine=seafood');
  });

  it('refines a videoke bar, which OSM tags as a plain bar', () => {
    // Regression: the karaoke hint was dead code. Both KTVs in the extract are
    // `amenity=bar` → 'Bar / Pub', which was not in the refinable set, so the
    // pattern could never fire.
    expect(refineFood('Bar / Pub', { name: 'Family KTV' }).category).toBe(
      'Karaoke / Videoke Bar',
    );
  });

  it('leaves an already-specific category alone', () => {
    // Refinement only ever widens generic → specific. A record classified
    // specifically must never be second-guessed by a name pattern.
    const r = refineFood('Sari-sari / Convenience Store', {
      name: 'Nena Grill Store',
    });
    expect(r.category).toBe('Sari-sari / Convenience Store');
    expect(r.refinedBy).toBeNull();
  });

  it('returns the input untouched when nothing applies', () => {
    const r = refineFood('Restaurant', { name: 'Plain Diner' });
    expect(r.category).toBe('Restaurant');
    expect(r.refinedBy).toBeNull();
  });
});

describe('isInstitutional', () => {
  it('catches civic facilities that OSM tags like businesses', () => {
    // A barangay covered court is `leisure=sports_centre`; a school canteen is
    // `amenity=fast_food`. The tag cannot separate them, only the name can.
    for (const name of [
      'San Juan Elementary School',
      'Iloilo Integrated School',
      'Jaro National High School',
      'Barangay Hall',
      'Imperial Homes III Gym Covered Court',
      'Iloilo City Hall',
      'Pavia Public Market',
      'Elementary Canteen',
    ]) {
      expect(isInstitutional(name), name).toBe(true);
    }
  });

  it('does NOT catch businesses whose names merely sound civic', () => {
    // Regression: a looser first version matched "Barangay Inasal", a real
    // restaurant. Every pattern must require a civic NOUN, not just a
    // civic-sounding word.
    for (const name of [
      'Barangay Inasal',
      'Public House Coffee',
      'School of Rock Music Studio',
      'City Grill',
      'Hall of Beauty Salon',
    ]) {
      expect(isInstitutional(name), name).toBe(false);
    }
  });
});

describe('referencedCategories', () => {
  it('includes refinement targets, not just the tag tables', () => {
    // The importer validates these against the DB at startup and hard-fails on
    // an unknown name. If refinement targets were omitted, a typo in CUISINE or
    // NAME_HINTS would slip past that check and only surface as a failed insert
    // partway through a run.
    const names: string[] = referencedCategories();
    for (const target of [
      'Seafood / Grill House',
      'Roast / Lechon House',
      'Karaoke / Videoke Bar',
      'Carinderia / Eatery',
    ]) {
      expect(names).toContain(target);
    }
  });

  it('returns a sorted, deduplicated list', () => {
    const names: string[] = referencedCategories();
    expect(names).toEqual([...new Set(names)].sort());
    expect(names.length).toBeGreaterThan(60);
  });
});
