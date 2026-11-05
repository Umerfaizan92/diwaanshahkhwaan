/**
 * Seed catalogue transcribed from the DSK "Introductory Price List".
 * After seeding, the database is the source of truth and the owner edits
 * everything in Admin → Menu. Allergens are intentionally left unconfirmed.
 */
export type SeedOption = {
  name: string;
  kind: "PORTION" | "MODIFIER";
  required: boolean;
  maxSelect: number;
  choices: { name: string; priceDeltaCents?: number; isDefault?: boolean }[];
};

export type SeedDish = {
  slug: string;
  name: string;
  short: string;
  description: string;
  portion?: string;
  price: number; // dollars, GST-inclusive display price
  image?: string;
  imageAlt?: string;
  featured?: boolean;
  special?: boolean;
  vegetarian?: boolean;
  spice?: number;
  options?: SeedOption[];
};

export type SeedCategory = {
  slug: string;
  name: string;
  description: string;
  dishes: SeedDish[];
};

const spice: SeedOption = {
  name: "Spice level",
  kind: "MODIFIER",
  required: true,
  maxSelect: 1,
  choices: [{ name: "Mild" }, { name: "Medium", isDefault: true }, { name: "Hot" }],
};

export const CATALOG: SeedCategory[] = [
  {
    slug: "bbq-platters",
    name: "Signature Shahi BBQ Platters",
    description: "Charcoal-kissed BBQ served with rice, fresh salad and our signature Shahi dip.",
    dishes: [
      {
        slug: "shahi-chicken-tikka-bbq-platter",
        name: "Shahi Chicken Tikka BBQ Platter",
        short: "Chicken tikka, seekh kebab, rice, salad & Shahi dip",
        description:
          "Our signature platter: smoky BBQ chicken tikka and a juicy seekh kebab over fragrant rice, with fresh salad and our signature Shahi dip.",
        price: 20,
        image: "/images/dishes/bbq-platter-closeup.webp",
        imageAlt: "BBQ platter with seekh kebab, chicken tikka, orange rice, salad and garlic dip",
        featured: true,
        special: true,
        spice: 2,
        options: [spice],
      },
      {
        slug: "shahi-grilled-whole-chicken-rice-platter",
        name: "Shahi Signature Grilled Whole Chicken & Rice Platter",
        short: "Grilled whole chicken with rice",
        description: "A whole chicken, marinated in our Shahi spices and grilled, served with rice.",
        price: 20,
        featured: true,
        spice: 2,
        options: [spice],
      },
    ],
  },
  {
    slug: "rice",
    name: "Shah Khwaani Rice",
    description: "Slow-layered rice dishes made in big, generous batches.",
    dishes: [
      {
        slug: "shahi-chicken-biryani",
        name: "Shahi Chicken Biryani",
        short: "750ml of layered chicken biryani",
        description:
          "Long-grain basmati layered with tender spiced chicken and fresh coriander, cooked dum-style for deep flavour.",
        portion: "750ml",
        price: 12,
        image: "/images/dishes/biryani-tray.webp",
        imageAlt: "Trays of chicken biryani topped with coriander",
        featured: true,
        spice: 2,
        options: [spice],
      },
      {
        slug: "chinese-vegetable-rice-manchurian",
        name: "Chinese / Vegetable Rice with Manchurian",
        short: "Fried rice with Manchurian",
        description: "Indo-Chinese style vegetable fried rice served with Manchurian.",
        price: 15,
        spice: 1,
      },
    ],
  },
  {
    slug: "karahi-haandi",
    name: "Sizzling Karahi & Haandi Specials",
    description: "Wok-tossed karahis and slow-cooked haandi curries.",
    dishes: [
      {
        slug: "shahi-chicken-koela-karahi",
        name: "Shahi Chicken Koela Karahi",
        short: "Smoked chicken karahi with ginger & green chilli",
        description:
          "Chicken karahi finished with a coal smoke (koela), julienned ginger, green chilli and fresh coriander.",
        price: 12,
        image: "/images/dishes/chicken-karahi.webp",
        imageAlt: "Chicken karahi topped with ginger, green chilli and coriander",
        featured: true,
        spice: 2,
        options: [spice],
      },
      { slug: "shahi-chicken-korma", name: "Shahi Chicken Korma", short: "Rich, aromatic chicken korma", description: "Chicken simmered in a rich, aromatic korma gravy.", price: 12, spice: 1, options: [spice] },
      { slug: "shahi-chicken-degi", name: "Shahi Chicken Degi", short: "Degi-style chicken curry", description: "Chicken cooked degi-style, the traditional way in a large pot.", price: 12, spice: 2, options: [spice] },
      { slug: "shahi-butter-chicken", name: "Shahi Butter Chicken", short: "Creamy tomato butter chicken", description: "Tender chicken in a creamy, buttery tomato gravy.", price: 12, spice: 1, options: [spice] },
      { slug: "shahi-lamb-karahi", name: "Shahi Lamb Karahi", short: "Lamb karahi", description: "Lamb cooked karahi-style with tomato, ginger and green chilli.", price: 15, spice: 2, options: [spice] },
      { slug: "shahi-seekh-kebab-karahi", name: "Shahi Seekh Kebab Karahi", short: "Seekh kebabs in karahi masala", description: "Seekh kebabs finished in a spiced karahi masala.", price: 15, spice: 2, options: [spice] },
      { slug: "shahi-achar-gosht", name: "Shahi Achar Gosht", short: "Tangy pickle-spiced meat curry", description: "Meat curry cooked with tangy achar (pickle) spices.", price: 15, spice: 3, options: [spice] },
      { slug: "shahi-dum-qeema-mattar", name: "Shahi Dum Qeema Mattar", short: "Slow-cooked mince with peas", description: "Mince and green peas slow-cooked dum-style.", price: 12, spice: 2, options: [spice] },
      { slug: "shahi-daleem", name: "Shahi Daleem", short: "Slow-cooked meat, lentils & grains", description: "A hearty, slow-cooked blend of meat, lentils and grains.", price: 20, special: true, spice: 2, options: [spice] },
    ],
  },
  {
    slug: "savouries-high-tea",
    name: "Special Savouries & High Tea",
    description: "Burgers, wraps, rolls and sandwiches — made for gatherings.",
    dishes: [
      { slug: "chicken-spaghetti", name: "Chicken Spaghetti", short: "Spiced chicken spaghetti", description: "Spaghetti tossed with spiced chicken.", price: 12, spice: 1 },
      { slug: "chicken-shawarma-with-sauce", name: "Chicken Shawarma with Sauce", short: "Chicken shawarma with sauce", description: "Chicken shawarma served with our sauce.", price: 10, spice: 1 },
      { slug: "shahi-crispy-chicken-roll", name: "Shahi Crispy Chicken Roll", short: "Crispy chicken roll", description: "A crispy roll filled with spiced chicken.", price: 10, spice: 1 },
      { slug: "loaded-sandwich-4", name: "Loaded Sandwich", short: "4 loaded sandwiches", description: "Four generously loaded sandwiches.", portion: "4 pieces", price: 10 },
      { slug: "signature-jumbo-beef-burger", name: "Signature Jumbo Juicy Beef Burger", short: "Jumbo beef burger", description: "A jumbo, juicy beef burger.", price: 10, spice: 1 },
      { slug: "shahi-jumbo-crunchy-chicken-burger", name: "Shahi Jumbo Crunchy Chicken Burger", short: "Jumbo crunchy chicken burger", description: "A jumbo burger with crunchy fried chicken.", price: 10, spice: 1 },
      { slug: "shahi-crunchy-chicken-wrap", name: "Shahi Crunchy Chicken Wrap", short: "Crunchy chicken wrap", description: "Crunchy chicken wrapped with salad and sauce.", price: 10, spice: 1 },
      { slug: "chicken-loaded-creamy-club-sandwich", name: "Chicken Loaded Creamy Club Sandwich", short: "4-piece creamy chicken club", description: "Creamy chicken club sandwich, cut into four pieces.", portion: "4 pieces", price: 10 },
    ],
  },
  {
    slug: "traditional-vegetarian",
    name: "Traditional & Vegetarian Specials",
    description: "Home-style classics, meat-free.",
    dishes: [
      { slug: "shahi-dahi-baray", name: "Shahi Dahi Baray", short: "Lentil dumplings in spiced yoghurt", description: "Soft lentil dumplings in chilled, spiced yoghurt.", price: 12, vegetarian: true, spice: 1 },
      { slug: "shahi-karhi-pakora", name: "Shahi Karhi Pakora", short: "Yoghurt-gram flour curry with pakora", description: "Tangy yoghurt and gram flour curry with pakoras.", price: 12, vegetarian: true, spice: 1 },
      { slug: "shahi-palak-aloo", name: "Shahi Palak Aloo", short: "Spinach & potato", description: "Spinach and potato cooked with home spices.", price: 12, vegetarian: true, spice: 1 },
      { slug: "shahi-mix-sabzi", name: "Shahi Mix Sabzi", short: "Mixed seasonal vegetables", description: "Mixed seasonal vegetables cooked home-style.", price: 12, vegetarian: true, spice: 1 },
      { slug: "shahi-baingan", name: "Shahi Baingan", short: "Spiced eggplant", description: "Eggplant cooked with onion, tomato and spices.", price: 12, vegetarian: true, spice: 1 },
    ],
  },
  {
    slug: "dips",
    name: "Signature Dips",
    description: "The dip everyone asks about.",
    dishes: [
      { slug: "signature-shahi-garlic-dip", name: "Signature Shahi Garlic Dip", short: "Our creamy garlic dip", description: "Our signature creamy garlic dip — perfect with BBQ.", price: 10, vegetarian: true },
    ],
  },
  {
    slug: "desserts",
    name: "Desserts",
    description: "A sweet, royal finish.",
    dishes: [
      { slug: "shahi-kheer", name: "Shahi Kheer", short: "Creamy rice pudding", description: "Slow-cooked creamy rice pudding.", price: 10, vegetarian: true },
      { slug: "shahi-sawiyan", name: "Shahi Sawiyan", short: "Sweet vermicelli", description: "Sweet vermicelli dessert.", price: 10, vegetarian: true },
      { slug: "coconut-pops-5", name: "Coconut Pops", short: "5 coconut pops", description: "Five coconut pops.", portion: "5 pieces", price: 10, vegetarian: true },
      { slug: "custard-cups-2", name: "Custard Cups", short: "2 custard cups", description: "Two custard cups.", portion: "2 cups", price: 10, vegetarian: true },
    ],
  },
];
