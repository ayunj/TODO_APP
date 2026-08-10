'use client';

import { useState } from 'react';
import PageBar from '@/components/PageBar';
import { Group, Note, Row } from '@/components/rows';
import { ColorPicker, Field, GoButton } from '@/components/form';
import { ask } from '@/lib/ask';
import { PALETTE, tintOf } from '@/lib/constants';
import { useRooms } from '@/lib/rooms';
import { useStore } from '@/lib/store';
import { toast } from '@/lib/toast';
import { useUi } from '@/lib/ui';
import type { Category } from '@/lib/types';

/** id가 null이면 새 카테고리, 있으면 그 카테고리 설정 */
export default function CategoryScreen({ id }: { id: string | null }) {
  if (id === null) return <NewCategory />;
  return <CategorySettings id={id} />;
}

/* ───────── 새 카테고리 ───────── */

function NewCategory() {
  const { categories, addCategory } = useStore();
  const { popView } = useUi();

  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(PALETTE[categories.length % PALETTE.length]);

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      document.getElementById('cat-name')?.focus();
      toast('이름을 적어주세요');
      return;
    }
    addCategory(trimmed, color);
    toast(`${trimmed} 추가`);
    popView();
  };

  return (
    <>
      <PageBar title="새 카테고리" />

      <Field label="이름" htmlFor="cat-name">
        <input
          id="cat-name"
          type="text"
          className="field-input"
          placeholder="예: 반려동물"
          autoComplete="off"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>

      <Field label="색">
        <ColorPicker value={color} onChange={setColor} />
      </Field>

      <GoButton onClick={submit}>만들기</GoButton>
    </>
  );
}

/* ───────── 카테고리 설정 ───────── */

function CategorySettings({ id }: { id: string }) {
  const { categories } = useStore();
  const found = categories.find((c) => c.id === id) ?? null;

  // 방을 닫거나 남이 지운 참이면 빈 화면 대신 한 줄을 보여준다
  if (!found) {
    return (
      <>
        <PageBar title="카테고리" />
        <p className="ml-1 text-[13px] text-ink3">카테고리를 찾을 수 없어요.</p>
      </>
    );
  }
  return <CategoryForm key={found.id} category={found} />;
}

/**
 * 방 설정과 같은 모양이다 — 한쪽은 접고 한쪽은 들어가면 같은 것을 두 가지로 배워야 한다.
 *
 * `저장` 버튼이 없다. 이름은 손을 떼는 순간, 색은 고르는 순간 저장된다 —
 * 값 두 개짜리 화면에서 버튼을 한 번 더 누르게 할 까닭이 없다.
 */
function CategoryForm({ category }: { category: Category }) {
  const { categories, tasks, presets, updateCategory, removeCategory } = useStore();
  const { rooms } = useRooms();
  const { filter, setFilter, popView } = useUi();

  const [name, setName] = useState(category.name);

  const room = category.roomId ? (rooms.find((r) => r.id === category.roomId) ?? null) : null;
  const used = tasks.filter((t) => t.categoryId === category.id).length;
  const fallback = categories.find((c) => c.id !== category.id) ?? null;

  /** 빈 이름으로는 못 둔다 — 되돌려놓고 만다 */
  const saveName = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setName(category.name);
      return;
    }
    if (trimmed === category.name) return;
    updateCategory(category.id, trimmed, category.color);
  };

  const saveColor = (color: string) => {
    if (color === category.color) return;
    updateCategory(category.id, name.trim() || category.name, color);
  };

  const onRemove = async () => {
    if (!fallback) return;
    const yes = await ask({
      title: `${category.name}을(를) 지울까요?`,
      loses: '이 카테고리가 없어져요.',
      keeps: used
        ? `여기 있는 ${used}개는 ${fallback.name}(으)로 옮겨져요.`
        : '없어지는 할 일은 없어요.',
      go: '지우기',
      danger: true,
    });
    if (!yes) return;

    const moved = removeCategory(category.id);
    if (filter === category.id) setFilter(null);
    toast(moved ? `${category.name} 삭제 — ${moved}개 옮김` : `${category.name} 삭제`);
    popView();
  };

  const inPresets = presets.filter((p) => p.categoryId === category.id).length;

  return (
    <>
      <PageBar
        title={category.name}
        right={
          room && (
            <span
              className="inline-flex flex-none items-center rounded-full px-2.5 py-[3px] text-[11px] font-medium"
              style={{ background: tintOf(room.color), color: room.color }}
            >
              {room.name}
            </span>
          )
        }
      />

      <Field label="이름" htmlFor="cat-name">
        <input
          id="cat-name"
          type="text"
          className="field-input"
          autoComplete="off"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={saveName}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
        />
      </Field>

      <Field label="색">
        <ColorPicker value={category.color} onChange={saveColor} />
      </Field>

      {/*
        지우는 줄은 한 칸 떼어 둔다 — 위의 값들과 같은 무게로 읽히면 안 되는 것이다.
        마지막 하나에는 이 줄이 아예 없다. 눌러봤자 안 되는 줄을 흐리게 두지 않는다.
      */}
      {fallback && (
        <div className="mt-[18px]">
          <Group>
            <Row danger arrow={false} onClick={onRemove}>
              이 카테고리 지우기
            </Row>
          </Group>
          <Note>
            {used || inPresets
              ? `${fallback.name}(으)로 옮겨져요. 없어지는 할 일은 없습니다.`
              : '여기에 든 것이 없어요.'}
          </Note>
        </div>
      )}
    </>
  );
}
