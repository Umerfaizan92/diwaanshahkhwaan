-- Owner request (6 Nov 2026):
-- * private pickup address (shown only on confirmations/receipts)
-- * 10% GST added on top of the order total
-- * new-order alerts to the owner's mobile
-- * free-licence stock photos (serving suggestions) for dishes without a photo
UPDATE "business_settings" SET
  "pickup_address" = '25 Osten Dr, Langford WA 6147',
  "gst_mode" = 'ADD_ON',
  "gst_registered" = true,
  "owner_notify_phone" = COALESCE("owner_notify_phone", '0452 401 786');
--> statement-breakpoint
UPDATE "menu_items" SET "image_path" = 'https://images.pexels.com/photos/616353/pexels-photo-616353.jpeg?auto=compress&cs=tinysrgb&w=900', "image_alt" = 'Roasted whole chicken (serving suggestion)' WHERE "slug" = 'shahi-grilled-whole-chicken-rice-platter' AND "image_path" IS NULL;
--> statement-breakpoint
UPDATE "menu_items" SET "image_path" = 'https://images.pexels.com/photos/10445627/pexels-photo-10445627.jpeg?auto=compress&cs=tinysrgb&w=900', "image_alt" = 'Bowl of chicken curry (serving suggestion)' WHERE "slug" = 'shahi-chicken-korma' AND "image_path" IS NULL;
--> statement-breakpoint
UPDATE "menu_items" SET "image_path" = 'https://images.pexels.com/photos/12737808/pexels-photo-12737808.jpeg?auto=compress&cs=tinysrgb&w=900', "image_alt" = 'Creamy meat curry with flatbread (serving suggestion)' WHERE "slug" = 'shahi-chicken-degi' AND "image_path" IS NULL;
--> statement-breakpoint
UPDATE "menu_items" SET "image_path" = 'https://images.pexels.com/photos/29685054/pexels-photo-29685054.jpeg?auto=compress&cs=tinysrgb&w=900', "image_alt" = 'Butter chicken in a copper pan (serving suggestion)' WHERE "slug" = 'shahi-butter-chicken' AND "image_path" IS NULL;
--> statement-breakpoint
UPDATE "menu_items" SET "image_path" = 'https://images.pexels.com/photos/9609846/pexels-photo-9609846.jpeg?auto=compress&cs=tinysrgb&w=900', "image_alt" = 'Meat curry in a bowl (serving suggestion)' WHERE "slug" = 'shahi-lamb-karahi' AND "image_path" IS NULL;
--> statement-breakpoint
UPDATE "menu_items" SET "image_path" = 'https://images.pexels.com/photos/1105325/pexels-photo-1105325.jpeg?auto=compress&cs=tinysrgb&w=900', "image_alt" = 'Grilled meat on a griddle (serving suggestion)' WHERE "slug" = 'shahi-seekh-kebab-karahi' AND "image_path" IS NULL;
--> statement-breakpoint
UPDATE "menu_items" SET "image_path" = 'https://images.pexels.com/photos/20408435/pexels-photo-20408435.jpeg?auto=compress&cs=tinysrgb&w=900', "image_alt" = 'Slow-cooked dish in a pot with spices (serving suggestion)' WHERE "slug" = 'shahi-daleem' AND "image_path" IS NULL;
--> statement-breakpoint
UPDATE "menu_items" SET "image_path" = 'https://images.pexels.com/photos/9980764/pexels-photo-9980764.jpeg?auto=compress&cs=tinysrgb&w=900', "image_alt" = 'Chicken shawarma wrapped in paper (serving suggestion)' WHERE "slug" = 'chicken-shawarma-with-sauce' AND "image_path" IS NULL;
--> statement-breakpoint
UPDATE "menu_items" SET "image_path" = 'https://images.pexels.com/photos/5779423/pexels-photo-5779423.jpeg?auto=compress&cs=tinysrgb&w=900', "image_alt" = 'Chicken roll held in hand (serving suggestion)' WHERE "slug" = 'shahi-crispy-chicken-roll' AND "image_path" IS NULL;
--> statement-breakpoint
UPDATE "menu_items" SET "image_path" = 'https://images.pexels.com/photos/7595073/pexels-photo-7595073.jpeg?auto=compress&cs=tinysrgb&w=900', "image_alt" = 'Loaded chicken sandwich (serving suggestion)' WHERE "slug" = 'loaded-sandwich-4' AND "image_path" IS NULL;
--> statement-breakpoint
UPDATE "menu_items" SET "image_path" = 'https://images.pexels.com/photos/2874989/pexels-photo-2874989.jpeg?auto=compress&cs=tinysrgb&w=900', "image_alt" = 'Beef burger close-up (serving suggestion)' WHERE "slug" = 'signature-jumbo-beef-burger' AND "image_path" IS NULL;
--> statement-breakpoint
UPDATE "menu_items" SET "image_path" = 'https://images.pexels.com/photos/11354334/pexels-photo-11354334.jpeg?auto=compress&cs=tinysrgb&w=900', "image_alt" = 'Crunchy chicken burger (serving suggestion)' WHERE "slug" = 'shahi-jumbo-crunchy-chicken-burger' AND "image_path" IS NULL;
--> statement-breakpoint
UPDATE "menu_items" SET "image_path" = 'https://images.pexels.com/photos/38337105/pexels-photo-38337105.jpeg?auto=compress&cs=tinysrgb&w=900', "image_alt" = 'Chicken wrap close-up (serving suggestion)' WHERE "slug" = 'shahi-crunchy-chicken-wrap' AND "image_path" IS NULL;
--> statement-breakpoint
UPDATE "menu_items" SET "image_path" = 'https://images.pexels.com/photos/19585047/pexels-photo-19585047.jpeg?auto=compress&cs=tinysrgb&w=900', "image_alt" = 'Chicken sandwiches (serving suggestion)' WHERE "slug" = 'chicken-loaded-creamy-club-sandwich' AND "image_path" IS NULL;
--> statement-breakpoint
UPDATE "menu_items" SET "image_path" = 'https://images.pexels.com/photos/116725/pexels-photo-116725.jpeg?auto=compress&cs=tinysrgb&w=900', "image_alt" = 'Creamy rice pudding (serving suggestion)' WHERE "slug" = 'shahi-kheer' AND "image_path" IS NULL;
--> statement-breakpoint
UPDATE "menu_items" SET "image_path" = 'https://images.pexels.com/photos/11700718/pexels-photo-11700718.jpeg?auto=compress&cs=tinysrgb&w=900', "image_alt" = 'Coconut balls (serving suggestion)' WHERE "slug" = 'coconut-pops-5' AND "image_path" IS NULL;
--> statement-breakpoint
UPDATE "menu_items" SET "image_path" = 'https://images.pexels.com/photos/19976297/pexels-photo-19976297.jpeg?auto=compress&cs=tinysrgb&w=900', "image_alt" = 'Dessert cups (serving suggestion)' WHERE "slug" = 'custard-cups-2' AND "image_path" IS NULL;
