import type { Category, Priority } from './types';

/**
 * 색은 자유 입력이 아니라 이 10개 중에서만 고른다.
 * 순서대로 집안일·업무·개인·공부·건강·운동·취미·여행·쇼핑·금융을 염두에 둔 파스텔.
 */
export const PALETTE = [
  '#8EC9B5',
  '#A9B8F4',
  '#F0C58A',
  '#DDB9E9',
  '#A8D8F0',
  '#F3A8A8',
  '#A9C989',
  '#F4C7B5',
  '#E9C6A2',
  '#A8C9A5',
] as const;

/** 안 눌린 칩의 아주 옅은 바탕. 팔레트 밖의 색은 색을 섞어서 만든다. */
export const CATEGORY_TINT: Record<string, string> = {
  '#8EC9B5': '#EEF8F4',
  '#A9B8F4': '#F0F3FE',
  '#F0C58A': '#FFF8EB',
  '#DDB9E9': '#F8F0FC',
  '#A8D8F0': '#EEF8FD',
  '#F3A8A8': '#FDF1F1',
  '#A9C989': '#F3F8EE',
  '#F4C7B5': '#FFF3EE',
  '#E9C6A2': '#FCF6ED',
  '#A8C9A5': '#F2F7EE',
};

/**
 * 처음에 깔아두는 것은 둘뿐이다. 나머지는 필요할 때 직접 만든다.
 * 안 쓰는 칸이 늘어서 있으면 필터 줄만 길어진다.
 * id는 쓸 때 새로 매긴다 — 기기마다 달라야 서버에서 안 부딪힌다.
 */
export const DEFAULT_CATEGORIES: Omit<Category, 'updatedAt'>[] = [
  { id: 'home', name: '집안일', color: '#8EC9B5', order: 0 },
  { id: 'body', name: '건강', color: '#A8D8F0', order: 1 },
];

/**
 * 지난 팔레트들 → 지금 팔레트. 자리 순서를 그대로 옮긴다.
 * 이미 저장돼 있는 카테고리도 한 번만 같이 옮겨준다. 팔레트 밖에서 직접 고른 색은 건드리지 않는다.
 */
export const LEGACY_COLOR: Record<string, string> = {
  // 처음 팔레트
  '#2E7D6B': '#8EC9B5',
  '#3A2FB8': '#A9B8F4',
  '#B8801A': '#F0C58A',
  '#9B3E8C': '#DDB9E9',
  '#2F6FB3': '#A8D8F0',
  '#A93448': '#F3A8A8',
  '#4C7A2E': '#A9C989',
  '#C25E1E': '#F4C7B5',
  '#5B5578': '#E9C6A2',
  '#1F7A8C': '#A8C9A5',
  // 그 다음 팔레트
  '#4BA48E': '#8EC9B5',
  '#6F86D6': '#A9B8F4',
  '#C89033': '#F0C58A',
  '#A85FB0': '#DDB9E9',
  '#4E8FC4': '#A8D8F0',
  '#C96A72': '#F3A8A8',
  '#6E9E4E': '#A9C989',
  '#CE7440': '#F4C7B5',
  '#7B739C': '#E9C6A2',
  '#3E97A5': '#A8C9A5',
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  1: '낮음',
  2: '보통',
  3: '높음',
};

const KOREAN_NUM = ['', '한', '두', '세', '네', '다섯', '여섯', '일곱', '여덟', '아홉', '열'];
export const num = (n: number): string => (n <= 10 ? KOREAN_NUM[n] : String(n));

export const saying = (done: number, total: number): string =>
  done === 0
    ? `${num(total)} 가지가 기다리고 있어요`
    : done === total
      ? `${num(total)} 가지 모두 했어요`
      : `${num(total)} 가지 중에 ${num(done)} 가지 했어요`;
