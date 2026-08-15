/**
 * Owner-facing copy — the §8.1 first-30 inventory, as a typed map.
 *
 * Every English string here is pulled VERBATIM from the code (spec §8.1);
 * the Filipino column is a PROPOSAL pending native-speaker review (§8.3) and
 * must not ship as the active locale until that gate passes. The pattern is
 * the point: a typed `Record<Locale, OwnerCopy>` with a provider defaulting
 * to `en` — deliberately NO i18n framework (stack frozen), per §8.1.
 *
 * NOT translated (spec §8.1 rule 4): DB-stored status values
 * (`draft`/`published`), codes, the brand, product names; "coupon" and
 * "promo" stay as loanwords (standard Taglish); "deal" → "promo".
 *
 * Key names encode the string's surface (step/field/button/note/…), so a
 * key can be wired into its UI literal without a lookup table. When a
 * surface is wired, the literal becomes `useOwnerCopy().<key>` — never a
 * second copy of the text.
 *
 * Keyed by the spec's §8.1 row number in the trailing comment of each group.
 */
export type Locale = 'en' | 'fil';

export interface OwnerCopy {
  // ── Registration wizard — step titles & descriptions (§8.1 #1–9) ──
  stepCategoryTitle: string;
  stepCategoryDescription: string;
  stepInformationTitle: string;
  stepInformationDescription: string;
  stepOfferingsTitle: string;
  stepOfferingsDescription: string;
  stepDealTitle: string;
  stepDealDescription: string;
  stepReviewTitle: string;

  // ── Registration wizard — Shop Information step (§8.1 #10–13) ──
  fieldShopName: string;
  fieldCityMunicipality: string;
  buttonUseMyLocation: string;
  noteAddressVerification: string;

  // ── Registration wizard — Deal step (§8.1 #14–15) ──
  checkboxPublishWhenLive: string;
  helperPublishAsDraft: string;

  // ── Coupon / deal dialog (§8.1 #16–25) ──
  dialogAddCouponTitle: string;
  dialogAddCouponDescription: string;
  visibilityDraft: string;
  visibilityPublished: string;
  scopeAppliesTo: string;
  scopeAllProducts: string;
  limitsMaxTotalUses: string;
  dateStartDate: string;
  validationCodeRequired: string;
  validationGreaterThanZero: string;

  // ── Dashboard & onboarding (§8.1 #26–30) ──
  checklistFinishSetupTitle: string;
  checklistWelcomeTitle: string;
  pendingBannerTitle: string;
  pendingBannerDetail: string;
  gateAnalyticsUnlock: string;
}

