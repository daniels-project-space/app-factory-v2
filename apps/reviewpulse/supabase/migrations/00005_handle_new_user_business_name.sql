-- Migration 00005: Update handle_new_user trigger to read business_name from signup metadata
-- Required because sign-up.tsx passes business_name via signUp options.data.
-- Without this, the business_name entered on the sign-up screen is silently discarded.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, business_name)
  VALUES (
    NEW.id,
    NEW.email,
    SPLIT_PART(NEW.email, '@', 1),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'business_name'), '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
