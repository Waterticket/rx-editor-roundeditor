# RoundEditor Extension API 1.0

Extension API는 에디터의 명령, 단축키, 툴바, 붙여넣기, 드롭, 문서 구조, 첨부 처리에 기능을 추가하는 브라우저 API입니다.

본문을 읽거나 한 번 삽입하는 기능만 필요하다면 [Integration API](INTEGRATION_API.md)를 사용하십시오. 편집 동작에 계속 참여하거나 에디터마다 독립적인 상태를 유지해야 할 때 Extension API를 사용합니다.

공개 진입점은 `window.RoundEditor.extensions`이며 API 버전은 `1.0`입니다.

## 빠른 시작

확장 스크립트가 실행될 때 `register()`를 동기적으로 호출합니다.

```js
window.RoundEditor.extensions.register({
    id: 'example.greeting',
    version: '1.0.0',
    apiVersion: '^1.0',

    create(context) {
        return {
            commands: {
                insertGreeting({ state, dispatch }, params) {
                    const name = String(params?.name || '').trim();
                    if (!name) return false;

                    if (dispatch) {
                        const text = state.schema.text(`안녕하세요, ${name}!`);
                        dispatch(state.tr.replaceSelectionWith(text).scrollIntoView());
                    }
                    return true;
                },
            },
            keymap: {
                'Mod-Shift-H': 'insertGreeting',
            },
            toolbar: [{
                id: 'greeting',
                label: '인사말',
                command: 'insertGreeting',
                params: { name: '사용자' },
                group: 'insert',
                order: 30,
            }],
        };
    },
});
```

등록된 로컬 명령 이름 앞에는 확장 ID가 붙습니다.

```js
const editor = await window.RoundEditor.whenReady(editorSequence);
editor.commands.execute('example.greeting.insertGreeting', {
    name: '편집자',
});
```

확장 스크립트는 해당 에디터에 허용된 경우에만 적용됩니다. `create()`는 에디터 인스턴스마다 한 번씩 호출되므로 여러 에디터가 있는 페이지에서 상태를 전역으로 공유하지 마십시오.

## 실행 가능한 예제

완전한 classic script 예제는 [`examples/`](examples/README.md)에 분리되어 있습니다. 각 파일은 `editor.roundeditor.extensions` descriptor의 독립적인 엔트리 파일로 사용할 수 있습니다.

- [`insert-server-data.js`](examples/insert-server-data.js): 서버가 `context.config`로 전달한 주문 데이터를 여러 문단으로 삽입합니다.
- [`writing-shortcuts.js`](examples/writing-shortcuts.js): `Mod-Shift-T`로 현재 날짜·시간을, `Mod-Shift-S`로 작성자 서명을 삽입합니다.
- [`quick-template-panel.js`](examples/quick-template-panel.js): `Mod-Shift-P` 또는 툴바로 서식 패널을 열고 선택한 문구를 삽입합니다. 패널 생명주기와 scoped CSS도 함께 사용합니다.

예제는 서로 다른 확장 ID를 사용하므로 필요한 것만 골라 등록하거나 동시에 승인할 수 있습니다. 실제 모듈에 적용할 때는 ID, asset 경로, 문구와 `config`를 모듈 용도에 맞게 변경하십시오.

## 전역 레지스트리

```ts
interface ExtensionRegistry {
    readonly apiVersion: '1.0';
    register(definition: ExtensionDefinition): ExtensionRegistration;
    has(id: string): boolean;
    list(): readonly ExtensionMetadata[];
}
```

### `extensions.register(definition)`

확장을 등록하고 결과를 반환합니다.

```ts
interface ExtensionRegistration {
    readonly id: string;
    readonly accepted: boolean;
    readonly appliesToExistingEditors: false;
    readonly error?: ExtensionError;
    unregister(): boolean;
}
```

- `accepted`가 `false`이면 `error`에서 원인을 확인할 수 있습니다.
- 등록은 확장 스크립트의 최초 실행 중 완료해야 합니다.
- 이미 생성된 에디터에는 새 등록이나 `unregister()`가 소급 적용되지 않습니다.
- 같은 ID를 중복 등록할 수 없습니다.

### `extensions.has(id)`

해당 ID가 등록되어 있는지 반환합니다.

### `extensions.list()`

등록된 확장의 `id`, `version`, `apiVersion`, `enabled` 정보를 읽기 전용 배열로 반환합니다.

