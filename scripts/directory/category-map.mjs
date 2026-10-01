/**
 * OpenStreetMap tag → `public.business_categories.name`.
 *
 * This is the file to edit when the importer misfiles something. It is kept
 * separate from `scripts/import-directory.mjs` precisely because it is the part
 * that needs human judgement and will be revised; the importer around it should
 * not have to change when a mapping does.
 *
 * ── Why map to a CATEGORY, not a vertical ───────────────────────────────────
 * `businesses.category_id` is the real FK. `business_type_id` is denormalised
 * and kept in sync by the `trg_businesses_sync_business_type` trigger
 * (migration 20260727000000), so setting the category is sufficient — and
 * setting the vertical directly would risk disagreeing with it.
 *
 * ── Rules this file obeys ───────────────────────────────────────────────────
 * 1. **Never guess.** A tag with no entry here is SKIPPED and counted, not
 *    filed under "General". A wrong category is worse than an absent listing:
 *    it makes the filters lie.
 * 2. **Values are exact category names** as they exist in the database. The
 *    importer resolves them to ids at startup and hard-fails on any name it
 *    cannot find, so a taxonomy rename breaks the run loudly instead of
 *    quietly importing nothing.
 * 3. **The taxonomy is Philippine-specific and that is the point.** OSM's
 *    `shop=convenience` is a sari-sari store here; `shop=second_hand` is an
 *    ukay-ukay. Mapping to the generic reading would throw away exactly what
 *    makes the directory feel local.
 *
 * Verified against the live taxonomy on 2026-10-01: 8 active verticals, 90
 * categories, after migrations 20260826000000 + 20260827000000.
 */

/** `amenity=*` → category name. */
export const AMENITY = {
  // Food & Beverage
  restaurant: 'Restaurant',
  cafe: 'Café',
  fast_food: 'Fast Food',
  food_court: 'Fast Food',
  bar: 'Bar / Pub',
  pub: 'Bar / Pub',
  biergarten: 'Bar / Pub',
  ice_cream: 'Dessert / Ice Cream Parlor',
  bakery: 'Bakery / Pastry Shop',
  // Pharmacy lives under RETAIL in this taxonomy, not Health & Wellness.
  pharmacy: 'Pharmacy / Drugstore',
  // Health & Wellness
  clinic: 'Medical / Dental Clinic',
  doctors: 'Medical / Dental Clinic',
  dentist: 'Dental Clinic / Orthodontist',
  veterinary: 'Veterinary Clinic',
  // Services
  car_repair: 'Auto Repair / Mechanic',
  car_wash: 'Car Wash / Detailing',
  internet_cafe: 'Computer / Internet Shop',
  // Entertainment & Events
  cinema: 'Cinema / Theater',
  theatre: 'Cinema / Theater',
  events_venue: 'Event Venue / Function Hall',
  // Education & Learning
  driving_school: 'Driving School',
  language_school: 'Language / Enrichment Classes',
  music_school: 'Music / Arts School',
  kindergarten: 'Daycare / Preschool',

  // ── Deliberately absent, with reasons ────────────────────────────────────
  // school             — overwhelmingly public elementary/high schools in the
  //                      Iloilo extract (149 of 188 Education hits). Not
  //                      businesses a consumer directory should list.
  // college/university — institutions, not local businesses; no good category.
  // hospital           — same, and a hospital listed beside a carinderia reads
  //                      wrong in a discovery feed.
  // bank               — no banking category exists, and nearly every branch in
  //                      the extract is a chain we exclude anyway.
  // nightclub          — the nearest category is 'Karaoke / Videoke Bar', which
  //                      is a different thing. Left for manual review.
  // marketplace        — a public market is a place, not a business; its stalls
  //                      are the businesses, and OSM does not model them.
};

