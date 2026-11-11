CREATE OR REPLACE FUNCTION public.cleanup_deleted_account_records()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  DELETE FROM public.businesses WHERE owner_id = OLD.id;
  DELETE FROM public.bookings WHERE client_id = OLD.id;
  DELETE FROM public.messages WHERE client_id = OLD.id OR sender_id = OLD.id;
  RETURN OLD;
END;
$$;
REVOKE ALL ON FUNCTION public.cleanup_deleted_account_records() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER cleanup_deleted_account_records BEFORE DELETE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.cleanup_deleted_account_records();