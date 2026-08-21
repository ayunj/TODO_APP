"""글씨 고르는 화면을 만든다 — 같은 홈 시안을 온글잎 셋으로 찍어 나란히 놓는다.

    pip install fonttools brotli
    python scripts/build-font-compare.py [--src "폰트 들어 있는 폴더"]

`docs/app/design/dodudu-home.html`(홈 시안)에서 CSS·그림·화면 마크업을 그대로 떼어다
글씨만 바꿔 세 벌로 찍고, `docs/app/design/font-compare.html`로 쓴다.
시안을 고치면 이걸 다시 돌려야 비교 화면도 따라온다.

**원본 ttf는 저장소에 없다.** 셋 다 합쳐 10MB가 넘어서 받은 자리(내려받기 폴더)에 두고
쓰는 글자만 잘라 결과 파일 안에 박는다. 그래서 만들어진 html은 혼자서도 열리지만,
**다시 만들려면 원본 세 개가 있어야 한다.** 없으면 어느 파일이 없는지 알려주고 멈춘다.
"""

import argparse
import base64
import io
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MOCK = ROOT / 'docs' / 'app' / 'design' / 'dodudu-home.html'
OUT = ROOT / 'docs' / 'app' / 'design' / 'font-compare.html'

# 글꼴마다 글자가 네모칸에 비해 크게도 작게도 그려져 있다. 그냥 두면 크기가 제각각으로
# 보여서 비교가 안 된다. 한글 살 높이를 재서 같아 보이는 배율을 미리 계산해 둔 값이다.
# (scripts로 다시 재려면 아래 measure()를 쓴다)
FONTS = [
    {
        'key': 'uiyeon',
        'family': 'Uiyeon',
        'name': '온글잎 의연체',
        'file': '온글잎 의연체.ttf',
        'adjust': '128%',
        'note': '한글 11,172자 — 다 있다',
    },
    {
        'key': 'ttaerom',
        'family': 'Ttaerom',
        'name': '온글잎 때롬체',
        'file': '온글잎 때롬체.ttf',
        'adjust': '113%',
        'note': '한글 2,780자 — 흔한 글자만',
    },
    {
        'key': 'gongbu',
        'family': 'Gongbu',
        'name': '온글잎 공부잘하자나',
        'file': '온글잎 공부잘하자나.ttf',
        'adjust': '104%',
        'note': '한글 2,350자 — 흔한 글자만',
    },
]

# 견본 — 홈 화면에서 실제로 쓰는 글과 크기 그대로. 작은 글씨가 읽히는지가 갈림길이다.
SPECIMEN = [
    ('인사', '23px', '오늘도 도도두와 함께해요 :)'),
    ('카드 제목', '22px', '오늘의 할 일'),
    ('할 일', '19px', '화장실 청소'),
    ('배지', '15.5px', 'D-1 오늘 3개 남음'),
    ('주기 메타', '12.5px', '매 30일마다 · 마지막 5/20'),
    ('탭 이름', '11.5px', '홈 일정 장보기 우리집'),
]


def slice_mock(html: str) -> tuple[str, str, str]:
    """홈 시안에서 본문 CSS · 아이콘 정의 · 화면 마크업을 떼어 온다."""
    styles = re.findall(r'<style>(.*?)</style>', html, re.S)
    if len(styles) < 2:
        raise SystemExit('홈 시안의 <style> 두 덩이를 못 찾았다')
    css = styles[1]  # 첫 덩이는 @font-face — 여기선 새로 쓴다

    i = html.index('<svg width="0" height="0"')
    defs = html[i : html.index('</svg>', i) + len('</svg>')]

    j = html.index('<div class="phone">')
    phone = html[j : html.index('<p class="caption">', j)].strip()
    return css, defs, phone


def one_phone(phone: str, idx: int) -> str:
    """같은 화면을 세 번 놓기 때문에 이름표(id)가 겹친다. 자리마다 다르게 고쳐 준다."""
    out = phone
    out = out.replace('id="left-pill"', 'data-left')
    out = out.replace('id="done-count"', 'data-done')
    out = out.replace('id="toast"', 'data-toast')
    for name in ('today-title', 'cycle-title'):
        out = out.replace(f'"{name}"', f'"{name}-{idx}"')
    return out


def measure(path: Path) -> float:
    """한글 살 높이의 평균 — 배율을 다시 잡을 때 쓴다."""
    from fontTools.pens.boundsPen import BoundsPen
    from fontTools.ttLib import TTFont

    f = TTFont(path)
    upem = f['head'].unitsPerEm
    cmap, gs = f.getBestCmap(), f.getGlyphSet()
    hs = []
    for ch in '안녕하세요오늘도할일화장실청소빨래장보기주기도래':
        g = cmap.get(ord(ch))
        if not g:
            continue
        bp = BoundsPen(gs)
        gs[g].draw(bp)
        if bp.bounds:
            hs.append((bp.bounds[3] - bp.bounds[1]) / upem)
    return sum(hs) / len(hs)