/** `shop=*` → category name. */
export const SHOP = {
  // ── Food & Beverage ──────────────────────────────────────────────────────
  bakery: 'Bakery / Pastry Shop',
  pastry: 'Bakery / Pastry Shop',
  confectionery: 'Bakery / Pastry Shop',
  ice_cream: 'Dessert / Ice Cream Parlor',
  chocolate: 'Dessert / Ice Cream Parlor',
  coffee: 'Café',
  tea: 'Milk Tea / Refreshments',
  bubble_tea: 'Milk Tea / Refreshments',
  beverages: 'Milk Tea / Refreshments',
  deli: 'Carinderia / Eatery',
  caterer: 'Catering Service',
  // `convenience` is a sari-sari store in this market — the local reading is
  // the correct one, not a generic "convenience store".
  convenience: 'Sari-sari / Convenience Store',

  // ── Retail ───────────────────────────────────────────────────────────────
  supermarket: 'General',
  greengrocer: 'Fruit / Vegetable Stand',
  farm: 'Fruit / Vegetable Stand',
  rice: 'Rice / Grains Dealer',
  water: 'Water Refilling Station',
  agrarian: 'Agrivet / Farm Supply',
  pet: 'Pet Shop',
  clothes: 'Clothing / Apparel',
  boutique: 'Clothing / Apparel',
  fashion: 'Clothing / Apparel',
  shoes: 'Bags / Footwear',
  bag: 'Bags / Footwear',
  leather: 'Bags / Footwear',
  jewelry: 'Jewelry / Accessories',
  watches: 'Jewelry / Accessories',
  fashion_accessories: 'Jewelry / Accessories',
  // `second_hand` is ukay-ukay here — a whole retail culture, not a generic
  // thrift shop.
  second_hand: 'Thrift / Ukay-ukay',
  charity: 'Thrift / Ukay-ukay',
  mobile_phone: 'Cellphone / Load Store',
  electronics: 'Electronics / Gadgets',
  computer: 'Electronics / Gadgets',
  hifi: 'Electronics / Gadgets',
  books: 'Bookstore / Stationery',
  stationery: 'Bookstore / Stationery',
  newsagent: 'Bookstore / Stationery',
  toys: 'Toys / Hobbies',
  games: 'Toys / Hobbies',
  model: 'Toys / Hobbies',
  music: 'Toys / Hobbies',
  musical_instrument: 'Toys / Hobbies',
  baby_goods: 'Baby / Kids Store',
  cosmetics: 'Beauty / Cosmetics',
  perfumery: 'Beauty / Cosmetics',
  chemist: 'Pharmacy / Drugstore',
  optician: 'Optical / Eyewear',
  gift: 'Gift / Specialty Shop',
  souvenir: 'Souvenir / Pasalubong / Handicrafts',
  craft: 'Souvenir / Pasalubong / Handicrafts',
  art: 'Souvenir / Pasalubong / Handicrafts',
  florist: 'Plants / Garden / Flower Shop',
  garden_centre: 'Plants / Garden / Flower Shop',
  hardware: 'Hardware / Construction Supply',
  doityourself: 'Hardware / Construction Supply',
  building_materials: 'Hardware / Construction Supply',
  trade: 'Hardware / Construction Supply',
  paint: 'Hardware / Construction Supply',
  tiles: 'Hardware / Construction Supply',
  furniture: 'Furniture / Home Goods',
  houseware: 'Furniture / Home Goods',
  interior_decoration: 'Furniture / Home Goods',
  kitchen: 'Furniture / Home Goods',
  bed: 'Furniture / Home Goods',
  curtain: 'Furniture / Home Goods',
  appliance: 'Furniture / Home Goods',
  electrical: 'Plumbing / Electrical Services',
  // Mappers use both spellings for the same workshop; `amenity=car_repair` was
  // mapped from the start and this one was an oversight worth 43 records.
  car_repair: 'Auto Repair / Mechanic',
  car_parts: 'Auto Supply / Motor Parts',
  motorcycle_parts: 'Auto Supply / Motor Parts',
  tyres: 'Auto Supply / Motor Parts',
  bicycle: 'Bike Shop',

  // ── Sports & Recreation ──────────────────────────────────────────────────
  sports: 'Sports / Outdoor Shop',
  outdoor: 'Sports / Outdoor Shop',
  fishing: 'Sports / Outdoor Shop',

  // ── Services ─────────────────────────────────────────────────────────────
  hairdresser: 'Salon / Barbershop',
  barber: 'Salon / Barbershop',
  // OSM `shop=beauty` is a beauty *salon* (a service), distinct from
  // `shop=cosmetics`, which sells product.
  beauty: 'Salon / Barbershop',
  nails: 'Nail / Lash Studio',
  massage: 'Massage / Reflexology',
  tattoo: 'Tattoo / Piercing Studio',
  laundry: 'Laundry / Dry Cleaning',
  dry_cleaning: 'Laundry / Dry Cleaning',
  tailor: 'Tailoring / Alterations',
  sewing: 'Tailoring / Alterations',
  fabric: 'Tailoring / Alterations',
  copyshop: 'Printing / Photocopy / Signage',
  printer: 'Printing / Photocopy / Signage',
  printing: 'Printing / Photocopy / Signage',
  sign_maker: 'Printing / Photocopy / Signage',
  pawnbroker: 'Pawnshop / Remittance',
  money_lender: 'Pawnshop / Remittance',
  money_transfer: 'Pawnshop / Remittance',
  photo: 'Photography / Videography',
  photo_studio: 'Photography / Videography',
  photographer: 'Photography / Videography',
  repair: 'Repair Services',
  shoe_repair: 'Repair Services',
  locksmith: 'Repair Services',
  watchmaker: 'Repair Services',
  electronics_repair: 'Repair Services',
  rental: 'Rentals',
  hvac: 'Aircon Repair / Installation',
  cleaning: 'Cleaning / Janitorial',
  pest_control: 'Pest Control Service',
  pet_grooming: 'Pet Grooming',

  // ── Deliberately absent ──────────────────────────────────────────────────
  // yes                   — `shop=yes` means "a shop, unspecified". Filing it
  //                         under Retail/General puts an unknown business into
  //                         a filter the user trusts. Skipped on purpose.
  // alcohol, tobacco,
  // e-cigarette           — age-restricted; a seeded, unverified listing for
  //                         these is a product decision, not an import default.
  // car                   — dealerships are chains or large operations, not the
  //                         local-discovery audience.
  // funeral_directors,
  // travel_agency,
  // estate_agent,
  // insurance             — no fitting category; 'Services :: General' would be
  //                         a guess. Left for manual entry.
  // department_store, mall,
  // variety_store,
  // wholesale, kiosk,
  // general               — ambiguous scale (a mall is not a shop), and the big
  //                         ones in the extract are chains we exclude.
};

