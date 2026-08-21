"""글씨 고르는 화면을 만든다 — 같은 홈 시안을 글꼴 넷으로 찍어 나란히 놓는다.

    pip install fonttools brotli
    python scripts/build-font-compare.py [--src "온글잎 ttf가 있는 폴더"]

`design/dodudu-home.html`(홈 시안)에서 CSS·그림·화면 마크업을 그대로 떼어다 글씨만 바꿔
네 벌로 찍고 `design/font-compare.html`로 쓴다. 시안을 고치면 이걸 다시 돌린다.

**글꼴 원본은 저장소에 없다.**

- 온글잎 셋은 받은 자리(기본값: 내려받기 폴더)에서 읽는다. 없으면 어느 파일인지 알려주고 멈춘다.
- 지금 앱이 쓰는 고운돋움·본고딕은 구글 폰트라 없으면 `.fontcache/`로 내려받는다.

넷 다 합쳐 25MB가 넘어서 그대로는 못 넣는다. 대신 이 페이지에 나오는 글자만 잘라
결과 파일 안에 박는다 — 그래서 만들어진 html은 혼자서도 열린다.
"""

import argparse
import base64
import io
import re
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MOCK = ROOT / 'design' / 'dodudu-home.html'
OUT = ROOT / 'design' / 'font-compare.html'
CACHE = ROOT / '.fontcache'

GH = 'https://raw.githubusercontent.com/google/fonts/main/ofl'

# 글꼴마다 글자가 네모칸에 비해 크게도 작게도 그려져 있다. 그냥 두면 손글씨만 작아 보여서
# 획이 아니라 크기를 비교하게 된다. 한글 살 높이를 재서 같아 보이는 배율로 맞춰 둔 값이다.
# 고운돋움·본고딕은 글자가 큼직해서 오히려 줄여야 나란해진다.
FACES = {
    'AppTitle': {
        'file': 'GowunDodum-Regular.ttf',
        'url': f'{GH}/gowundodum/GowunDodum-Regular.ttf',
        'adjust': '86%',
    },
    'AppBody': {
        'file': 'NotoSansKR[wght].ttf',
        'url': f'{GH}/notosanskr/NotoSansKR%5Bwght%5D.ttf',
        'adjust': '87%',
        'wght': 400,
    },
    'Uiyeon': {'file': '온글잎 의연체.ttf', 'adjust': '128%'},
    'Ttaerom': {'file': '온글잎 때롬체.ttf', 'adjust': '113%'},
    'Gongbu': {'file': '온글잎 공부잘하자나.ttf', 'adjust': '104%'},
}

# 첫 칸이 지금 쓰는 글씨다 — 무엇과 견주는지가 먼저 보여야 한다
COLUMNS = [
    {
        'key': 'app',
        'name': '지금 앱 글씨',
        'note': '고운돋움 + 본고딕 · 구글 폰트',
        'display': 'AppTitle',
        'body': 'AppBody',
    },
    {
        'key': 'uiyeon',
        'name': '온글잎 의연체',
        'note': '한글 11,172자 — 다 있다 · 원본 7.8MB',
        'body': 'Uiyeon',
    },
    {
        'key': 'ttaerom',
        'name': '온글잎 때롬체',
        'note': '한글 2,780자 — 흔한 글자만 · 원본 1.2MB',
        'body': 'Ttaerom',
    },
    {
        'key': 'gongbu',
        'name': '온글잎 공부잘하자나',
        'note': '한글 2,350자 — 흔한 글자만 · 원본 1.0MB',
        'body': 'Gongbu',
    },
]

# 견본 — 홈 화면에서 실제로 쓰는 글과 크기 그대로. 작은 글씨가 읽히는지가 갈림길이다.
# 네 번째 칸이 True면 제목용 글꼴로 찍는다 (지금 앱은 제목만 고운돋움이라 그렇다).
SPECIMEN = [
    ('인사', '23px', '오늘도 도도두와 함께해요 :)', True),
    ('카드 제목', '22px', '오늘의 할 일', True),
    ('할 일', '19px', '화장실 청소', False),
    ('배지', '15.5px', 'D-1 오늘 3개 남음', False),
    ('주기 메타', '12.5px', '매 30일마다 · 마지막 5/20', False),
    ('탭 이름', '11.5px', '홈 일정 장보기 우리집', False),
]

FALLBACK = "'Gowun Dodum', 'Apple SD Gothic Neo', sans-serif"


def face_path(name: str, src: Path) -> Path:
    """글꼴 원본이 있는 자리. 구글 폰트는 없으면 받아 둔다."""
    face = FACES[name]
    if 'url' in face:
        CACHE.mkdir(exist_ok=True)
        path = CACHE / face['file']
        if not path.exists():
            print(f'  받는 중: {face["file"]}')
            urllib.request.urlretrieve(face['url'], path)
        return path
    return src / face['file']


def slice_mock(html: str):
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
    """같은 화면을 여러 번 놓기 때문에 이름표(id)가 겹친다. 자리마다 다르게 고쳐 준다."""
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


