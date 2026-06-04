-- Seed admin and test user
INSERT INTO users (name, email, password_hash, role, points, created_at, updated_at)
VALUES
  ('Phan Phuc', 'phanphuc97.pp@gmail.com', '$2a$10$i9HEd4u42J04okPxzuw0Decjr62GW0HhKwytY/21zFUTQq7oV8Rum', 'admin', 1000, now(), now()),
  ('Test User', 'test@gmail.com', '$2a$10$WCYPakaLiVkEeZ7PMzhL4.6OzqVQlwOweC8k56TzJGyoriPPyCGLi', 'user', 100, now(), now())
ON CONFLICT (email) DO UPDATE
  SET name = EXCLUDED.name,
      password_hash = EXCLUDED.password_hash,
      role = EXCLUDED.role,
      points = EXCLUDED.points,
      updated_at = now();
