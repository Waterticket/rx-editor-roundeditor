# RoundEditor 개발자 문서

RoundEditor를 외부 기능과 연동하기 위한 공개 API 문서입니다.

- [Integration API 1.0](INTEGRATION_API.md): 에디터 조회, 본문 편집, 선택 영역, 컴포넌트, 명령, 모드, 알림, 첨부 기능
- [Extension API 1.0](EXTENSION_API.md): 명령, 단축키, 툴바, 입력 hook, 비동기 콘텐츠, 문서 구조, 첨부 확장
- [Extension API 실행 예제](examples/README.md): 데이터 삽입, 단축키 자동화, 커스텀 패널 예제 스크립트
- [레거시 호환 범위](CKEDITOR4_LEGACY_COMPATIBILITY.md): 이전 연동 코드에서 사용할 수 있는 호환 기능과 제한 사항

본문을 읽거나 한 번 삽입하는 연동에는 Integration API를 사용하십시오. 편집 동작에 지속적으로 참여하는 기능에는 Extension API를 사용하십시오.

에디터 내부 DOM과 비공개 객체는 공개 API가 아닙니다.