/** `leisure=*` → category name. */
export const LEISURE = {
  fitness_centre: 'Fitness Studio / Gym',
  sports_centre: 'Sports Court / Facility Rental',
  bowling_alley: 'Billiards / Recreation Hall',
  amusement_arcade: 'Game Center / Arcade',
  spa: 'Spa / Wellness Center',
  // pitch/park/playground absent: mostly barangay courts and public space.
};

/** `healthcare=*` → category name. Finer-grained than `amenity` for clinics. */
export const HEALTHCARE = {
  laboratory: 'Diagnostic / Medical Laboratory',
  physiotherapist: 'Physical Therapy / Rehabilitation',
  psychotherapist: 'Mental Health / Counseling',
  dentist: 'Dental Clinic / Orthodontist',
  doctor: 'Medical / Dental Clinic',
};

/** `craft=*` → category name. Small makers; OSM files these outside `shop`. */
export const CRAFT = {
  tailor: 'Tailoring / Alterations',
  dressmaker: 'Tailoring / Alterations',
  shoemaker: 'Repair Services',
  electrician: 'Plumbing / Electrical Services',
  plumber: 'Plumbing / Electrical Services',
  hvac: 'Aircon Repair / Installation',
  carpenter: 'General Contractor / Renovation',
  builder: 'General Contractor / Renovation',
  painter: 'General Contractor / Renovation',
  gardener: 'Landscaping / Lawn Care',
  photographer: 'Photography / Videography',
  caterer: 'Catering Service',
  bakery: 'Bakery / Pastry Shop',
  brewery: 'Bar / Pub',
  jeweller: 'Jewelry / Accessories',
  upholsterer: 'Furniture / Home Goods',
  signmaker: 'Printing / Photocopy / Signage',
};

