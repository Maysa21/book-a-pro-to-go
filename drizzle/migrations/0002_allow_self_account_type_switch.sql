CREATE OR REPLACE FUNCTION public.set_my_account_type(_account_type text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE caller uuid := auth.uid();
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'É necessário entrar na sua conta.' USING ERRCODE = '42501';
  END IF;
  IF _account_type IS NULL OR _account_type NOT IN ('client', 'professional') THEN
    RAISE EXCEPTION 'Tipo de conta inválido.' USING ERRCODE = '22023';
  END IF;
  PERFORM id FROM public.profiles WHERE id = caller FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil não encontrado.' USING ERRCODE = '22023';
  END IF;
  DELETE FROM public.user_roles WHERE user_id = caller AND role IN ('client', 'professional');
  INSERT INTO public.user_roles (user_id, role) VALUES (caller, _account_type::public.app_role);
END;
$$;
REVOKE ALL ON FUNCTION public.set_my_account_type(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_my_account_type(text) TO authenticated;