// Type declarations for @supabase/ssr
// This fixes the missing "types" field in the package.json

declare module '@supabase/ssr' {
  import { SupabaseClient } from '@supabase/supabase-js';

  export interface CookieOptions {
    name?: string;
    value?: string;
    domain?: string;
    path?: string;
    expires?: Date;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
  }

  export interface CookieMethods {
    get(name: string): string | undefined;
    set(name: string, value: string, options?: any): void;
    remove(name: string, options?: any): void;
  }

  export interface CreateServerClientOptions {
    cookies: CookieMethods;
  }

  export function createServerClient<Database = any>(
    supabaseUrl: string,
    supabaseKey: string,
    options: CreateServerClientOptions
  ): SupabaseClient<Database>;

  export function createBrowserClient<Database = any>(
    supabaseUrl: string,
    supabaseKey: string
  ): SupabaseClient<Database>;
}
