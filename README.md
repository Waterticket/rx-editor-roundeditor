# Roundeditor 스킨

## 빌드 및 배포

### 요구 사항

- Node.js 20.19 이상 또는 22.12 이상 (LTS 권장)
- npm 10 이상

`package-lock.json`을 포함해 배포하므로, 의존성 설치는 항상 `npm ci`를 사용한다.

```bash
cd public/modules/editor/skins/roundeditor
npm ci
```

### 배포용 빌드

아래 명령은 JavaScript를 Terser로 3회 최적화하고 이름까지 축약해 `dist/roundeditor.min.js`를 만든다. 디버깅을 위해 원본 소스와 연결되는 `dist/roundeditor.min.js.map`도 함께 생성한다. CSS도 Vite가 압축하여 `dist/roundeditor.css`로 생성한다.

```bash
npm run build
```

생성된 두 파일을 스킨과 함께 배포한다.

```text
dist/roundeditor.min.js
dist/roundeditor.min.js.map
dist/roundeditor.css
```

`editor.blade.php`는 이미 압축된 `roundeditor.min.js`를 불러오도록 설정되어 있다. 브라우저 개발자 도구는 필요할 때만 `.map` 파일을 내려받아 오류 위치와 스택 트레이스를 `src/`의 원본 코드로 보여 준다. 따라서 일반 사용자의 JavaScript 전송량은 최소화하면서 디버깅도 가능하다.

빌드 결과를 확인하려면 다음을 실행한다.

```bash
npm test
```

소스나 `package-lock.json`을 수정했을 때는 다시 `npm ci && npm run build`를 실행해 `dist/` 산출물을 갱신한다.

### jsDelivr CDN 사용법
에디터 설정 > 추가 플러그인 로드에 "jsdelivr-cdn"을 입력한다.

해당 플러그인이 로드되면 에디터 CSS, JS, SVG를 CDN에서 불러온다.

만약 CDN 요청이 실패하면 서버에 저장된 파일을 직접 불러온다.


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