## 확장 정의와 생명 주기

```ts
interface ExtensionDefinition {
    id: string;
    version: string;
    apiVersion: string;
    priority?: number;
    requires?: {
        capabilities?: readonly string[];
        extensions?: Readonly<Record<string, string>>;
    };
    schema?: SchemaContribution;
    create(context: ExtensionContext): ExtensionInstance;
}
```

- `id`는 소문자 영문, 숫자, `.`, `_`, `-`로 구성합니다.
- `version`은 `1.0.0`과 같은 형식으로 지정합니다.
- `apiVersion`은 Extension API 호환 범위이며 1.x에서는 보통 `^1.0`을 사용합니다.
- `priority`는 `-100`부터 `100`까지이며 기본값은 `0`입니다.
- `requires.capabilities`에는 필요한 [Integration API capability](INTEGRATION_API.md#capability-확인)를 지정합니다.
- `requires.extensions`에는 필요한 확장 ID와 버전 범위를 지정합니다.
- `create()`는 동기적으로 `ExtensionInstance`를 반환합니다.

비동기 초기화는 `ready()`에서 수행하고, 이벤트 리스너와 외부 리소스는 `destroy()`에서 정리합니다.

## ExtensionContext

`create(context)`에 전달되는 주요 값은 다음과 같습니다.

| 속성 | 설명 |
|---|---|
| `extension` | 현재 확장의 `id`, `version`, `apiVersion`, `enabled` |
| `editor` | 현재 인스턴스의 Integration API `EditorHandle` |
| `schema` | 현재 에디터의 최종 문서 스키마 |
| `config` | 현재 에디터에 전달된 읽기 전용 JSON 설정 |
| `content` | HTML 파싱, 직렬화, 삽입 기능 |
| `asyncContent` | 비동기 결과가 들어갈 범위를 추적하는 기능 |
| `attachments` | 첨부 기능. 사용할 수 없으면 `null` |
| `assets` | 스타일과 스크립트 리소스 추가 기능 |
| `ui` | 알림과 패널 UI 기능 |
| `log` | `debug`, `info`, `warn`, `error` 로거 |
| `pm` | 명령, 플러그인, 문서 노드 작성에 사용하는 문서 모델 모듈 |

`context.config`에는 브라우저에 공개되어도 되는 값만 넣으십시오. 비밀키나 접근 토큰을 전달하면 안 됩니다.

`context.pm`이 제공하는 객체를 사용하고, 동일한 문서 모델 라이브러리를 확장 번들에 다시 포함하지 마십시오. 서로 다른 런타임에서 만든 객체는 함께 사용할 수 없습니다.

## ExtensionInstance

`create()`는 필요한 항목만 담은 객체를 반환합니다. 사용할 수 있는 항목은 `plugins`, `commands`, `keymap`, `hooks`, `nodeViews`, `toolbar`, `attachments`, `ready()`, `destroy()`입니다.

### 명령과 단축키

명령은 실행 가능 여부를 확인할 때 `dispatch` 없이 호출될 수 있습니다. 이때 문서를 변경하지 말고 실행 가능 여부만 반환합니다.

```js
commands: {
    insertDivider({ state, dispatch }) {
        const divider = state.schema.nodes.horizontal_rule;
        if (!divider) return false;
        if (dispatch) dispatch(state.tr.replaceSelectionWith(divider.create()));
        return true;
    },
},
keymap: {
    'Mod-Shift-D': 'insertDivider',
},
```

처리한 명령은 `true`, 처리하지 않은 명령은 `false`를 반환합니다. 단축키 값에는 로컬 명령 이름, 전체 명령 이름 또는 명령 함수를 사용할 수 있습니다.

### 툴바

툴바 항목에는 `id`, `label`, `command`가 필요합니다. `params`, `icon`, `group`, `order`, `placement`, `visible`, `enabled`, `active`를 선택적으로 지정할 수 있습니다. 버튼 DOM과 접근성 속성은 에디터가 관리합니다.

새 확장 그룹의 기본 위치는 컴포넌트 그룹 바로 앞입니다. 컴포넌트 그룹이 없는 편집기에서는 우측 undo/redo 도구 앞에 배치됩니다. 위치를 지정하려면 `placement`에 `before` 또는 `after` 중 하나만 사용합니다.

```js
toolbar: [{
    id: 'sticker',
    label: '스티커',
    command: 'openStickerPicker',
    group: 'sticker',
    order: 10,
    placement: { before: 'components' },
}, {
    id: 'template',
    label: '서식',
    command: 'openTemplatePicker',
    group: 'template',
    placement: { after: 'paragraph' },
}],
```

- `before`와 `after`의 값은 툴바 group ID입니다. 코어 그룹은 `text`, `rich`, `paragraph`, `sticker`, `components`, `right`입니다.
- 다른 확장이 만든 group ID도 지정할 수 있습니다. 대상 그룹이 없거나 명세가 잘못되면 기본 위치를 사용합니다.
- 이미 존재하는 그룹에 항목을 추가할 때는 `placement`를 무시하고 해당 그룹 안에 넣습니다.
- 같은 그룹 안의 확장 항목은 `order`, 확장 우선순위, 확장 ID 순으로 결정됩니다.

### 플러그인

`plugins`에는 `context.pm`으로 만든 플러그인을 넣습니다. 각 플러그인은 확장 ID를 포함하는 고유 키를 가져야 합니다.

## 입력 Hook

`hooks`는 다음 편집 흐름에 참여합니다.

| Hook | 용도 |
|---|---|
| `paste` | 붙여넣기 데이터 처리 |
| `drop` | 파일 또는 콘텐츠 드롭 처리 |
| `beforeInsert` | API와 확장이 삽입하는 HTML 변환 |
| `afterTransaction` | 문서 변경 관찰 |

`paste`와 `drop`은 우선순위 순으로 실행됩니다. 처리하지 않으면 반드시 `false`를 반환하고, 처리했다면 `{ handled: true }`를 반환합니다. 먼저 처리한 확장 뒤의 handler는 실행되지 않습니다.

### 비동기 붙여넣기 예시

응답을 기다리는 동안 특정 범위를 유지해야 한다면 `async` 계획을 반환합니다.

```js
hooks: {
    paste: [{
        handle({ text, html, files }) {
            const value = text.trim();
            if (files.length || html || !value.startsWith('https://')) return false;

            const escaped = value.replaceAll('&', '&amp;').replaceAll('<', '&lt;');

            return {
                handled: true,
                async: {
                    kind: 'link-card',
                    placeholderHTML: `<p>${escaped}</p>`,
                    originalHTML: `<p>${escaped}</p>`,
                    onError: 'restore-original',
                    async run(task) {
                        const response = await fetch('/api/editor/link-card', {
                            method: 'POST',
                            signal: task.signal,
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ url: value }),
                        });
                        if (!response.ok) throw new Error('요청에 실패했습니다.');

                        const result = await response.json();
                        if (task.alive) {
                            task.replaceHTML(result.html, { appendParagraph: true });
                        }
                    },
                },
            };
        },
    }],
},
```

각 작업은 자신이 만든 placeholder 범위만 바꿉니다. 사용자가 해당 범위를 삭제하거나 에디터가 종료되면 `task.alive`가 `false`가 되고 `task.signal`이 취소됩니다.

`AsyncContentTask`는 `replaceHTML()`, `restoreOriginal()`, `remove()`, `cancel()`을 제공합니다. 실패 시 동작은 `onError`에 `restore-original`, `remove`, `keep-placeholder` 중 하나를 지정합니다.

`beforeInsert.transform(request)`는 삽입 요청을 동기적으로 변환합니다. `afterTransaction.run()`은 문서 변경 관찰 용도로만 사용하고, 같은 변경 처리 중 조건 없이 새 변경을 반복 실행하면 안 됩니다.

## 스키마와 노드 뷰

저장할 문서에 새로운 구조가 꼭 필요한 경우에만 `schema`에 node 또는 mark를 추가합니다.

```js
schema: {
    nodes: {
        example_card: {
            fallback: 'raw-block',
            spec: {
                group: 'block',
                atom: true,
                selectable: true,
                attrs: {
                    title: { default: '' },
                    url: { default: '' },
                },
                parseDOM: [{
                    tag: 'figure[data-example-card]',
                    getAttrs: element => ({
                        title: element.getAttribute('data-title') || '',
                        url: element.getAttribute('data-url') || '',
                    }),
                }],
                toDOM: node => ['figure', {
                    'data-example-card': '',
                    'data-title': node.attrs.title,
                    'data-url': node.attrs.url,
                }],
            },
        },
    },
},
```

node의 fallback은 `raw-block`, `raw-inline`, `drop` 중 하나이며, mark의 fallback은 `preserve-content`, `drop-mark` 중 하나입니다. `script`, `on*` 속성, JSON으로 표현할 수 없는 attribute는 사용할 수 없습니다.

RoundEditor는 직렬화할 때 확장 node/mark의 최상위 DOM에 확장 ID와 fallback 정책을 자동으로 기록합니다. 이 메타데이터를 직접 작성하거나 `toDOM()`에 포함하지 마십시오. 다음에 문서를 열 때 해당 확장이 활성화되어 있으면 원래 스키마로 파싱하고, 확장이 없으면 다음 정책을 적용합니다.

| fallback | 확장이 없을 때의 동작 |
|---|---|
| `raw-block` | 안전하게 정제한 원본 HTML을 편집 불가능한 block raw node로 보존 |
| `raw-inline` | 안전하게 정제한 원본 HTML을 편집 불가능한 inline raw node로 보존 |
| `drop` | node와 그 내용을 제거 |
| `preserve-content` | mark의 DOM wrapper를 제거하고 내부 내용을 보존 |
| `drop-mark` | mark만 제거하고 내부 내용을 보존 |

raw fallback은 저장 HTML에 `data-roundeditor-extension`과 `data-roundeditor-fallback` 속성을 유지하므로, 나중에 확장이 다시 활성화되면 원래 node로 복구됩니다. fallback 처리 중에도 일반 URL, attribute, 위험 태그 정제 규칙은 그대로 적용됩니다.

편집 화면을 별도로 표현하려면 같은 node 이름으로 `nodeViews`를 반환합니다. 노드 뷰의 DOM은 편집 화면일 뿐 저장 데이터가 아닙니다. attribute 변경은 문서 transaction으로 반영하고, 위치 함수가 필요하다면 변경 직전에 다시 호출하십시오. 직접 추가한 listener와 observer는 노드 뷰의 `destroy()`에서 해제합니다.

## 첨부 확장

`attachments.renderers`로 업로드된 파일을 본문 HTML로 변환할 수 있습니다.

```js
attachments: {
    renderers: [{
        id: 'audio-list',
        priority: 30,
        batch: true,
        matches: file => file.mimeType.startsWith('audio/'),
        render(files) {
            const items = files.map(file =>
                `<li data-file-id="${Number(file.fileSrl)}"></li>`
            ).join('');
            return {
                html: `<ul class="audio-list">${items}</ul>`,
                metadata: { fileIds: files.map(file => file.fileSrl) },
            };
        },
    }],
},
```

우선순위가 가장 높은 matching renderer 하나가 사용됩니다. `onUploaded`, `beforeDelete`, `afterDelete`로 첨부 생명 주기를 처리할 수 있습니다. renderer가 반환한 HTML도 일반 삽입 절차를 거칩니다. 업로드 성공, 본문 삽입 성공, 삭제 요청 완료는 각각 별개의 상태입니다.

## 리소스와 UI

`context.assets.addStyle()`과 `addScript()`로 리소스를 추가할 수 있습니다. 인라인 스타일은 기본적으로 현재 에디터 범위에만 적용됩니다. 외부 URL은 HTTPS 또는 동일 출처여야 하며 페이지에서 허용한 출처만 사용할 수 있습니다. 직접 `release()`하지 않은 리소스도 에디터가 종료될 때 정리됩니다.

`context.ui.notify()`는 갱신하거나 닫을 수 있는 알림을 표시합니다. `context.ui.openPanel()`은 툴바 패널을 열고 생명주기를 추적하는 handle을 반환합니다.

```ts
interface PanelDefinition {
    id: string;
    title: string;
    content: Node | (() => Node);
    onClose?: (reason: 'api' | 'button' | 'toggle' | 'replaced' | 'editor-destroyed') => void;
}

interface PanelHandle {
    readonly id: string;
    readonly open: boolean;
    close(): boolean;
}
```

`close()`는 자신이 연 패널이 아직 열려 있을 때만 닫고 `true`를 반환합니다. 이미 닫혔거나 다른 패널로 교체되었으면 `false`입니다. 패널 content에는 닫히기 직전 `roundeditor:close` `CustomEvent`도 발생하며 `event.detail.reason`에서 같은 종료 원인을 읽을 수 있습니다. `onClose`와 이 이벤트는 각각 한 번만 발생합니다.

```js
let panel;

commands: {
    openPicker() {
        if (panel?.open) return panel.close();
        const content = document.createElement('div');
        panel = context.ui.openPanel({
            id: 'picker',
            title: '항목 선택',
            content,
            onClose(reason) {
                observer.disconnect();
                controller.abort(reason);
            },
        });
        return true;
    },
},
```

## Rhymix 서버에서 확장 스크립트 등록

RoundEditor가 설정을 직렬화하기 전에 `editor.roundeditor.extensions` 트리거의 `before` handler를 호출합니다. 모듈은 전달받은 context의 `extensions` 배열에 descriptor를 추가합니다. 이 경로로 승인된 스크립트만 Extension API 확장으로 적용됩니다.

handler context에는 `editor_sequence`, `module_srl`, `upload_target_srl`, `mid`, `extensions`가 들어 있습니다. 모듈은 앞의 네 값을 보고 적용 대상을 결정하고 `extensions`에만 항목을 추가해야 합니다.

```php
function triggerRoundEditorExtensions($context)
{
    $context->extensions[] = [
        'id' => 'vendor.example',
        'script' => './modules/example/assets/roundeditor.js',
        'mode' => 'extension',
        'format' => 'classic',
        'required' => false,
        'priority' => 0,
        'config' => ['pickerUrl' => getUrl('', 'module', 'example')],
    ];
    return $this->createObject();
}
```

| 필드 | 설명 |
|---|---|
| `id` | 브라우저에서 `extensions.register()`가 사용하는 동일한 확장 ID |
| `script` | `https://`, `/`, `./`, `../`로 시작하는 엔트리 스크립트 URL |
| `mode` | `extension`, `integration`, `both`; 기본값 `extension` |
| `format` | `classic` 또는 `module`; 기본값 `classic` |
| `required` | 로드·등록·초기화 실패 시 편집기 초기화도 중단할지 여부 |
| `priority` | -100~100, 스크립트 및 확장 처리 우선순위 |
| `config` | 해당 에디터의 `context.config`로 전달할 공개 가능한 JSON 값 |

엔트리 스크립트는 로드 이벤트가 끝나기 전에 `window.RoundEditor.extensions.register()`를 동기 호출해야 합니다. 같은 페이지의 여러 에디터가 동일 ID에 서로 다른 script 또는 format을 선언하면 충돌로 처리됩니다. 비밀키, 세션 토큰, 개인정보는 `config`에 넣지 마십시오.

## 오류와 안전 수칙

Extension 오류에는 `code`가 있으며 가능한 경우 `extensionId`와 `details`가 포함됩니다.

| 코드 | 의미 |
|---|---|
| `E_EXTENSION_INVALID` | 정의 또는 반환값이 올바르지 않음 |
| `E_EXTENSION_VERSION` | API 버전이 호환되지 않음 |
| `E_EXTENSION_DISABLED` | 현재 에디터에서 확장을 사용할 수 없음 |
| `E_EXTENSION_DEPENDENCY` | capability 또는 확장 의존성을 충족하지 못함 |
| `E_EXTENSION_CYCLE` | 확장 의존성이 순환함 |
| `E_EXTENSION_CONFLICT` | ID, 명령, 플러그인 키, node 이름 등이 충돌함 |
| `E_EXTENSION_CREATE` | `create()` 실행 실패 |
| `E_EXTENSION_READY` | `ready()` 실행 실패 또는 시간 초과 |
| `E_EXTENSION_RUNTIME` | hook, 명령, renderer 등의 실행 실패 |
| `E_TARGET_GONE` | 비동기 작업 대상 범위가 사라짐 |

확장을 작성할 때 다음 원칙을 지키십시오.

- 입력 HTML은 필터링되고 스키마에 맞게 정규화될 수 있습니다. 필터를 우회할 수 있다고 가정하지 마십시오.
- 신뢰할 수 없는 문자열을 `innerHTML`로 넣지 말고 `textContent` 또는 안전한 DOM API를 사용하십시오.
- `context.config`와 로그에 비밀키, 쿠키, 개인 데이터, 응답 원문을 넣지 마십시오.
- 외부 URL을 서버에서 처리한다면 사설 주소, redirect, DNS 변경을 포함한 요청 검증을 적용하십시오.
- 이벤트 리스너, observer, 네트워크 요청, 직접 추가한 DOM과 리소스는 `destroy()`에서 정리하십시오.
- 에디터 내부 DOM이나 비공개 객체에 의존하지 마십시오. 공개된 `context`와 Integration API만 사용하십시오.
