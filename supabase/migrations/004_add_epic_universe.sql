-- Add Universal Epic Universe park
INSERT INTO parks (slug, name, country, timezone, lat, lng, is_active) VALUES
  ('epic-universe', 'Universal Epic Universe', 'USA', 'America/New_York', 28.4744, -81.4681, true)
ON CONFLICT (slug) DO NOTHING;
