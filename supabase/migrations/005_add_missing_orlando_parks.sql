-- Add missing Orlando theme parks
-- These are important parks that were missing from the initial seed

INSERT INTO parks (slug, name, country, timezone, lat, lng, is_active) VALUES
  ('discovery-cove', 'Discovery Cove', 'USA', 'America/New_York', 28.4111, -81.4614, true),
  ('aquatica-orlando', 'Aquatica Orlando', 'USA', 'America/New_York', 28.4111, -81.4614, true),
  ('legoland-florida', 'LEGOLAND Florida', 'USA', 'America/New_York', 28.0336, -81.6903, true),
  ('typhoon-lagoon', 'Disney''s Typhoon Lagoon', 'USA', 'America/New_York', 28.3747, -81.5494, true),
  ('blizzard-beach', 'Disney''s Blizzard Beach', 'USA', 'America/New_York', 28.3575, -81.5582, true)
ON CONFLICT (slug) DO NOTHING;
