-- ====================================================================
-- NESTIN PLATFORM DATABASE SCHEMA & SECURITY POLICIES (SUPABASE POSTGRESQL)
-- ====================================================================

-- Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ====================================================================
-- 1. PROFILES TABLE (Linked to auth.users)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  city TEXT DEFAULT 'Bengaluru',
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'tenant', 'owner', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- 2. CITIES TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  state TEXT NOT NULL,
  image_url TEXT,
  verified_count INTEGER DEFAULT 0,
  pg_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- 3. PROPERTIES TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT UNIQUE,
  description TEXT,
  property_type TEXT DEFAULT 'PG / Co-Living' CHECK (property_type IN ('PG / Co-Living', 'Shared Flat', 'Private Room', 'Studio Apartment')),
  city_name TEXT NOT NULL,
  locality TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  rent_monthly NUMERIC(10, 2) NOT NULL,
  deposit_amount NUMERIC(10, 2) DEFAULT 0.00,
  gender_type TEXT NOT NULL DEFAULT 'Unisex' CHECK (gender_type IN ('Boys', 'Girls', 'Unisex', 'Coliving')),
  sharing_options TEXT[] DEFAULT ARRAY['Single', 'Double', 'Triple'],
  food_included BOOLEAN DEFAULT true,
  wifi_speed_mbps INTEGER DEFAULT 100,
  is_verified BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  rating NUMERIC(3, 2) DEFAULT 4.5,
  reviews_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'sold_out', 'under_review')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- 4. PROPERTY IMAGES TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.property_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- 5. AMENITIES TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.amenities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  amenity_name TEXT NOT NULL,
  icon_category TEXT DEFAULT 'general'
);

-- ====================================================================
-- 6. BOOKINGS TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  move_in_date DATE NOT NULL,
  sharing_type TEXT DEFAULT 'Single',
  total_amount NUMERIC(10, 2) NOT NULL,
  deposit_paid NUMERIC(10, 2) DEFAULT 0.00,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- 7. WISHLIST TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.wishlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, property_id)
);

-- ====================================================================
-- 8. FAVORITE PROPERTIES TABLE (Alias/Alternative for Favorites)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.favorite_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, property_id)
);

-- ====================================================================
-- 9. SCHEDULED VISITS TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  visit_date DATE NOT NULL,
  visit_slot TEXT NOT NULL,
  visitor_name TEXT NOT NULL,
  visitor_phone TEXT NOT NULL,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- 10. PAYMENTS TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT DEFAULT 'INR',
  payment_method TEXT DEFAULT 'UPI' CHECK (payment_method IN ('UPI', 'Card', 'NetBanking', 'Razorpay', 'Cash')),
  transaction_id TEXT UNIQUE,
  status TEXT DEFAULT 'success' CHECK (status IN ('pending', 'success', 'failed', 'refunded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- 11. REVIEWS TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(property_id, user_id)
);

-- ====================================================================
-- 12. NOTIFICATIONS TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'booking', 'visit', 'payment', 'system')),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- 13. OWNER LEADS TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  tenant_name TEXT NOT NULL,
  tenant_email TEXT,
  tenant_phone TEXT NOT NULL,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'converted', 'closed')),
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- 14. OWNER BUSINESS DETAILS TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.owner_business (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  gst_number TEXT,
  pan_number TEXT,
  is_verified BOOLEAN DEFAULT false,
  business_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- 15. EMPLOYEES TABLE (Owner Staff)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  role TEXT DEFAULT 'Manager' CHECK (role IN ('Manager', 'Caretaker', 'Receptionist', 'Maintenance')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- 16. SUBSCRIPTIONS TABLE (Owner Plans)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_name TEXT DEFAULT 'Pro Landlord' CHECK (plan_name IN ('Starter', 'Pro Landlord', 'Enterprise')),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  price_paid NUMERIC(10, 2) DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- 17. ACTIVITY LOGS TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- 18. PROPERTY VIEWS TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.property_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  view_count INTEGER DEFAULT 1,
  last_viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- 19. CHAT MESSAGES TABLE
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- AUTOMATIC PROFILE CREATION TRIGGER ON AUTH SIGNUP
-- ====================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    full_name,
    email,
    phone,
    avatar_url,
    city,
    role
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      CONCAT('https://api.dicebear.com/7.x/initials/svg?seed=', encode(NEW.email::bytea, 'escape'))
    ),
    COALESCE(NEW.raw_user_meta_data->>'city', 'Bengaluru'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind Trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

-- 1. Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone."
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile."
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile."
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 2. Cities
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cities are viewable by everyone."
  ON public.cities FOR SELECT USING (true);

-- 3. Properties
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active properties are viewable by everyone."
  ON public.properties FOR SELECT USING (status = 'active' OR auth.uid() = owner_id);

CREATE POLICY "Owners can insert their own properties."
  ON public.properties FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their own properties."
  ON public.properties FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their own properties."
  ON public.properties FOR DELETE USING (auth.uid() = owner_id);

-- 4. Property Images
ALTER TABLE public.property_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Property images are viewable by everyone."
  ON public.property_images FOR SELECT USING (true);

CREATE POLICY "Owners can manage images for their properties."
  ON public.property_images FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.properties 
      WHERE properties.id = property_images.property_id 
      AND properties.owner_id = auth.uid()
    )
  );

