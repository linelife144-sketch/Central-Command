'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

export function LogoutHandler() {
  const router = useRouter();

  useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        await supabase.auth.signOut();
      } catch {
        // Ending the session client-side still returns the user to /login below.
      } finally {
        if (active) {
          router.replace('/login');
        }
      }
    };

    void run();

    return () => {
      active = false;
    };
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-4 text-sm text-slate-500">
      <Loader2 className="h-8 w-8 animate-spin" />
      <p>Signing you out&hellip;</p>
    </div>
  );
}
