import { z } from 'zod';
import type { User } from '@/types';
const cacheKey = 'cc-verified-field-profile';
const fieldProfile = z.object({ id:z.string().uuid(),role:z.literal('CONTRACTOR'),email:z.string(),first_name:z.string(),last_name:z.string(),is_active:z.literal(true),is_email_verified:z.boolean(),created_at:z.string(),updated_at:z.string() }).passthrough();
export function saveVerifiedFieldProfile(profile: User): void {
  if (typeof localStorage==='undefined') return;
  if (profile.role!=='CONTRACTOR'||!profile.is_active) {localStorage.removeItem(cacheKey);return;}
  const parsed=fieldProfile.safeParse(profile);
  if(parsed.success) localStorage.setItem(cacheKey,JSON.stringify({profile:parsed.data,expiresAt:Date.now()+24*60*60*1000}));
}
export function readVerifiedFieldProfile(userId:string): User|null {
  if(typeof localStorage==='undefined') return null;
  try {const saved=JSON.parse(localStorage.getItem(cacheKey)||'null');const parsed=fieldProfile.safeParse(saved?.profile);return parsed.success&&parsed.data.id===userId&&saved.expiresAt>Date.now()?parsed.data as User:null;}catch{return null;}
}
export async function clearPrivateBrowserState(): Promise<void> {
  if(typeof localStorage!=='undefined') localStorage.removeItem(cacheKey);
  if(typeof caches==='undefined') return;
  const names=await caches.keys();await Promise.all(names.filter(name=>/^grid-electric-(api|dynamic|images)-/.test(name)).map(name=>caches.delete(name)));
}
