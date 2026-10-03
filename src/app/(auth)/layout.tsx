import { ReactNode } from 'react';
import { ArrowUpRight, Zap } from 'lucide-react';
import { BrandMark } from '@/components/common/brand/BrandMark';
import { SignalField } from '@/components/common/brand/SignalField';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <div className="cc-auth-layout">
    <aside className="cc-auth-story">
      <SignalField />
      <div className="relative z-10"><BrandMark tone="light" portalLabel="Secure Access" /></div>
      <div className="cc-auth-copy relative z-10">
        <div className="cc-eyebrow"><span aria-hidden="true" />Powering the response</div>
        <h1>When the storm hits,<br />{' '}you&apos;re <em>ready.</em></h1>
        <p>Your crews. Your fieldwork. One connected workspace to move from first dispatch to final assessment.</p>
        <div className="cc-auth-stages">
          {['Coordinate', 'Dispatch', 'Assess'].map((stage, index) => <div key={stage}><span>0{index + 1}</span><strong>{stage}</strong><ArrowUpRight className="size-4" /></div>)}
        </div>
      </div>
      <div className="cc-auth-story-footer relative z-10"><span>GRID ELECTRIC CORP</span><Zap className="size-4 text-grid-lightning" /><span>FIELD TO COMMAND</span></div>
    </aside>
    <main className="cc-auth-main">
      <div className="cc-auth-form animate-lift-in"><p className="cc-eyebrow mb-8">Your operations workspace</p>{children}<p className="cc-auth-footnote">Central Command · Grid Electric Corp</p></div>
    </main>
  </div>;
}
