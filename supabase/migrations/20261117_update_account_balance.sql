-- Ajuste atómico del saldo de una cuenta (evita la carrera de leer-y-escribir desde el cliente).
-- SECURITY INVOKER: las políticas RLS de accounts siguen aplicando, solo afecta cuentas propias.
CREATE OR REPLACE FUNCTION update_account_balance(p_account_id UUID, p_delta BIGINT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  UPDATE accounts
  SET balance = balance + p_delta, updated_at = now()
  WHERE id = p_account_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Account % not found', p_account_id;
  END IF;
END;
$$;
