# RoundEditor Extension API 실행 예제

이 디렉터리의 JavaScript 파일은 각각 독립적으로 등록할 수 있는 classic script 엔트리 파일입니다. 파일을 모듈 asset으로 복사하거나 그대로 제공하고, `editor.roundeditor.extensions` trigger descriptor의 `id`와 `script`를 파일에 맞춰 등록하십시오.

| 파일 | 확장 ID | 보여주는 기능 |
|---|---|---|
| `insert-server-data.js` | `example.insert-server-data` | 서버 descriptor의 `config` 데이터를 block 문서로 삽입, 툴바 params |
| `writing-shortcuts.js` | `example.writing-shortcuts` | 날짜·서명 삽입 command와 `Mod-Shift-T`, `Mod-Shift-S` 단축키 |
| `quick-template-panel.js` | `example.quick-template-panel` | 커스텀 패널, 안전한 DOM 구성, 패널 생명주기, 스타일 asset |

예를 들어 첫 번째 파일은 다음 descriptor로 승인할 수 있습니다.

```php
$context->extensions[] = [
    'id' => 'example.insert-server-data',
    'script' => './modules/example/assets/insert-server-data.js',
    'mode' => 'extension',
    'format' => 'classic',
    'required' => false,
    'config' => [
        'customerName' => '홍길동',
        'orderNumber' => 'ORDER-2026-001',
        'status' => '결제 완료',
    ],
];
```

여러 예제를 동시에 사용할 때는 각 파일에 해당하는 descriptor를 별도로 추가합니다. 예제의 `config` 값은 브라우저에 공개되므로 비밀키나 개인정보를 전달하지 마십시오.

프로덕션에서는 확장 ID와 문구를 모듈 고유 값으로 변경하고, 사용자 입력과 서버 응답을 DOM 또는 문서 node로 구성하십시오. 신뢰할 수 없는 값을 문자열 HTML 템플릿에 직접 연결하지 마십시오.
