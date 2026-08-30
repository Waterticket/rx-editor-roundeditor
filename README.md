# Roundeditor 스킨

## 파일첨부 아이콘 규칙

파일첨부 UI는 `assets/attachment-icons.svg` 로컬 SVG 스프라이트만 사용한다.
파일 선택, 본문 삽입, 선택 삭제, 대표 이미지, 동영상 재생 아이콘은 `<svg><use></use></svg>`로 이 스프라이트의 심벌을 참조해야 한다. 파일첨부 UI에 아이콘 폰트 클래스, 문자 기호, 이모지 또는 CSS로 그린 아이콘을 추가하지 않는다.

파일첨부 아이콘을 추가하거나 수정할 때는 다음 규칙을 따른다.

1. `24 × 24` `viewBox` 안에서 제작한다.
2. 라이트·다크·hover·disabled 상태를 테마로 제어할 수 있도록 `currentColor`를 사용한다.
3. 기존 심벌과 동일한 둥근 선 스타일을 사용한다.
4. 장식용 SVG에는 `aria-hidden="true"`를 지정하고 버튼 텍스트 또는 접근 가능한 이름은 별도로 유지한다.

이 규칙의 현재 적용 범위는 파일첨부 UI로 한정한다. 에디터의 기존 다른 아이콘은 의도적으로 변경하지 않았다.

이미지 NodeView의 `대표` 버튼은 `fileSrl`로 하단 xefu 목록의 `.xefu-act-set-cover`를 재사용한다. 캡션은 `<img alt>`와 `.roundeditor-content-image__caption`에 같은 값으로 저장되며, 대표 아이콘도 기존 attachment SVG sprite를 사용한다.
