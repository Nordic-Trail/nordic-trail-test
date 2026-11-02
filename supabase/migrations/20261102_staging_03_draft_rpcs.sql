-- STAGING ONLY. Two owner-scoped draft RPCs, extracted from reviewed unified migration.
-- Run only in Nordic-Trail-Staging after schema/policy checks.
BEGIN;
CREATE OR REPLACE FUNCTION public.submit_map_point_for_review(p_point_id bigint)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Wymagane logowanie' USING ERRCODE='42501';
  END IF;
  UPDATE public.map_points
  SET review_status='pending',visibility='private'
  WHERE id=p_point_id AND user_id=(SELECT auth.uid())
    AND review_status='draft' AND visibility='private';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Nie znaleziono prywatnego szkicu lub punkt zmienił status' USING ERRCODE='42501';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.submit_map_point_for_review(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_map_point_for_review(bigint) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_private_map_point(
 p_point_id bigint,p_kind text,p_status text,p_note text,p_lat double precision,p_lon double precision
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Wymagane logowanie' USING ERRCODE='42501';
  END IF;
  IF p_kind IS NULL OR p_status IS NULL
    OR p_kind NOT IN ('gate','closed','place')
    OR NOT (
      (p_kind='gate' AND p_status IN ('Otwarty','Zamknięty','Nieznany')) OR
      (p_kind='closed' AND p_status IN ('Przejezdna','Nieprzejezdna','Do sprawdzenia')) OR
      (p_kind='place' AND p_status IN ('Dostępne','Niedostępne'))
    )
    OR p_lat IS NULL OR p_lon IS NULL
    OR p_lat::text IN ('NaN','Infinity','-Infinity')
    OR p_lon::text IN ('NaN','Infinity','-Infinity')
    OR p_lat NOT BETWEEN -90 AND 90 OR p_lon NOT BETWEEN -180 AND 180
    OR length(coalesce(p_note,''))>2000
  THEN
    RAISE EXCEPTION 'Nieprawidłowe dane punktu' USING ERRCODE='22023';
  END IF;
  UPDATE public.map_points
  SET kind=p_kind,status=p_status,note=p_note,lat=p_lat,lon=p_lon
  WHERE id=p_point_id AND user_id=(SELECT auth.uid())
    AND review_status='draft' AND visibility='private';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Nie znaleziono własnego szkicu' USING ERRCODE='42501';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.update_private_map_point(bigint,text,text,text,double precision,double precision) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_private_map_point(bigint,text,text,text,double precision,double precision) TO authenticated;

COMMIT;