def subset(path: Path, text: str) -> bytes:
    from fontTools import subset
    from fontTools.ttLib import TTFont

    font = TTFont(path)
    opt = subset.Options()
    opt.flavor = 'woff2'
    opt.layout_features = ['*']
    opt.name_IDs = ['*']  # 만든 사람 이름을 지우지 않는다
    opt.notdef_outline = True
    sub = subset.Subsetter(options=opt)
    sub.populate(unicodes=sorted({ord(c) for c in text if ord(c) > 0x1F} | set(range(0x20, 0x7F))))
    sub.subset(font)
    buf = io.BytesIO()
    font.flavor = 'woff2'
    font.save(buf)
    return buf.getvalue()


PAGE_CSS = """
  /* ─────────────── 고르는 화면 ─────────────── */

  /*
   * 폰 안쪽 색(--ink)은 늘 밝은 바탕을 깔고 쓰는 색이다. 바깥 글에 그대로 쓰면
   * 어두운 화면에서 어두운 바탕에 어두운 글씨가 된다. 바깥 제목은 따로 둔다.
   * (견본 칸은 종이라서 어느 쪽에서나 밝다 — 그건 --card/--ink 그대로 쓴다)
   */
  :root { --page-title: #4b443e; }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) { --page-title: #f2e8da; }
  }
  :root[data-theme="dark"] { --page-title: #f2e8da; }

  body {
    display: block;
    padding: 0 0 56px;
    background: var(--page);
  }

  .head {
    max-width: 760px;
    margin: 0 auto;
    padding: 44px 22px 26px;
  }
  .head h1 {
    margin: 0;
    font-size: 30px;
    font-weight: 400;
    letter-spacing: -.02em;
    color: var(--page-title);
  }
  .head p {
    margin: 8px 0 0;
    max-width: 46ch;
    font-size: 14.5px;
    line-height: 1.7;
    color: var(--page-ink);
  }
  .swipe-hint { display: none; }

  .rail {
    display: flex;
    gap: 26px;
    align-items: flex-start;
    overflow-x: auto;
    scroll-snap-type: x proximity;
    padding: 6px 22px 30px;
    scrollbar-width: thin;
  }
  .col {
    flex: none;
    scroll-snap-align: center;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .col .phone {
    width: min(392px, 84vw);
    height: 884px;
    min-height: 0;
    border-radius: 34px;
  }

  .tag { padding-left: 4px; }
  .tag-name {
    display: block;
    font-family: var(--hand);
    font-size: 27px;
    line-height: 1.25;
    color: var(--page-title);
  }
  .tag-meta {
    display: block;
    margin-top: 2px;
    font-size: 12px;
    color: var(--page-ink);
    font-variant-numeric: tabular-nums;
  }

  /* ─────────────── 견본 ─────────────── */

  .spec {
    max-width: 1160px;
    margin: 0 auto;
    padding: 12px 22px 0;
  }
  .spec h2 {
    margin: 0 0 4px;
    font-size: 20px;
    font-weight: 400;
    color: var(--page-title);
  }
  .spec > p {
    margin: 0 0 20px;
    font-size: 13.5px;
    color: var(--page-ink);
  }

  .spec-row {
    padding: 16px 0;
    border-top: 1px solid var(--page-line);
  }
  .spec-label {
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin-bottom: 10px;
    font-size: 12px;
    letter-spacing: .06em;
    color: var(--page-ink);
  }
  .spec-label b {
    font-weight: 400;
    font-size: 13px;
    letter-spacing: 0;
    color: var(--page-title);
  }

  .spec-cells {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }
  .spec-cell {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
    padding: 14px 16px;
    border-radius: 16px;
    background: var(--card);
    border: 1px solid var(--line);
  }
  .spec-who {
    font-size: 11px;
    letter-spacing: .04em;
    color: var(--ink3);
  }
  .spec-text {
    font-family: var(--hand);
    color: var(--ink);
    line-height: 1.6;
    overflow-wrap: anywhere;
  }

  .foot {
    max-width: 760px;
    margin: 34px auto 0;
    padding: 0 22px;
    font-size: 12.5px;
    line-height: 1.8;
    color: var(--page-ink);
  }
  .foot b { font-weight: 400; color: var(--page-title); }

  @media (max-width: 860px) {
    .spec-cells { grid-template-columns: 1fr; }
    .swipe-hint { display: inline; }
  }
  @media (max-width: 480px) {
    .head { padding: 30px 18px 20px; }
    .rail { padding: 6px 18px 26px; gap: 18px; }
    .spec, .foot { padding-left: 18px; padding-right: 18px; }
  }
"""

