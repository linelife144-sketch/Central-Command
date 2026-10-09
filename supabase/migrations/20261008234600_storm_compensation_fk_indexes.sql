-- Index newly added storm compensation foreign keys for deletes and joins.
CREATE INDEX storm_role_pay_rates_updated_by_idx
  ON public.storm_role_pay_rates (updated_by);

CREATE INDEX storm_contractor_compensation_contractor_id_idx
  ON public.storm_contractor_compensation (contractor_id);

CREATE INDEX storm_contractor_compensation_updated_by_idx
  ON public.storm_contractor_compensation (updated_by);
