-- The stock photo for Seekh Kebab Karahi didn't load; use the kitchen's own grill photo (only if the owner hasn't set one)
UPDATE "menu_items" SET "image_path" = '/images/dishes/mixed-grill.webp', "image_alt" = 'Seekh kebabs and tikka from our grill' WHERE "slug" = 'shahi-seekh-kebab-karahi' AND ("image_path" IS NULL OR "image_path" LIKE 'https://images.pexels.com/photos/1105325/%');