PAGE_JS = """
  // 폰마다 따로 논다 — 한쪽에서 체크해도 옆 화면은 그대로다
  document.querySelectorAll('.phone').forEach((phone) => {
    const tasks = Array.from(phone.querySelectorAll('.task'));
    const pill = phone.querySelector('[data-left]');
    const done = phone.querySelector('[data-done]');
    const toast = phone.querySelector('[data-toast]');
    let timer;

    const sync = () => {
      const n = tasks.filter((t) => t.classList.contains('done')).length;
      const left = tasks.length - n;
      done.textContent = n;
      pill.textContent = left > 0 ? left + '개 남음' : '다 했어요!';
      pill.classList.toggle('clear', left === 0);
    };

    tasks.forEach((t) => {
      t.addEventListener('click', () => {
        t.setAttribute('aria-pressed', String(t.classList.toggle('done')));
        sync();
      });
    });

    phone.querySelectorAll('[data-soon]').forEach((el) => {
      el.addEventListener('click', () => {
        toast.textContent = el.dataset.soon;
        toast.classList.add('on');
        clearTimeout(timer);
        timer = setTimeout(() => toast.classList.remove('on'), 1900);
      });
    });

    sync();
  });
"""


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--src', default=str(Path.home() / 'Downloads'), help='원본 ttf가 있는 폴더')
    args = ap.parse_args()
    src = Path(args.src)

    missing = [f['file'] for f in FONTS if not (src / f['file']).exists()]
    if missing:
        print(f'{src}에 없는 글꼴: ' + ', '.join(missing), file=sys.stderr)
        return 1

    css, defs, phone = slice_mock(io.open(MOCK, encoding='utf-8').read())

    cols, faces = [], []
    for i, f in enumerate(FONTS):
        stack = f"'{f['family']}', 'Gowun Dodum', 'Apple SD Gothic Neo', sans-serif"
        size = (src / f['file']).stat().st_size / 1024 / 1024
        cols.append(
            f'''    <section class="col" style="--hand: {stack}">
      <div class="tag">
        <span class="tag-name">{f['name']}</span>
        <span class="tag-meta">{f['note']} · 원본 {size:.1f}MB</span>
      </div>
{one_phone(phone, i)}
    </section>'''
        )

    # 견본은 크기별로 묶어서 셋을 나란히 놓는다
    spec_html = []
    for label, fs, text in SPECIMEN:
        cells = ''.join(
            f'''
        <div class="spec-cell" style="--hand: '{f['family']}', 'Gowun Dodum', sans-serif">
          <span class="spec-who">{f['name']}</span>
          <span class="spec-text" style="font-size: {fs}">{text}</span>
        </div>'''
            for f in FONTS
        )
        spec_html.append(
            f'''    <div class="spec-row">
      <div class="spec-label"><b>{label}</b> {fs}</div>
      <div class="spec-cells">{cells}
      </div>
    </div>'''
        )

    page = f'''<title>도도두 글씨 고르기</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Gowun+Dodum&display=swap">

<!--
  scripts/build-font-compare.py가 만든 파일이다. 직접 고치면 다음에 지워진다.
  화면 생김새는 dodudu-home.html에서, 글꼴은 원본 ttf에서 온다.
-->

<style>
FACES
</style>

<style>{css}</style>

<style>{PAGE_CSS}</style>

{defs}

<header class="head">
  <h1>어느 글씨로 할까요</h1>
  <p>같은 홈 화면을 온글잎 셋으로 찍었어요. 크기는 셋이 같아 보이게 맞춰 뒀으니 획과 느낌만 보면 됩니다. 동그라미를 눌러보면 움직이는 것까지 그대로예요.<span class="swipe-hint"> 옆으로 넘겨 보세요.</span></p>
</header>

<div class="rail">
{chr(10).join(cols)}
</div>

<section class="spec">
  <h2>같은 글, 같은 크기</h2>
  <p>화면에서 실제로 쓰는 글과 크기 그대로. 작은 글씨가 읽히는지가 갈림길입니다.</p>
{chr(10).join(spec_html)}
</section>

<p class="foot">
  <b>고를 때 볼 것 하나 더</b> — 의연체는 한글 11,172자가 다 들어 있어 어떤 낱말을 적어도 같은 글씨로 나옵니다.
  때롬체와 공부잘하자나는 흔한 글자만 있어서 드문 글자(이름·옛말 같은 것)는 다른 글씨로 튑니다.
  대신 파일이 8배 가벼워요. 앱에 넣을 땐 쓰는 글자만 잘라 쓰니 실제 무게 차이는 이보다 작습니다.
  <br>글꼴은 셋 다 온글잎 — 만든 사람의 글씨를 옮긴 것입니다.
</p>

<script>{PAGE_JS}</script>
'''

    # 이 페이지에 나오는 글자만 잘라 넣는다
    for f in FONTS:
        data = subset(src / f['file'], page)
        b64 = base64.b64encode(data).decode('ascii')
        faces.append(
            f"""  @font-face {{
    font-family: '{f['family']}';
    src: url(data:font/woff2;base64,{b64}) format('woff2');
    font-weight: 400;
    font-style: normal;
    font-display: swap;
    size-adjust: {f['adjust']};
  }}"""
        )
        print(f"  {f['name']}: {len(data) / 1024:.0f}KB")

    page = page.replace('FACES', '\n'.join(faces), 1)
    io.open(OUT, 'w', encoding='utf-8', newline='\n').write(page)
    print(f'{OUT.name} · {len(page) / 1024:.0f}KB')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
