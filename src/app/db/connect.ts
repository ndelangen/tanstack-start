/** biome-ignore-all lint/style/noNonNullAssertion: <environment variables are always defined> */
import { createClient } from '@supabase/supabase-js';

import type { Database } from './types';

export const db = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY!
);
