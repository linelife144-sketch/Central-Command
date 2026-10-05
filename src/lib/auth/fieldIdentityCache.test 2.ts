import { beforeEach, expect, it, vi } from 'vitest';
import { clearPrivateBrowserState, readVerifiedFieldProfile, saveVerifiedFieldProfile } from './fieldIdentityCache';
import type { User } from '@/types';
const worker:User={id:'6dbf50c8-f608-4e09-8d5f-3fe884f4b799',role:'CONTRACTOR',email:'qa@example.test',first_name:'QA',last_name:'Worker',is_active:true,is_email_verified:true,created_at:'2026-10-04',updated_at:'2026-10-04'};
beforeEach(()=>{localStorage.clear();vi.useRealTimers();});
it('only recovers the previously verified contractor identity for the same session',()=>{saveVerifiedFieldProfile(worker);expect(readVerifiedFieldProfile(worker.id)?.role).toBe('CONTRACTOR');expect(readVerifiedFieldProfile('another-account')).toBeNull();saveVerifiedFieldProfile({...worker,role:'SUPER_ADMIN'});expect(readVerifiedFieldProfile(worker.id)).toBeNull();});
it('expires offline identities and clears them on sign out',async()=>{vi.useFakeTimers();saveVerifiedFieldProfile(worker);vi.advanceTimersByTime(24*60*60*1000+1);expect(readVerifiedFieldProfile(worker.id)).toBeNull();vi.useRealTimers();saveVerifiedFieldProfile(worker);await clearPrivateBrowserState();expect(readVerifiedFieldProfile(worker.id)).toBeNull();});
