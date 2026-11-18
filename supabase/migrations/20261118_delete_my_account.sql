-- Borra la cuenta del usuario que llama (requisito de Google Play).
-- Todas las tablas tienen user_id ... ON DELETE CASCADE, así que se van sus datos con él.
-- SECURITY DEFINER porque auth.users no es accesible para el rol authenticated; solo borra auth.uid().
CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.delete_my_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;
