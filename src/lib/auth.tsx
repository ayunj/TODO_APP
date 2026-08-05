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
  /** 재설정 메일 보내기 */
  sendReset: (email: string) => Promise<void>;
  /** 메일 링크로 돌아온 참인지 — 새 비밀번호를 정해야 하는 상태 */
  recovering: boolean;
  setPassword: (password: string) => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

/** Supabase가 돌려주는 영어 오류를 그대로 보여주지 않는다 */
function readable(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);

  // 너무 자주 눌렀을 때. 몇 초 남았는지가 알맹이라 숫자를 살려서 옮긴다.
  const waiting = raw.match(/only request this after (\d+) seconds?/i);
  if (waiting) return `조금 빨랐어요. ${waiting[1]}초 뒤에 다시 눌러주세요`;

  const map: [RegExp, string][] = [
    [/invalid login credentials/i, '이메일이나 비밀번호가 맞지 않습니다'],
    [/user already registered/i, '이미 가입된 이메일입니다. 로그인해주세요'],
    [/password should be at least/i, '비밀번호는 여섯 자 이상으로 해주세요'],
    [/unable to validate email|invalid format/i, '이메일 주소를 다시 확인해주세요'],
    [/email not confirmed/i, '가입 확인 메일을 먼저 열어주세요'],
    [/email rate limit|over_email_send_rate|too many requests/i, '잠시 뒤에 다시 시도해주세요'],
    [/signups? (not allowed|is disabled)/i, '지금은 새 가입을 받지 않습니다'],
    [/anonymous sign-ins are disabled/i, '초대 링크로 들어오는 기능이 아직 꺼져 있습니다'],
    [/failed to fetch|network|load failed/i, '연결이 되지 않습니다. 인터넷을 확인해주세요'],
  ];
  return map.find(([pattern]) => pattern.test(raw))?.[1] ?? raw;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(hasSupabase);
  const [recovering, setRecovering] = useState(false);

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

      const { data: sub } = client.auth.onAuthStateChange((event, session) => {
        // 메일 링크로 돌아오면 세션은 생기지만 아직 새 비밀번호를 안 정한 상태다
        if (event === 'PASSWORD_RECOVERY') setRecovering(true);
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
    setRecovering(false);
  }, []);

  const sendReset = useCallback(async (email: string) => {
    const client = await supabase();
    const { error } = await client.auth.resetPasswordForEmail(email.trim(), {
      // 메일 속 링크를 눌렀을 때 돌아올 곳
      redirectTo: window.location.origin,
    });
    if (error) throw new Error(readable(error));
  }, []);

  const setPassword = useCallback(async (password: string) => {
    const client = await supabase();
    const { error } = await client.auth.updateUser({ password });
    if (error) throw new Error(readable(error));
    setRecovering(false);
    // 주소에 남은 토큰을 지운다 — 새로고침하면 또 재설정 화면이 뜬다
    window.history.replaceState(null, '', window.location.pathname);
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
      sendReset,
      recovering,
      setPassword,
    }),
    [loading, account, signIn, signUp, signInAsGuest, signOut, sendReset, recovering, setPassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('AuthProvider 안에서만 쓸 수 있습니다');
  return ctx;
}
