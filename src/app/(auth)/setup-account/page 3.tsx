import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SetupAccountForm } from '@/components/features/auth/SetupAccountForm';

export const metadata = { title: 'Set up account - Central Command' };
export default function SetupAccountPage() {
  return <Card className="w-full"><CardHeader className="space-y-2"><p className="text-xs font-bold uppercase tracking-widest text-grid-blue">Contractor access</p><CardTitle className="cc-auth-title">Set up account.</CardTitle><CardDescription>Use the email your administrator added. Verify your email, choose a password, then finish your contractor details.</CardDescription></CardHeader><CardContent className="space-y-5"><SetupAccountForm /><Link href="/login" className="block text-center text-sm font-semibold text-grid-navy hover:underline">Back to sign in</Link></CardContent></Card>;
}
