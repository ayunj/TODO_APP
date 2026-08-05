/**
 * id는 uuid로 만든다 — 서버 컬럼이 uuid라서 그대로 올릴 수 있어야 한다.
 * randomUUID가 없는 곳(옛 브라우저, https 아닌 곳)에서는 같은 모양으로 흉내 낸다.
 */
export const uid = (): string => {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();

  const bytes = new Uint8Array(16);
  if (c?.getRandomValues) c.getRandomValues(bytes);
  else for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);

  bytes[6] = (bytes[6] & 0x0f) | 0x40; // 버전 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // 변형
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

/** uuid 모양인지 — 옛날 방식으로 만들어진 id를 가려내는 데 쓴다 */
export const isUuid = (value: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export const stamp = (): string => new Date().toISOString();
