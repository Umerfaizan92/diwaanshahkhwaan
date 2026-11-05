-- Owner request (6 Nov 2026): publish only Sayed Hasnain Shah's number (0452 401 786)
UPDATE "business_settings"
SET "contacts" = COALESCE(
  (SELECT jsonb_agg(c) FROM jsonb_array_elements("contacts") AS c WHERE regexp_replace(c->>'phone', '\D', '', 'g') NOT IN ('0469975901', '61469975901')),
  '[{"name":"Sayed Hasnain Shah","phone":"0452 401 786","role":"Orders, enquiries & pickup"}]'::jsonb
);
