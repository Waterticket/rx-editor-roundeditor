# RoundEditor 개발자 문서

RoundEditor를 사용하는 Rhymix 페이지에서 외부 모듈, 애드온, 에디터 컴포넌트를 연동하기 위한 문서입니다.

- [Integration API 1.0](INTEGRATION_API.md): 에디터 조회, 본문 편집, 선택 영역 추적, 컴포넌트 처리, 명령, 모드, 알림, 첨부 연동
- [CKEditor 4 레거시 호환 범위](CKEDITOR4_LEGACY_COMPATIBILITY.md): CKEditor 4 파사드와 Rhymix 레거시 전역 함수의 지원·제한·미지원 범위

새 연동 코드는 CKEditor 전역 객체, 편집기 내부 DOM, ProseMirror 객체에 직접 접근하지 말고 `window.RoundEditor`의 Integration API를 사용하십시오.

> 현재 공개 API는 Integration API 1.0입니다. 플러그인, 스키마, NodeView, 툴바 항목 등을 등록하는 런타임 Extension API는 제공하지 않습니다.
