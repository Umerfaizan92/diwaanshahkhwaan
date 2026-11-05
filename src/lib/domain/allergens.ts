/** The allergens that must be declared in Australia (FSANZ Food Standards Code, Standard 1.2.3) */
export const DECLARABLE_ALLERGENS = [
  "Peanut",
  "Tree nuts (almond, Brazil nut, cashew, hazelnut, macadamia, pecan, pine nut, pistachio, walnut)",
  "Milk",
  "Egg",
  "Sesame",
  "Fish",
  "Crustacea",
  "Mollusc",
  "Soy",
  "Lupin",
  "Wheat",
  "Gluten (barley, oats, rye, wheat)",
  "Sulphites (10 mg/kg or more)",
];

/** Short names used in the admin allergen picker and on dish pages */
export const ALLERGEN_OPTIONS = [
  "Peanut",
  "Tree nuts",
  "Milk",
  "Egg",
  "Sesame",
  "Fish",
  "Crustacea",
  "Mollusc",
  "Soy",
  "Lupin",
  "Wheat",
  "Gluten",
  "Sulphites",
] as const;
