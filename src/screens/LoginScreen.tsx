'use client';

import { useEffect, useState } from 'react';
import WelcomeArt from '@/components/WelcomeArt';
import { useAuth } from '@/lib/auth';

/** 초대 링크로 들어왔는지 — ?join=코드 */
const inviteCode = () =>
  typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('join');

type Mode = 'in' | 'up' | 'forgot';

const TITLE: Record<Mode, string> = {
  in: '로그인',
  up: '계정 만들기',
  forgot: '재설정 메일 보내기',
};

/**
 * 로그인.
 * 초대 링크로 들어온 사람에게는 이름 한 칸만 보여준다 —
 * 가입을 시키려다 앱이 죽는 지점이 대부분 여기다.
 */
export default function LoginScreen() {
  const { signIn, signUp, signInAsGuest, sendReset } = useAuth();
  const [invited, setInvited] = useState(false);
  const [mode, setMode] = useState<Mode>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => setInvited(Boolean(inviteCode())), []);

  const go = (next: Mode) => {
    setMode(next);
    setError('');
    setSent(false);
  };

  const run = async (job: () => Promise<void>) => {
    setError('');
    setBusy(true);
    try {
      await job();
    } catch (e) {
      setError(e instanceof Error ? e.message : '잠시 뒤에 다시 시도해주세요');
    } finally {
      setBusy(false);
    }
  };

  const submit = () => {
    if (invited) {
      if (!name.trim()) return setError('이름을 적어주세요');
      return run(() => signInAsGuest(name));
    }
    if (!email.trim()) return setError('이메일을 적어주세요');

    if (mode === 'forgot') {
      return run(async () => {
        await sendReset(email);
        setSent(true);
      });
    }
    if (password.length < 6) return setError('비밀번호는 여섯 자 이상으로 해주세요');
    return run(() => (mode === 'up' ? signUp(email.trim(), password) : signIn(email.trim(), password)));
  };

  return (
    <div
      className="mx-auto flex min-h-[100dvh] max-w-[520px] flex-col px-5"
      style={{
        paddingTop: 'calc(24px + env(safe-area-inset-top))',
        paddingBottom: 'calc(30px + env(safe-area-inset-bottom))',
      }}
    >
      <WelcomeArt />

      <h2 className="text-center font-round text-[25px] font-normal tracking-[-0.02em]">
        {invited ? '함께 쓰기' : mode === 'forgot' ? '비밀번호 찾기' : '오늘도 하나씩'}
      </h2>
      <p className="mb-[26px] mt-[9px] text-center text-[13.5px] leading-[1.7] text-ink3">
        {invited ? (
          <>
            초대를 받으셨네요.
            <br />
            이름만 적으면 바로 시작합니다.
          </>
        ) : mode === 'forgot' ? (
          <>
            가입하신 이메일을 적어주세요.
            <br />
            새로 정할 수 있는 링크를 보내드립니다.
          </>
        ) : (
          <>
            로그인하면 백업되고, 다른 기기에서도
            <br />
            같이 쓸 수도 있어요.
          </>
        )}
      </p>

      {sent ? (
        <div className="rounded-card bg-card px-[18px] py-6 text-center text-[13px] leading-[1.8] text-ink3 shadow-card">
          <b className="mb-1.5 block font-round text-[15px] font-medium text-ink2">
            메일을 보냈습니다
          </b>
          <span className="break-all text-ink2">{email}</span>
          <br />
          메일 속 링크를 누르면 새 비밀번호를 정할 수 있어요.
          <br />
          안 왔으면 스팸함도 살펴봐 주세요.
        </div>
      ) : (
        <form
          className="flex flex-col gap-2.5"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          {invited ? (
            <input
              type="text"
              className="field-input"
              placeholder="이름 (완료 기록에 남아요)"
              autoComplete="nickname"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          ) : (
            <>
              <input
                type="email"
                className="field-input"
                placeholder="이메일"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {mode !== 'forgot' && (
                <input
                  type="password"
                  className="field-input"
                  placeholder="비밀번호 (여섯 자 이상)"
                  autoComplete={mode === 'up' ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              )}
            </>
          )}

          {error && (
            <p role="alert" className="px-1 text-[12.5px] leading-[1.6] text-high">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="mt-1.5 w-full rounded-[18px] bg-accent py-[17px] text-[15.5px] font-medium text-white shadow-fab active:scale-[.99] disabled:opacity-60"
          >
            {busy ? '잠시만요…' : invited ? '시작하기' : TITLE[mode]}
          </button>
        </form>
      )}

      {!invited && (
        <div className="mt-3.5 flex flex-col items-center gap-1">
          {mode === 'in' && (
            <>
              <button type="button" onClick={() => go('up')} className="py-2 text-[13px] text-ink3">
                계정이 없으신가요? 새로 만들기
              </button>
              <button
                type="button"
                onClick={() => go('forgot')}
                className="py-1 text-[12.5px] text-ink3"
              >
                비밀번호를 잊으셨나요?
              </button>
            </>
          )}
          {mode !== 'in' && (
            <button type="button" onClick={() => go('in')} className="py-2 text-[13px] text-ink3">
              로그인으로 돌아가기
            </button>
          )}
        </div>
      )}

      <p className="mb-auto mt-6 px-1 text-center text-[11.5px] leading-[1.7] text-ink3">
        {invited
          ? '설치도 가입도 필요 없어요. 이 링크만 있으면 됩니다.'
          : '적어둔 것은 계정에 저장돼요. 폰을 바꿔도 그대로 있습니다.'}
      </p>
    </div>
  );
}
