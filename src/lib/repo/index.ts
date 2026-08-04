import type { Repository } from '../repository';
import { IndexedDbRepository } from './indexeddb';
import { MemoryRepository } from './memory';

let instance: Repository | null = null;

/**
 * 앱 전체에서 저장소를 얻는 유일한 통로.
 * 2단계에서는 여기만 SupabaseRepository로 바꾸면 된다.
 */
export function getRepository(): Repository {
  if (!instance) {
    instance =
      typeof indexedDB === 'undefined' ? new MemoryRepository() : new IndexedDbRepository();
  }
  return instance;
}
