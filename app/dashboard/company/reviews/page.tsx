import { redirect } from 'next/navigation';

export default function ReviewsPage() {
  redirect('/dashboard/company/settings?section=reviews');
}
