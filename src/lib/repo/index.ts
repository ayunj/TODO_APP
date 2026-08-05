import type { Repository } from '../repository';
import { IndexedDbRepository } from './indexeddb';
import { MemoryRepository } from './memory';
import { SyncedRepository } from './synced';

let local: Repository | null = null;
let synced: { owner: string; repo: Repository } | null = null;

function localRepo(): Repository {
  if (!local) {
    local = typeof indexedDB === 'undefined' ? new MemoryRepository() : new IndexedDbRepository();
  }
  return local;
}

/**
 * 앱 전체에서 저장소를 얻는 유일한 통로.
 *
 * 로그인 전에는 이 기기 안에서만 도는 저장소를 준다.
 * 로그인하면 같은 저장소를 감싸 서버와 맞추는 것을 준다 — 화면은 둘을 구분하지 않는다.
 */
export function getRepository(owner: string | null): Repository {
  const base = localRepo();
  if (!owner) return base;
  if (synced?.owner !== owner) synced = { owner, repo: new SyncedRepository(base, owner) };
  return synced.repo;
}