-- 5. Amenities
ALTER TABLE public.amenities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Amenities are viewable by everyone."
  ON public.amenities FOR SELECT USING (true);

CREATE POLICY "Owners can manage amenities for their properties."
  ON public.amenities FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.properties 
      WHERE properties.id = amenities.property_id 
      AND properties.owner_id = auth.uid()
    )
  );

-- 6. Bookings
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own bookings."
  ON public.bookings FOR SELECT USING (
    auth.uid() = user_id OR EXISTS (
      SELECT 1 FROM public.properties 
      WHERE properties.id = bookings.property_id 
      AND properties.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create bookings."
  ON public.bookings FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users or owners can update bookings."
  ON public.bookings FOR UPDATE USING (
    auth.uid() = user_id OR EXISTS (
      SELECT 1 FROM public.properties 
      WHERE properties.id = bookings.property_id 
      AND properties.owner_id = auth.uid()
    )
  );

-- 7. Wishlist & Favorites
ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorite_properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own wishlist."
  ON public.wishlist FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage their own favorites."
  ON public.favorite_properties FOR ALL USING (auth.uid() = user_id);

-- 8. Visits
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users or owners view scheduled visits."
  ON public.visits FOR SELECT USING (
    auth.uid() = user_id OR EXISTS (
      SELECT 1 FROM public.properties 
      WHERE properties.id = visits.property_id 
      AND properties.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users create visits."
  ON public.visits FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 9. Payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own payments."
  ON public.payments FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users create payments."
  ON public.payments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 10. Reviews
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviews are viewable by everyone."
  ON public.reviews FOR SELECT USING (true);

CREATE POLICY "Authenticated users insert reviews."
  ON public.reviews FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 11. Notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own notifications."
  ON public.notifications FOR ALL USING (auth.uid() = user_id);

-- 12. Leads
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their leads."
  ON public.leads FOR ALL USING (auth.uid() = owner_id);

-- 13. Owner Business, Employees, Subscriptions
ALTER TABLE public.owner_business ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their business details."
  ON public.owner_business FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "Owners manage their employees."
  ON public.employees FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "Owners view their subscriptions."
  ON public.subscriptions FOR SELECT USING (auth.uid() = owner_id);

-- 14. Chat Messages
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view messages sent to or by them."
  ON public.chat_messages FOR SELECT USING (
    auth.uid() = sender_id OR auth.uid() = receiver_id
  );

CREATE POLICY "Users send chat messages."
  ON public.chat_messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- ====================================================================
-- INDEXES FOR MAXIMUM QUERY PERFORMANCE
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_properties_city ON public.properties(city_name);
CREATE INDEX IF NOT EXISTS idx_properties_owner ON public.properties(owner_id);
CREATE INDEX IF NOT EXISTS idx_properties_status ON public.properties(status);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_property ON public.bookings(property_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_user ON public.wishlist(user_id);
CREATE INDEX IF NOT EXISTS idx_visits_user ON public.visits(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_owner ON public.leads(owner_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON public.chat_messages(sender_id, receiver_id);

-- ====================================================================
-- SUPABASE STORAGE BUCKETS INITIALIZATION
-- ====================================================================
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('avatars', 'avatars', true),
  ('property-images', 'property-images', true),
  ('documents', 'documents', false),
  ('owner-verification', 'owner-verification', false)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
CREATE POLICY "Public bucket avatars viewable by all" 
  ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated user upload avatars" 
  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

CREATE POLICY "Public bucket property-images viewable by all" 
  ON storage.objects FOR SELECT USING (bucket_id = 'property-images');

CREATE POLICY "Authenticated user upload property-images" 
  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'property-images' AND auth.role() = 'authenticated');
