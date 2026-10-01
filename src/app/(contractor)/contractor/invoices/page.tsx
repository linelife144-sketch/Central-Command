import { redirect } from 'next/navigation';

// Invoicing is handled by the external billing company. Retire old bookmarks.
export default function RetiredInvoicePage() {
  redirect('/tickets');
}
