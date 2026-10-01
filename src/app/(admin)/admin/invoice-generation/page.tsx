import Link from 'next/link';
export default function BillingStartPage() {
  return <div className="space-y-4"><h1 className="text-2xl font-semibold">Storm Billing</h1>
    <p>Open a storm workspace to generate invoices for that event.</p><Link className="text-grid-blue underline" href="/admin/storms">Select a storm event</Link></div>;
}
