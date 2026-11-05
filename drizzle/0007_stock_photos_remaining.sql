-- Stock serving-suggestion photos for the remaining dishes without a photo (never overwrites owner photos)
UPDATE "menu_items" SET "image_path" = 'https://images.pexels.com/photos/12866988/pexels-photo-12866988.jpeg?auto=compress&cs=tinysrgb&w=900', "image_alt" = 'Pasta with meat sauce (serving suggestion)' WHERE "slug" = 'chicken-spaghetti' AND "image_path" IS NULL;
--> statement-breakpoint
UPDATE "menu_items" SET "image_path" = 'https://images.pexels.com/photos/17910326/pexels-photo-17910326.jpeg?auto=compress&cs=tinysrgb&w=900', "image_alt" = 'Vegetable fried rice (serving suggestion)' WHERE "slug" = 'chinese-vegetable-rice-manchurian' AND "image_path" IS NULL;
--> statement-breakpoint
UPDATE "menu_items" SET "image_path" = 'https://images.pexels.com/photos/12737917/pexels-photo-12737917.jpeg?auto=compress&cs=tinysrgb&w=900', "image_alt" = 'Bowl of spiced meat curry (serving suggestion)' WHERE "slug" = 'shahi-achar-gosht' AND "image_path" IS NULL;
--> statement-breakpoint
UPDATE "menu_items" SET "image_path" = 'https://images.pexels.com/photos/29040190/pexels-photo-29040190.jpeg?auto=compress&cs=tinysrgb&w=900', "image_alt" = 'Baked eggplant with tomatoes (serving suggestion)' WHERE "slug" = 'shahi-baingan' AND "image_path" IS NULL;
--> statement-breakpoint
UPDATE "menu_items" SET "image_path" = 'https://images.pexels.com/photos/9213253/pexels-photo-9213253.jpeg?auto=compress&cs=tinysrgb&w=900', "image_alt" = 'Plate of dahi vada in yoghurt (serving suggestion)' WHERE "slug" = 'shahi-dahi-baray' AND "image_path" IS NULL;
--> statement-breakpoint
UPDATE "menu_items" SET "image_path" = 'https://images.pexels.com/photos/9609842/pexels-photo-9609842.jpeg?auto=compress&cs=tinysrgb&w=900', "image_alt" = 'Curry with green peas (serving suggestion)' WHERE "slug" = 'shahi-dum-qeema-mattar' AND "image_path" IS NULL;
--> statement-breakpoint
UPDATE "menu_items" SET "image_path" = 'https://images.pexels.com/photos/38298052/pexels-photo-38298052.jpeg?auto=compress&cs=tinysrgb&w=900', "image_alt" = 'Pakoras with a yoghurt side (serving suggestion)' WHERE "slug" = 'shahi-karhi-pakora' AND "image_path" IS NULL;
--> statement-breakpoint
UPDATE "menu_items" SET "image_path" = 'https://images.pexels.com/photos/10508207/pexels-photo-10508207.jpeg?auto=compress&cs=tinysrgb&w=900', "image_alt" = 'Bowls of vegetable curry (serving suggestion)' WHERE "slug" = 'shahi-mix-sabzi' AND "image_path" IS NULL;
--> statement-breakpoint
UPDATE "menu_items" SET "image_path" = 'https://images.pexels.com/photos/8625813/pexels-photo-8625813.jpeg?auto=compress&cs=tinysrgb&w=900', "image_alt" = 'Green spinach-style curry (serving suggestion)' WHERE "slug" = 'shahi-palak-aloo' AND "image_path" IS NULL;
--> statement-breakpoint
UPDATE "menu_items" SET "image_path" = 'https://images.pexels.com/photos/1893566/pexels-photo-1893566.jpeg?auto=compress&cs=tinysrgb&w=900', "image_alt" = 'Sweet dessert on a plate (serving suggestion)' WHERE "slug" = 'shahi-sawiyan' AND "image_path" IS NULL;
--> statement-breakpoint
UPDATE "menu_items" SET "image_path" = 'https://images.pexels.com/photos/3622479/pexels-photo-3622479.jpeg?auto=compress&cs=tinysrgb&w=900', "image_alt" = 'Dipping sauces in small bowls (serving suggestion)' WHERE "slug" = 'signature-shahi-garlic-dip' AND "image_path" IS NULL;
