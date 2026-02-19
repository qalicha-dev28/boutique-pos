-- ============================================
-- SEED DATA - Initial data for the system
-- ============================================

-- Default Admin User
-- Password is: Admin@2026 (hashed below)
INSERT INTO users (name, email, password, role) VALUES
(
  'System Admin',
  'admin@boutiquepos.com',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'admin'
) ON CONFLICT (email) DO NOTHING;

-- Default Categories
INSERT INTO categories (name, description) VALUES
('Skincare', 'Moisturizers, serums, cleansers and skincare products'),
('Makeup', 'Foundation, lipstick, mascara and makeup products'),
('Haircare', 'Shampoos, conditioners, oils and hair products'),
('Fragrance', 'Perfumes, body sprays and fragrances'),
('Nails', 'Nail polish, nail care and nail art products'),
('Body Care', 'Body lotions, scrubs and body care products'),
('Clothing', 'Boutique clothing and accessories'),
('Accessories', 'Bags, jewelry and fashion accessories')
ON CONFLICT (name) DO NOTHING;