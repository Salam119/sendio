import { supabase } from '@/lib/supabase';

export async function getCompanyId(): Promise<string | null> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const { data: company, error } = await supabase
    .from('companies')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error || !company) {
    return null;
  }

  return company.id;
}