-- Business posts — content for the mobile Updates feed.
-- Depends on: businesses.sql (FK business_id). Testuser follows 11101/11102/11105
-- (see users.sql), so these surface in their Updates tab.

INSERT INTO public.business_posts (id, business_id, title, body, published_at)
VALUES
  ('88888888-8888-8888-8888-888888888801',
    '11111111-1111-1111-1111-111111111101',
    'New single-origin Ethiopia is here',
    'Bright, floral, and citrusy — pour-over or beans to take home, this week only.',
    NOW() - INTERVAL '2 hours'),
  ('88888888-8888-8888-8888-888888888802',
    '11111111-1111-1111-1111-111111111101',
    'Free weekend cupping session',
    'Join our public cupping this Saturday at 10am. First 12 seats only.',
    NOW() - INTERVAL '1 day'),
  ('88888888-8888-8888-8888-888888888803',
    '11111111-1111-1111-1111-111111111102',
    'Ube pandesal restock',
    'Back by popular demand — fresh batches every morning at 7am until sold out.',
    NOW() - INTERVAL '5 hours'),
  ('88888888-8888-8888-8888-888888888804',
    '11111111-1111-1111-1111-111111111105',
    'New turmeric latte on the menu',
    'Anti-inflammatory, dairy-free, naturally sweetened. Best served iced.',
    NOW() - INTERVAL '3 hours')
ON CONFLICT (id) DO NOTHING;
