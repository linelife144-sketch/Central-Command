'use client';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { REGISTRATION_BUCKET } from '@/lib/auth/contractorOnboardingValidation';
export function RegistrationTagLink({ path }: { path: string }) {
  const query = useQuery({ queryKey: ['registration-tag', path], queryFn: async () => {
    const { data, error } = await supabase.storage.from(REGISTRATION_BUCKET).createSignedUrl(path, 60);
    if (error) throw error;
    return data.signedUrl;
  }, staleTime: 30000, refetchInterval: 45000 });
  if (query.error) return <p role="alert" className="text-sm">Unable to load registration tag photo.</p>;
  return query.data ? <a href={query.data} target="_blank" rel="noreferrer" className="font-semibold text-grid-blue underline">View registration tag photo</a> : <p className="text-sm">Loading registration tag photo…</p>;
}