def subset_face(path: Path, text: str, wght) -> bytes:
    from fontTools import subset
    from fontTools.ttLib import TTFont

    font = TTFont(path)
    if wght is not None and 'fvar' in font:
        # 본고딕은 굵기가 이어진 한 벌이다. 쓰는 굵기 하나만 뽑아 무게를 줄인다.
        from fontTools.varLib import instancer

        font = instancer.instantiateVariableFont(font, {'wght': wght})

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
    height: 928px;
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
    max-width: 1400px;
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
    grid-template-columns: repeat(4, 1fr);
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
  .spec-cell.is-base { border-color: var(--edge); }
  .spec-who {
    font-size: 11px;
    letter-spacing: .04em;
    color: var(--ink3);
  }
  .spec-text {
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
  .foot p { margin: 0 0 10px; }

  @media (max-width: 1100px) {
    .spec-cells { grid-template-columns: repeat(2, 1fr); }
  }
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


def build_page(css: str, defs: str, phone: str) -> str:
    cols, extra_css = [], []
    for i, c in enumerate(COLUMNS):
        body, display = c['body'], c.get('display', c['body'])
        cols.append(
            f'''    <section class="col col-{c['key']}" style="--hand: '{body}', {FALLBACK}">
      <div class="tag">
        <span class="tag-name">{c['name']}</span>
        <span class="tag-meta">{c['note']}</span>
      </div>
{one_phone(phone, i)}
    </section>'''
        )
        if display != body:
            # 지금 앱은 제목만 고운돋움이고 나머지는 본고딕이다. 그 짝을 그대로 살린다.
            extra_css.append(
                f"""  .col-{c['key']} .tag-name,
  .col-{c['key']} .logo,
  .col-{c['key']} .hello-words,
  .col-{c['key']} .card-title {{ font-family: '{display}', {FALLBACK}; }}"""
            )

    spec_html = []
    for label, size, text, is_display in SPECIMEN:
        cells = ''
        for c in COLUMNS:
            fam = c.get('display', c['body']) if is_display else c['body']
            base = ' is-base' if c['key'] == 'app' else ''
            cells += f'''
        <div class="spec-cell{base}">
          <span class="spec-who">{c['name']}</span>
          <span class="spec-text" style="font-family: '{fam}', {FALLBACK}; font-size: {size}">{text}</span>
        </div>'''
        spec_html.append(
            f'''    <div class="spec-row">
      <div class="spec-label"><b>{label}</b> {size}</div>
      <div class="spec-cells">{cells}
      </div>
    </div>'''
        )

    nl = chr(10)
    return f'''<title>도도두 글씨 고르기</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Gowun+Dodum&display=swap">

<!--
  scripts/build-font-compare.py가 만든 파일이다. 직접 고치면 다음에 지워진다.
  화면 생김새는 design/dodudu-home.html에서, 글씨는 원본 ttf에서 온다.
-->

<style>
FACES
</style>

<style>{css}</style>

<style>{PAGE_CSS}
{nl.join(extra_css)}
</style>

{defs}

<header class="head">
  <h1>어느 글씨로 할까요</h1>
  <p>같은 홈 화면을 글씨만 바꿔 넷으로 찍었어요. 맨 왼쪽이 지금 앱이 쓰는 글씨(제목은 고운돋움, 본문은 본고딕)고 나머지 셋이 온글잎입니다. 크기는 넷이 같아 보이게 맞춰 뒀으니 획과 느낌만 보면 됩니다. 동그라미를 눌러보면 움직이는 것까지 그대로예요.<span class="swipe-hint"> 옆으로 넘겨 보세요.</span></p>
</header>

<div class="rail">
{nl.join(cols)}
</div>

<section class="spec">
  <h2>같은 글, 같은 크기</h2>
  <p>화면에서 실제로 쓰는 글과 크기 그대로. 작은 글씨가 읽히는지가 갈림길입니다.</p>
{nl.join(spec_html)}
</section>

<div class="foot">
  <p><b>크기는 맞춰 뒀습니다</b> — 글꼴마다 글자가 네모칸에 비해 크게도 작게도 그려져 있어서, 같은 크기로 두면 손글씨만 작아 보입니다.
  한글 살 높이를 재서 넷이 같아 보이는 배율로 맞췄어요. 그래서 여기서 갈리는 건 크기가 아니라 획입니다.</p>
  <p><b>없는 글자가 있습니다</b> — 지금 앱 글씨와 의연체는 한글 11,172자가 다 들어 있어 어떤 낱말을 적어도 같은 글씨로 나옵니다.
  때롬체와 공부잘하자나는 흔한 글자만 있어서 드문 글자(이름·옛말 같은 것)는 다른 글씨로 튑니다.
  할 일 제목을 사람이 직접 적는 앱이라 이건 한 번 짚고 갈 일이에요.</p>
  <p><b>무게</b> — 온글잎 셋은 앱에 넣을 때 쓰는 글자만 잘라 씁니다(지금 시안이 61KB). 구글 폰트는 브라우저가 알아서 나눠 받고요.</p>
</div>

<script>{PAGE_JS}</script>
'''


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--src', default=str(Path.home() / 'Downloads'), help='온글잎 ttf가 있는 폴더')
    args = ap.parse_args()
    src = Path(args.src)

    missing = [f['file'] for f in FACES.values() if 'url' not in f and not (src / f['file']).exists()]
    if missing:
        print(f'{src}에 없는 글꼴: ' + ', '.join(missing), file=sys.stderr)
        return 1

    css, defs, phone = slice_mock(io.open(MOCK, encoding='utf-8').read())
    page = build_page(css, defs, phone)

    faces = []
    for name, face in FACES.items():
        data = subset_face(face_path(name, src), page, face.get('wght'))
        b64 = base64.b64encode(data).decode('ascii')
        faces.append(
            f"""  @font-face {{
    font-family: '{name}';
    src: url(data:font/woff2;base64,{b64}) format('woff2');
    font-weight: 400;
    font-style: normal;
    font-display: swap;
    size-adjust: {face['adjust']};
  }}"""
        )
        print(f'  {name}: {len(data) / 1024:.0f}KB')

    page = page.replace('FACES', '\n'.join(faces), 1)
    io.open(OUT, 'w', encoding='utf-8', newline='\n').write(page)
    print(f'{OUT.name} · {len(page) / 1024:.0f}KB')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
