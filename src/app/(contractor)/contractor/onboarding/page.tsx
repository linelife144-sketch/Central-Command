import { ContractorOnboardingForm } from '@/components/features/onboarding/ContractorOnboardingForm';
export default function ContractorOnboardingPage() {
  return <div className="mx-auto max-w-3xl space-y-6 pb-8"><header className="rounded-3xl bg-gradient-to-br from-grid-navy to-grid-blue p-7 text-white shadow-lg"><p className="text-xs font-bold uppercase tracking-widest text-grid-lightning">Account onboarding</p><h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">You’re almost ready.</h1><p className="mt-3 max-w-xl text-sm leading-6 text-blue-100">Confirm your name and starting address. If you’re a driver, add your registration tag photo. Then you can enter your contractor portal.</p></header><ContractorOnboardingForm /></div>;
}
