'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { hasSupabase, supabase } from './supabase';

export interface Account {
  id: string;
  /** 초대 링크로 들어온 사람은 이메일이 없다 */
  email: string | null;
  /** 가입 없이 링크만 열고 들어왔는지 */
  guest: boolean;
}

interface AuthValue {
  /** 열쇠가 없으면 로그인 자체를 걸지 않는다 (1단계 그대로) */
  enabled: boolean;
  loading: boolean;
  account: Account | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  /** 초대 링크로 들어온 사람 — 이름만 받고 들여보낸다 */
  signInAsGuest: (displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

/** Supabase가 돌려주는 영어 오류를 그대로 보여주지 않는다 */
function readable(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  const map: [RegExp, string][] = [
    [/invalid login credentials/i, '이메일이나 비밀번호가 맞지 않습니다'],
    [/user already registered/i, '이미 가입된 이메일입니다. 로그인해주세요'],
    [/password should be at least/i, '비밀번호는 여섯 자 이상으로 해주세요'],
    [/unable to validate email|invalid format/i, '이메일 주소를 다시 확인해주세요'],
    [/email rate limit|over_email_send_rate/i, '잠시 뒤에 다시 시도해주세요'],
    [/anonymous sign-ins are disabled/i, '초대 링크로 들어오는 기능이 아직 꺼져 있습니다'],
    [/failed to fetch|network/i, '연결이 되지 않습니다. 인터넷을 확인해주세요'],
  ];
  return map.find(([pattern]) => pattern.test(raw))?.[1] ?? raw;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(hasSupabase);

  useEffect(() => {
    if (!hasSupabase) return;
    let alive = true;
    let stop: (() => void) | null = null;

    const read = (user: { id: string; email?: string; is_anonymous?: boolean } | undefined) =>
      user ? { id: user.id, email: user.email ?? null, guest: Boolean(user.is_anonymous) } : null;

    supabase().then(async (client) => {
      const { data } = await client.auth.getSession();
      if (!alive) return;
      setAccount(read(data.session?.user));
      setLoading(false);

      const { data: sub } = client.auth.onAuthStateChange((_event, session) => {
        setAccount(read(session?.user));
        setLoading(false);
      });
      stop = () => sub.subscription.unsubscribe();
    });

    return () => {
      alive = false;
      stop?.();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const client = await supabase();
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw new Error(readable(error));
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const client = await supabase();
    const { error } = await client.auth.signUp({ email, password });
    if (error) throw new Error(readable(error));
  }, []);

  const signInAsGuest = useCallback(async (displayName: string) => {
    const client = await supabase();
    const { error } = await client.auth.signInAnonymously({
      options: { data: { display_name: displayName.trim() } },
    });
    if (error) throw new Error(readable(error));
  }, []);

  const signOut = useCallback(async () => {
    const client = await supabase();
    await client.auth.signOut();
    setAccount(null);
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      enabled: hasSupabase,
      loading,
      account,
      signIn,
      signUp,
      signInAsGuest,
      signOut,
    }),
    [loading, account, signIn, signUp, signInAsGuest, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('AuthProvider 안에서만 쓸 수 있습니다');
  return ctx;
}