/** Checked in order; the first table with a hit wins. */
const TABLES = [
  ['amenity', AMENITY],
  ['shop', SHOP],
  ['leisure', LEISURE],
  ['healthcare', HEALTHCARE],
  ['craft', CRAFT],
];

// ─── Food refinement ────────────────────────────────────────────────────────
// `amenity=restaurant` alone cannot reach the categories that make this
// taxonomy local — 'Roast / Lechon House', 'Seafood / Grill House',
// 'Carinderia / Eatery'. OSM carries that detail in `cuisine=*` on about 15% of
// the Iloilo records, so refine with it where present.
//
// Two safety rules, because a wrong refinement is worse than a generic one:
//   - Only ever refines a GENERIC food category (below) into a specific one.
//     A record already classified specifically is left alone.
//   - Never crosses verticals. Refinement stays inside Food & Beverage.

/**
 * The only categories refinement is allowed to replace — the broad buckets.
 *
 * 'Bar / Pub' is included deliberately: a videoke bar is tagged `amenity=bar`
 * in OSM, so without it the karaoke hint below could never fire. A bar whose
 * name contains "KTV"/"videoke"/"karaoke" is unambiguously the local category,
 * not a pub.
 */
const GENERIC_FOOD = new Set(['Restaurant', 'Fast Food', 'General', 'Bar / Pub']);

/** `cuisine=*` → a more specific Food category. Structured, so trusted first. */
const CUISINE = {
  seafood: 'Seafood / Grill House',
  fish: 'Seafood / Grill House',
  barbecue: 'Seafood / Grill House',
  bbq: 'Seafood / Grill House',
  grill: 'Seafood / Grill House',
  // La Paz batchoy — the Iloilo dish. A batchoy house is a casual eatery, so
  // 'Carinderia / Eatery' is the honest fit rather than 'Restaurant'.
  bachoy: 'Carinderia / Eatery',
  batchoy: 'Carinderia / Eatery',
  filipino: 'Carinderia / Eatery',
  coffee_shop: 'Café',
  cafe: 'Café',
  bubble_tea: 'Milk Tea / Refreshments',
  tea: 'Milk Tea / Refreshments',
  juice: 'Milk Tea / Refreshments',
  donut: 'Bakery / Pastry Shop',
  bakery: 'Bakery / Pastry Shop',
  cake: 'Bakery / Pastry Shop',
  pastry: 'Bakery / Pastry Shop',
  dessert: 'Dessert / Ice Cream Parlor',
  ice_cream: 'Dessert / Ice Cream Parlor',
  // `cuisine=regional` is NOT mapped. It is OSM's catch-all (80 hits here, the
  // single most common value) and could equally mean a carinderia or a
  // fine-dining restaurant. Guessing it would misfile at scale.
};

/**
 * Narrow name hints, applied only when `cuisine` gave nothing. Each pattern
 * needs a dish or venue noun that is unambiguous in this market — "Lechon
 * Haus", "Samurai Talabahan", "Mackie's Eatery". Deliberately short: a loose
 * pattern here silently misfiles real businesses, and the tag data is the
 * trustworthy source.
 */
