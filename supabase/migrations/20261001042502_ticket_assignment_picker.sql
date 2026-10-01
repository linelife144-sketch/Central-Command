BEGIN;
-- Status changes run the existing invoker trigger; RLS still controls readable/writable rows.
GRANT SELECT, INSERT ON public.ticket_status_history TO authenticated;

CREATE OR REPLACE FUNCTION public.list_assignable_storm_contractors(p_storm_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object('contractorId',c.id,'displayName',p.first_name||' '||p.last_name) ORDER BY p.last_name,p.first_name),'[]'::jsonb)
  FROM public.contractors c JOIN public.profiles p ON p.id=c.profile_id
  JOIN public.storm_event_roster_members m ON m.contractor_id=c.id
  JOIN public.storm_event_roster_revisions r ON r.id=m.roster_revision_id
  WHERE r.storm_event_id=p_storm_id AND m.member_status='CONFIRMED'
    AND c.onboarding_status::text='APPROVED' AND c.is_eligible_for_assignment AND p.is_active
    AND r.revision_number=(SELECT max(revision_number) FROM public.storm_event_roster_revisions WHERE storm_event_id=p_storm_id);
$$;
REVOKE ALL ON FUNCTION public.list_assignable_storm_contractors(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_assignable_storm_contractors(uuid) TO authenticated;
COMMIT;
