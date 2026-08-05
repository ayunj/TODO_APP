'use client';

import { useState } from 'react';
import WelcomeArt from '@/components/WelcomeArt';
import { useAuth } from '@/lib/auth';

/** 재설정 메일의 링크를 눌러 돌아왔을 때. 새 비밀번호를 정하기 전까지 여기 머문다. */
export default function NewPasswordScreen() {
  const { setPassword, signOut } = useAuth();
  const [password, setValue] = useState('');
  const [again, setAgain] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (password.length < 6) return setError('비밀번호는 여섯 자 이상으로 해주세요');
    if (password !== again) return setError('두 번 적은 비밀번호가 다릅니다');

    setError('');
    setBusy(true);
    try {
      await setPassword(password);
    } catch (e) {
      setError(e instanceof Error ? e.message : '잠시 뒤에 다시 시도해주세요');
    } finally {
      setBusy(false);
    }
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
        새 비밀번호
      </h2>
      <p className="mb-[26px] mt-[9px] text-center text-[13.5px] leading-[1.7] text-ink3">
        새로 쓸 비밀번호를 정해주세요.
        <br />
        정하고 나면 바로 들어갑니다.
      </p>

      <form
        className="flex flex-col gap-2.5"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <input
          type="password"
          className="field-input"
          placeholder="새 비밀번호 (여섯 자 이상)"
          autoComplete="new-password"
          autoFocus
          value={password}
          onChange={(e) => setValue(e.target.value)}
        />
        <input
          type="password"
          className="field-input"
          placeholder="한 번 더"
          autoComplete="new-password"
          value={again}
          onChange={(e) => setAgain(e.target.value)}
        />

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
          {busy ? '잠시만요…' : '이걸로 정하기'}
        </button>
      </form>

      <button
        type="button"
        onClick={() => void signOut()}
        className="mb-auto mt-3.5 py-2 text-center text-[13px] text-ink3"
      >
        그만두기
      </button>
    </div>
  );
}
