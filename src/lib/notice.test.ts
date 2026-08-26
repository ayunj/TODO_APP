import { describe, expect, it } from 'vitest';
import { stillHushed } from './notice';

/*
  `shouldShow`는 폰을 읽어서(`localStorage`) 여기서 못 부른다.
  셈만 떼어낸 `stillHushed`를 본다 — 틀리면 아픈 데는 셈이다.
*/
describe('오늘 다시 열지 않기', () => {
  const v = '2026-08-26T10:00:00Z';

  it('누른 적이 없으면 띄운다', () => {
    expect(stillHushed(undefined, v, '2026-08-26')).toBe(false);
  });

  it('누른 그 날은 안 띄운다', () => {
    expect(stillHushed({ v, until: '2026-08-26' }, v, '2026-08-26')).toBe(true);
  });

  it('날이 바뀌면 다시 띄운다', () => {
    expect(stillHushed({ v, until: '2026-08-26' }, v, '2026-08-27')).toBe(false);
  });

  /*
    **고쳐 올린 공지는 새 공지다.** 눌러둔 것을 그대로 두면 글을 고쳐도 안 뜨고,
    그러면 고친 뜻이 없다.
  */
  it('공지를 고치면 눌러둔 것이 무른다', () => {
    expect(stillHushed({ v, until: '2026-08-26' }, '2026-08-26T11:00:00Z', '2026-08-26')).toBe(
      false,
    );
  });
});
