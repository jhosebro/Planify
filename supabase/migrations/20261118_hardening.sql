-- Hardening (ISO 27001 A.8.3/A.8.28, SOC 2 CC6.1). Idempotente: se puede ejecutar varias veces.

-- 1) Funciones con search_path fijo: un SECURITY DEFINER con search_path mutable
--    puede ser secuestrado creando objetos homónimos en otro esquema (linter 0011 de Supabase).
CREATE OR REPLACE FUNCTION public.create_default_categories()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.categories (user_id, name, icon, color, is_default) VALUES
    (NEW.id, 'Alimentación', '🍔', '#FF6384', true),
    (NEW.id, 'Transporte', '🚗', '#36A2EB', true),
    (NEW.id, 'Entretenimiento', '🎮', '#FFCE56', true),
    (NEW.id, 'Salud', '🏥', '#4BC0C0', true),
    (NEW.id, 'Educación', '📚', '#9966FF', true),
    (NEW.id, 'Hogar', '🏠', '#FF9F40', true),
    (NEW.id, 'Ropa', '👕', '#E7E9ED', true),
    (NEW.id, 'Servicios', '💡', '#7BC67E', true),
    (NEW.id, 'Salario', '💰', '#27AE60', true),
    (NEW.id, 'Otros', '📦', '#95A5A6', true),
    (NEW.id, 'Transferencia', '↔️', '#607D8B', true),
    (NEW.id, 'Recordatorio', '🔔', '#FF9800', true);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_profile_for_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.update_account_balance(UUID, BIGINT) SET search_path = public;

-- Las funciones de trigger no deben poder invocarse por RPC.
REVOKE ALL ON FUNCTION public.create_default_categories() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_profile_for_new_user() FROM PUBLIC, anon, authenticated;
-- update_account_balance solo para usuarios autenticados (RLS de accounts sigue aplicando).
REVOKE ALL ON FUNCTION public.update_account_balance(UUID, BIGINT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_account_balance(UUID, BIGINT) TO authenticated;

-- 2) Bucket de avatares: límite de tamaño y tipos (minimización + anti-abuso de almacenamiento).
UPDATE storage.buckets
SET file_size_limit = 2097152,                                   -- 2 MiB
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id = 'avatars';

-- Cada usuario solo escribe/lista/borra dentro de su carpeta <user_id>/.
-- Revisa en Storage → Policies que no queden otras políticas más permisivas sobre 'avatars'.
DROP POLICY IF EXISTS "avatars_own_select" ON storage.objects;
DROP POLICY IF EXISTS "avatars_own_insert" ON storage.objects;
DROP POLICY IF EXISTS "avatars_own_update" ON storage.objects;
DROP POLICY IF EXISTS "avatars_own_delete" ON storage.objects;

CREATE POLICY "avatars_own_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatars_own_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatars_own_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatars_own_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
