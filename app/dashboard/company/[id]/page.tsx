import { redirect } from 'next/navigation';

export default function LegacyCompanyDashboardPage() {
  redirect('/dashboard/company');
}