export const OWNER_COPY: Record<Locale, OwnerCopy> = {
  en: {
    // #1–9
    stepCategoryTitle: 'Business Category',
    stepCategoryDescription:
      'Select the category that best describes your business.',
    stepInformationTitle: 'Shop Information',
    stepInformationDescription: 'Provide basic details about your shop.',
    stepOfferingsTitle: 'What You Offer',
    stepOfferingsDescription:
      'Add at least one item so your shop page is not empty on day one.',
    stepDealTitle: 'A Launch Deal',
    stepDealDescription:
      'Optional. Give shoppers a reason to walk in — you can skip this.',
    stepReviewTitle: 'Review & Submit',

    // #10–13
    fieldShopName: 'Shop Name',
    fieldCityMunicipality: 'City/Municipality',
    buttonUseMyLocation: 'Use My Location',
    noteAddressVerification:
      "Note: This address will be used for verification purposes and may be displayed to customers. Please ensure it's accurate.",

    // #14–15
    checkboxPublishWhenLive: 'Make it live as soon as my shop is',
    helperPublishAsDraft:
      'Leave this unticked and the deal is saved as a draft — nobody can redeem it until you publish it from your dashboard.',

    // #16–25
    dialogAddCouponTitle: 'Add Coupon or Deal',
    dialogAddCouponDescription:
      'Create a discount coupon or a featured deal for your customers',
    visibilityDraft: 'Draft — Only you can see this',
    visibilityPublished: 'Published — Visible to customers',
    scopeAppliesTo: 'Applies To',
    scopeAllProducts: 'All products',
    limitsMaxTotalUses: 'Max Total Uses (Optional)',
    dateStartDate: 'Start Date',
    validationCodeRequired: 'Code is required',
    validationGreaterThanZero: 'Must be greater than 0',

    // #26–30
    checklistFinishSetupTitle: 'Finish setting up your shop',
    checklistWelcomeTitle: "Your shop is registered — here's what's next",
    pendingBannerTitle: 'Awaiting Verification',
    pendingBannerDetail:
      '— Your shop is currently invisible to public users while under review.',
    gateAnalyticsUnlock: 'Analytics unlock once your shop is verified',
  },

  fil: {
    // #1–9
    stepCategoryTitle: 'Kategorya ng Negosyo',
    stepCategoryDescription:
      'Piliin ang kategoryang pinaka-angkop sa iyong negosyo.',
    stepInformationTitle: 'Impormasyon ng Tindahan',
    stepInformationDescription:
      'Ibigay ang pangunahing detalye ng iyong tindahan.',
    stepOfferingsTitle: 'Ang Iyong Mga Alok',
    stepOfferingsDescription:
      'Magdagdag ng kahit isang item para hindi walang laman ang pahina ng iyong tindahan sa unang araw.',
    stepDealTitle: 'Pambungad na Promo',
    stepDealDescription:
      'Opsyonal. Bigyan ng dahilan ang mga mamimili na pumunta — maaari mong laktawan ito.',
    stepReviewTitle: 'Repasuhin at Isumite',

    // #10–13
    fieldShopName: 'Pangalan ng Tindahan',
    fieldCityMunicipality: 'Lungsod/Bayan',
    buttonUseMyLocation: 'Gamitin ang Aking Lokasyon',
    noteAddressVerification:
      'Tandaan: Gagamitin ang address na ito para sa beripikasyon at maaaring ipakita sa mga customer. Tiyaking tama ito.',

    // #14–15
    checkboxPublishWhenLive:
      'I-publish ito kapag na-activate na ang aking tindahan',
    helperPublishAsDraft:
      'Kung hindi ito i-tick, ise-save ang promo bilang draft — walang makakapag-redeem hanggang i-publish mo ito mula sa iyong dashboard.',

    // #16–25
    dialogAddCouponTitle: 'Magdagdag ng Coupon o Promo',
    dialogAddCouponDescription:
      'Gumawa ng discount coupon o featured promo para sa iyong mga customer',
    visibilityDraft: 'Draft — Ikaw lang ang makakakita nito',
    visibilityPublished: 'Published — Nakikita ng mga customer',
    scopeAppliesTo: 'Saklaw',
    scopeAllProducts: 'Lahat ng produkto',
    limitsMaxTotalUses: 'Pinakamaraming Paggamit (Opsyonal)',
    dateStartDate: 'Petsa ng Pagsisimula',
    validationCodeRequired: 'Kinakailangan ang code',
    validationGreaterThanZero: 'Dapat higit sa 0',

    // #26–30
    checklistFinishSetupTitle: 'Tapusin ang pag-setup ng iyong tindahan',
    checklistWelcomeTitle:
      'Nakarehistro na ang iyong tindahan — narito ang susunod',
    pendingBannerTitle: 'Naghihintay ng Beripikasyon',
    pendingBannerDetail:
      '— Hindi pa nakikita ng publiko ang iyong tindahan habang sinusuri pa.',
    gateAnalyticsUnlock:
      'Magiging available ang analytics kapag na-verify na ang iyong tindahan',
  },
};

/** Safe accessor — an unknown locale reads English rather than `undefined`. */
export function ownerCopyFor(
  locale: Locale | string | null | undefined,
): OwnerCopy {
  return OWNER_COPY[locale as Locale] ?? OWNER_COPY.en;
}
