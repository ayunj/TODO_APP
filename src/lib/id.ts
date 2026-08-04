export const uid = (): string =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export const stamp = (): string => new Date().toISOString();
