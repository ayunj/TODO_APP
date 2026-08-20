"""시안 HTML 안에 박아 넣는 글꼴 조각을 다시 만든다.

    pip install fonttools brotli
    python scripts/subset-mock-font.py

`public/fonts/uiyeon.woff2`(온글잎 의연체)에서 `docs/app/design/dodudu-home.html`에
**실제로 나오는 글자만** 골라 base64로 그 파일의 `uiyeon-font-start` ~ `uiyeon-font-end`
사이에 다시 쓴다. 60KB 남짓이라 한 파일로 열어도 글꼴이 같이 따라온다.

시안은 서버 없이 파일 하나로 열리고 아티팩트로도 올라가야 한다. 바깥에서 글꼴을
불러오는 길이 막혀 있어서(구글 폰트만 열려 있다) 파일 안에 넣는 것 말고는 방법이 없다.

**시안의 글을 고쳤으면 이걸 한 번 돌린다.** 안 그러면 새로 적은 글자만 다른 글꼴로
찍힌다 — 없는 글자는 조용히 대체 글꼴로 넘어가서 눈에 잘 안 띈다.
"""

import base64
import io
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FONT = ROOT / 'public' / 'fonts' / 'uiyeon.woff2'
HTML = ROOT / 'docs' / 'app' / 'design' / 'dodudu-home.html'

BLOCK = re.compile(
    r'(/\* uiyeon-font-start.*?src: url\(data:font/woff2;base64,)([^)]*)(\).*?/\* uiyeon-font-end \*/)',
    re.S,
)

# 글자가 바뀌어도 안 깨지게 늘 넣어두는 것 — 라틴·숫자·기본 문장부호
ALWAYS = set(range(0x20, 0x7F))


def main() -> int:
    try:
        from fontTools import subset
        from fontTools.ttLib import TTFont
    except ImportError:
        print('fonttools가 없다:  pip install fonttools brotli', file=sys.stderr)
        return 1

    html = io.open(HTML, encoding='utf-8').read()
    m = BLOCK.search(html)
    if not m:
        print(f'{HTML.name}에서 uiyeon-font-start 표시선을 못 찾았다', file=sys.stderr)
        return 1

    # 지금 박혀 있는 base64는 글자 세는 데서 뺀다
    text = html[: m.start(2)] + html[m.end(2) :]
    unicodes = sorted({ord(c) for c in text if ord(c) > 0x1F} | ALWAYS)

    font = TTFont(FONT)
    opt = subset.Options()
    opt.flavor = 'woff2'
    opt.layout_features = ['*']
    opt.name_IDs = ['*']  # 만든 사람 이름을 지우지 않는다
    opt.notdef_outline = True
    sub = subset.Subsetter(options=opt)
    sub.populate(unicodes=unicodes)
    sub.subset(font)

    buf = io.BytesIO()
    font.flavor = 'woff2'
    font.save(buf)
    blob = base64.b64encode(buf.getvalue()).decode('ascii')

    io.open(HTML, 'w', encoding='utf-8', newline='\n').write(
        html[: m.start(2)] + blob + html[m.end(2) :]
    )
    print(f'글자 {len(unicodes)}자 · {len(buf.getvalue()) / 1024:.0f}KB → {HTML.name}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