const NAME_HINTS = [
  // Lechon first: an explicit "lechon" is a stronger signal than a generic
  // grill word, so a "Lechon Grill House" should read as lechon.
  //
  // `manokan` is deliberately NOT here. It means a chicken place — inasal
  // grilled over coals — which is a grill house, not a lechon specialist
  // (lechon being spit-roasted pig). It appeared in both patterns in the first
  // version, and because this one is checked first, "Tatoy's Manokan and
  // Seafoods" came out as a lechon house. Caught by the unit test.
  [/\blechon\b|\blechonan\b|\broast(ed)?\s+(chicken|pig|pork)\b/i, 'Roast / Lechon House'],
  [/\btalaba(han)?\b|\bsugba(han)?\b|\bihaw(an)?\b|\bseafood(s)?\b|\bgrill(e|house)?\b|\bmanok\s*an\b|\binasal\b/i, 'Seafood / Grill House'],
  [/\bcarinderia\b|\beatery\b|\bkitchenette\b|\bturo[\s-]*turo\b|\bbatchoy\b|\bbachoy\b/i, 'Carinderia / Eatery'],
  [/\b(karaoke|videoke|ktv)\b/i, 'Karaoke / Videoke Bar'],
];

/**
 * Refine a generic Food classification using `cuisine`, then a narrow name
 * hint. Returns the original category unchanged when nothing applies.
 */
export function refineFood(category, tags) {
  if (!GENERIC_FOOD.has(category)) return { category, refinedBy: null };

  const cuisine = tags.cuisine;
  if (cuisine) {
    for (const part of String(cuisine).split(';')) {
      const hit = CUISINE[part.trim().toLowerCase()];
      if (hit) return { category: hit, refinedBy: `cuisine=${part.trim()}` };
    }
  }

  const name = tags.name || '';
  for (const [re, hit] of NAME_HINTS) {
    if (re.test(name)) return { category: hit, refinedBy: 'name' };
  }

  return { category, refinedBy: null };
}

/**
 * Names that read as a public institution or civic facility rather than a
 * business. OSM tags these identically to shops, so the tag alone cannot
 * separate them — a barangay covered court is `leisure=sports_centre`, and a
 * school canteen is `amenity=fast_food`.
 *
 * Kept deliberately narrow: an earlier, looser version matched "Barangay
 * Inasal", a perfectly real restaurant whose name merely begins with
 * "Barangay". Every pattern below therefore requires a civic *noun*, not just a
 * civic-sounding word.
 */
const INSTITUTIONAL = [
  /\b(elementary|integrated)\s+school\b/i,
  /\bnational\s+high\s+school\b/i,
  /\b(barangay|brgy\.?)\s+(hall|covered\s+court|gym|health\s+(?:center|centre)|plaza)\b/i,
  /\bcovered\s+court\b/i,
  /\bcity\s+hall\b/i,
  /\b(public|municipal)\s+(market|cemetery|library)\b/i,
  /\bday\s*care\s+center\b/i,
  /\b(?:elementary|school)\s+canteen\b/i,
];

/** True when the name reads as a civic facility rather than a business. */
export function isInstitutional(name) {
  return INSTITUTIONAL.some((re) => re.test(name));
}

/**
 * Resolve an OSM element's tags to a category name.
 *
 * Returns `{ category, via }` on a hit, or `{ category: null, via }` where
 * `via` is the `key=value` that was rejected — the importer counts these, so a
 * coverage gap stays visible instead of silently shrinking the import.
 */
export function classify(tags) {
  for (const [key, table] of TABLES) {
    const value = tags[key];
    if (!value) continue;
    // OSM allows multi-values: `shop=hardware;paint`. Take the first known one.
    for (const part of String(value).split(';')) {
      const hit = table[part.trim()];
      if (hit) return { category: hit, via: `${key}=${part.trim()}` };
    }
    return { category: null, via: `${key}=${value}` };
  }
  return { category: null, via: 'untagged' };
}

/** Every category name this file can emit — validated against the DB at start. */
export function referencedCategories() {
  const names = new Set();
  for (const [, table] of TABLES) {
    for (const v of Object.values(table)) names.add(v);
  }
  // Refinement targets too — otherwise a typo in CUISINE or NAME_HINTS would
  // slip past the importer's startup validation and only surface as a failed
  // insert mid-run.
  for (const v of Object.values(CUISINE)) names.add(v);
  for (const [, v] of NAME_HINTS) names.add(v);
  return [...names].sort();
}
