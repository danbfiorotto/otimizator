-- Seed: Popular parques principais de Orlando
-- Estes são os parques mais comuns que os usuários visitam

INSERT INTO parks (slug, name, country, timezone, lat, lng, is_active) VALUES
  ('magic-kingdom', 'Magic Kingdom', 'USA', 'America/New_York', 28.4177, -81.5812, true),
  ('epcot', 'EPCOT', 'USA', 'America/New_York', 28.3747, -81.5494, true),
  ('hollywood-studios', 'Disney''s Hollywood Studios', 'USA', 'America/New_York', 28.3575, -81.5582, true),
  ('animal-kingdom', 'Disney''s Animal Kingdom', 'USA', 'America/New_York', 28.3553, -81.5900, true),
  ('universal-studios-florida', 'Universal Studios Florida', 'USA', 'America/New_York', 28.4744, -81.4681, true),
  ('islands-of-adventure', 'Islands of Adventure', 'USA', 'America/New_York', 28.4744, -81.4681, true),
  ('epic-universe', 'Universal Epic Universe', 'USA', 'America/New_York', 28.4744, -81.4681, true),
  ('volcano-bay', 'Volcano Bay', 'USA', 'America/New_York', 28.4744, -81.4681, true),
  ('seaworld-orlando', 'SeaWorld Orlando', 'USA', 'America/New_York', 28.4111, -81.4614, true),
  ('busch-gardens-tampa', 'Busch Gardens Tampa', 'USA', 'America/New_York', 28.0375, -82.4194, true)
ON CONFLICT (slug) DO NOTHING;
