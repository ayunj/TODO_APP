import type { Config } from 'tailwindcss';

/**
 * 색은 전부 CSS 변수로 뺀다.
 * --accent는 앱 강조색으로 고정이다. 카테고리 색은 그 칩과 점에만 쓴다.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        card: 'var(--card)',
        sunk: 'var(--sunk)',
        memo: 'var(--memo)',
        ink: 'var(--ink)',
        ink2: 'var(--ink2)',
        ink3: 'var(--ink3)',
        line: 'var(--line)',
        line2: 'var(--line2)',
        accent: 'var(--accent)',
        'accent-soft': 'var(--accent-soft)',
        'accent-tint': 'var(--accent-tint)',
        ok: 'var(--ok)',
        cycle: 'var(--cycle)',
        high: 'var(--high)',
        done: 'var(--done)',
        track: 'var(--track)',
        star: 'var(--star)',
        edge: 'var(--edge)',
        faint: 'var(--faint)',
        'danger-soft': 'var(--danger-soft)',
      },
      borderRadius: {
        card: '20px',
        sheet: '26px',
      },
      boxShadow: {
        card: '0 8px 24px rgba(0,0,0,.05)',
        tabs: '0 -4px 18px rgba(97,89,83,.05)',
        fab: '0 8px 24px rgba(217,122,94,.18)',
      },
      fontFamily: {
        sans: ['Noto Sans KR', 'system-ui', '-apple-system', 'sans-serif'],
        round: ['Gowun Dodum', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
