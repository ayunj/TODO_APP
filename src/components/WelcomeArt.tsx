import Tomato from './Tomato';

/**
 * 첫 화면 그림 — 하트를 안은 토마토. 설명 대신 이걸로 말한다.
 *
 * 그림을 아직 안 잘랐으면(=public/tomato가 비었으면) 예전 체크리스트 그림이 대신 나온다.
 * 첫 화면은 자리가 비면 곧장 허전해지는 곳이라 여기만 대체를 둔다.
 */
export default function WelcomeArt() {
  return (
    <Tomato
      pose="heart"
      size={168}
      className="mx-auto mb-[26px] mt-auto"
      fallback={<Checklist />}
    />
  );
}

function Checklist() {
  return (
    <svg
      viewBox="0 0 200 150"
      fill="none"
      aria-hidden="true"
      className="mx-auto mb-[26px] mt-auto w-[230px] max-w-[66vw]"
    >
      <circle cx="34" cy="30" r="7" fill="#F0C58A" opacity=".6" />
      <circle cx="170" cy="26" r="5" fill="#F3A8A8" opacity=".6" />
      <circle cx="181" cy="104" r="9" fill="#8EC9B5" opacity=".45" />
      <circle cx="22" cy="112" r="5" fill="#A9B8F4" opacity=".5" />

      <rect x="42" y="28" width="116" height="104" rx="18" fill="#fff" stroke="#EFE8DF" strokeWidth="2" />
      <rect x="42" y="28" width="116" height="26" rx="18" fill="#F4D7CC" />
      <rect x="42" y="46" width="116" height="8" fill="#F4D7CC" />

      <circle cx="64" cy="74" r="8" fill="#73B79F" />
      <path
        d="M60.5 74l2.6 2.6 4.6-5"
        stroke="#fff"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="80" y="70" width="54" height="7" rx="3.5" fill="#E4DCD4" />

      <circle cx="64" cy="98" r="8" fill="none" stroke="#D8D3CE" strokeWidth="2.4" />
      <rect x="80" y="94" width="42" height="7" rx="3.5" fill="#F2ECE6" />

      <path d="M100 20c0-4 3-7 7-7" stroke="#F0C58A" strokeWidth="2.4" strokeLinecap="round" />
      <path
        d="M148 140c8-3 13-9 13-16"
        stroke="#8EC9B5"
        strokeWidth="2.4"
        strokeLinecap="round"
        opacity=".6"
      />
    </svg>
  );
}
