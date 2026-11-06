-- Owner's photo for Chinese / Vegetable Rice with Manchurian (never replaces a dashboard upload)
UPDATE "menu_items" SET "image_path" = '/images/dishes/menu/chinese-vegetable-rice-manchurian.webp', "image_alt" = 'Vegetable fried rice with Manchurian in a royal brass bowl' WHERE "slug" = 'chinese-vegetable-rice-manchurian' AND ("image_path" IS NULL OR "image_path" NOT LIKE 'media:%');
