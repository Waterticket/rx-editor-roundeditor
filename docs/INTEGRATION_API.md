# RoundEditor Integration API 1.0

RoundEditor Integration API는 외부 Rhymix 모듈, 애드온, 에디터 컴포넌트가 RoundEditor의 본문과 주변 서비스를 안전하게 제어하기 위한 브라우저 API입니다.

이 문서의 공개 진입점은 `window.RoundEditor`이며 API 버전은 `1.0`입니다. ProseMirror 객체, 편집기 내부 DOM, CKEditor 호환 객체는 공개 API가 아닙니다.

## 빠른 시작

에디터의 `sequence`를 알고 있다면 `whenReady()`로 준비가 끝난 인스턴스를 얻습니다.

```js
async function insertFromMyModule(editorSequence, html) {
    const api = window.RoundEditor;

    if (!api || api.integrationApiVersion !== '1.0') {
        throw new Error('RoundEditor Integration API 1.0이 필요합니다.');
    }

    const editor = await api.whenReady(editorSequence, { timeout: 10000 });

    if (!editor.hasCapability('content.insertHTML')) {
        throw new Error('현재 에디터는 HTML 삽입을 지원하지 않습니다.');
    }

    const result = editor.content.insertHTML(html, {
        source: 'module:my-module',
        history: 'record',
        select: 'after',
    });

    if (result.normalized) {
        console.warn('RoundEditor가 입력 HTML을 정규화했습니다.', result.warnings);
    }

    editor.focus();
    return result;
}
```

팝업 창에서는 팝업을 연 창의 API를 사용합니다.

```js
const editorSequence = Number(new URLSearchParams(location.search).get('editor_sequence'));
const editor = await window.opener.RoundEditor.whenReady(editorSequence, {
    timeout: 10000,
});
```

이 방식은 팝업과 본문 페이지가 same-origin이고 `window.opener` 접근이 허용된 경우에만 사용할 수 있습니다. 팝업을 다른 origin에서 제공한다면 본문 페이지에 별도 same-origin 중계 코드를 두고 검증된 `postMessage` 프로토콜을 사용하십시오.

다중 에디터 페이지에서는 첫 번째 에디터나 현재 활성 에디터를 추측하지 말고 `sequence`를 명시적으로 전달하십시오.

## 지원 범위

Integration API로 다음 작업을 할 수 있습니다.

- 에디터 인스턴스 조회 및 초기화 대기
- 문서와 선택 영역의 HTML·텍스트 읽기
- 선택 영역 삽입 및 문서 전체 교체
- 비동기 작업 중 선택 위치 추적
- Rhymix 에디터 컴포넌트 삽입·교체·속성 변경·삭제
- undo/redo와 기본 편집 명령 실행
- visual/source 모드 조회 및 전환
- 에디터 내부 알림 표시
- 활성화된 Rhymix 첨부 UI 조회 및 호출
- 에디터 상태 이벤트 구독

다음 작업은 공개 API로 지원하지 않습니다.

- ProseMirror state, transaction, position, plugin 직접 접근
- 편집기 DOM 또는 NodeView DOM 직접 변경
- schema node/mark, NodeView, plugin, keymap, toolbar item 런타임 등록
- paste/drop/input 처리 선점
- sanitizer 우회 또는 신뢰된 raw HTML 삽입
- CKEditor plugin이나 CKEditor DOM/range/bookmark API의 무수정 실행

## 전역 API

### `RoundEditor.integrationApiVersion`

현재 값은 문자열 `'1.0'`입니다. 기능 사용 전 버전을 확인하십시오.

```js
if (window.RoundEditor?.integrationApiVersion !== '1.0') {
    throw new Error('지원하지 않는 RoundEditor Integration API 버전입니다.');
}
```

### `RoundEditor.get(sequence)`

준비된 에디터를 반환합니다. 해당 `sequence`가 없거나 아직 초기화되지 않았으면 `null`입니다.

```js
const editor = window.RoundEditor.get(4);
```

### `RoundEditor.getActive()`

마지막으로 활성화된 에디터를 반환하며, 활성 인스턴스가 없으면 `null`입니다. 명시적인 `sequence`가 없는 보조 UI에서만 fallback으로 사용하십시오.

```js
const editor = window.RoundEditor.getActive();
```

### `RoundEditor.list()`

현재 준비된 에디터 handle의 고정된 배열을 반환합니다.

```js
for (const editor of window.RoundEditor.list()) {
    console.log(editor.sequence);
}
```

### `RoundEditor.whenReady(sequence, options?)`

지정한 인스턴스가 준비되면 `EditorHandle`로 resolve되는 Promise를 반환합니다.

```ts
whenReady(
    sequence: number,
    options?: {
        signal?: AbortSignal;
        timeout?: number;
    }
): Promise<EditorHandle>
```

- `timeout`의 기본값은 `10000`ms입니다.
- `timeout`에 음수를 지정하면 시간 제한을 설정하지 않습니다. 이 경우 취소 가능한 `AbortSignal`을 함께 사용하는 것을 권장합니다.
- 제한 시간이 지나면 `E_TIMEOUT` 오류가 발생합니다.
- signal이 이미 취소되었거나 대기 중 취소되면 `E_NOT_READY` 오류가 발생합니다.

```js
const controller = new AbortController();

try {
    const editor = await window.RoundEditor.whenReady(4, {
        timeout: 10000,
        signal: controller.signal,
    });
} catch (error) {
    if (error.code === 'E_TIMEOUT') {
        console.error('에디터 초기화 시간이 초과되었습니다.');
    }
}
```

### `RoundEditor.on(type, listener)`

전역 인스턴스 이벤트를 구독하고 구독 해제 함수를 반환합니다.

```ts
type GlobalEventType = 'instanceReady' | 'instanceDestroyed' | 'activeChanged';

interface GlobalEditorEvent {
    type: GlobalEventType;
    sequence: number;
    editor: EditorHandle | null;
}
```

```js
const unsubscribe = window.RoundEditor.on('instanceReady', event => {
    console.log('준비된 에디터:', event.sequence, event.editor);
});

// 더 이상 필요하지 않을 때
unsubscribe();
```

`instanceDestroyed`의 `editor`는 `null`입니다.

## EditorHandle

`EditorHandle`은 한 에디터 인스턴스에 귀속됩니다.

```ts
interface EditorHandle {
    readonly id: string;
    readonly sequence: number;
    readonly destroyed: boolean;
    readonly capabilities: ReadonlySet<string>;

    readonly document: DocumentService;
    readonly content: ContentService;
    readonly selection: SelectionService;
    readonly components: ComponentService;
    readonly commands: CommandService;
    readonly mode: ModeService;
    readonly ui: UIService;
    readonly attachments: AttachmentService | null;

    focus(options?: { scroll?: boolean }): boolean;
    hasCapability(name: string): boolean;
    on(type: EditorEventType, listener: (event: object) => void): () => void;
}
```

### 식별 및 생명 주기

- `id`는 현재 인스턴스를 식별하는 문자열입니다.
- `sequence`는 Rhymix 에디터 sequence입니다.
- `destroyed`가 `true`인 handle은 더 이상 편집에 사용할 수 없습니다.
- 파괴된 handle의 편집 메서드는 `E_EDITOR_DESTROYED` 오류를 발생시킵니다.

외부 코드가 handle을 오래 보관한다면 사용 직전에 `destroyed`를 확인하십시오.

### Capability 확인

에디터 스킨 이름이나 내부 객체의 존재 여부를 비교하지 말고 capability를 확인합니다.

```js
if (editor.hasCapability('selection.anchor')) {
    const anchor = editor.selection.capture();
}
```

Integration API 1.0에서 사용하는 capability는 다음과 같습니다.

| Capability | 의미 |
|---|---|
| `content.readHTML` | 문서 HTML 읽기 |
| `content.insertHTML` | HTML 삽입 |
| `content.replaceDocument` | 문서 전체 교체 |
| `selection.readHTML` | 선택 영역 읽기 |
| `selection.anchor` | 선택 영역 anchor 생성 |
| `component.read` | 컴포넌트 조회 |
| `component.write` | 컴포넌트 삽입·변경·삭제 |
| `mode.source` | source 모드 사용 |
| `ui.notification` | 에디터 알림 표시 |
| `attachment.read` | 첨부 목록 조회 |
| `attachment.upload` | Rhymix 업로더 호출 |
| `attachment.delete` | Rhymix 첨부 삭제 UI 호출 |

첨부 capability는 해당 인스턴스에 첨부 기능이 구성된 경우에만 제공됩니다. 알 수 없는 capability는 `hasCapability()`가 `false`를 반환합니다.

### `focus(options?)`

에디터에 포커스를 주고 활성 에디터로 지정합니다. 기본적으로 에디터가 보이도록 스크롤합니다.

```js
editor.focus({ scroll: false });
```

## DocumentService

문서 저장 form과 연결된 값을 다룹니다.

```ts
interface DocumentService {
    readonly primaryKeyName: string;
    readonly contentKeyName: string;
    readonly editorSequence: number;
    primaryValue: string;
    sync(): string;
}
```

### 속성

- `primaryKeyName`: Rhymix primary key control 이름(일반적으로 `document_srl`)
- `contentKeyName`: 본문 control 이름(일반적으로 `content`)
- `editorSequence`: 이 handle의 에디터 sequence
- `primaryValue`: 현재 primary control 값. 읽기와 쓰기가 모두 가능합니다.

`primaryValue` 변경은 본문 편집 transaction이 아니며 undo 대상이 아닙니다.

```js
console.log(editor.document.primaryKeyName, editor.document.primaryValue);
editor.document.primaryValue = String(documentSrl);
```

### `sync()`

현재 에디터 데이터를 연결된 본문 control에 즉시 반영하고 반영한 HTML 문자열을 반환합니다.

```js
const storedHTML = editor.document.sync();
```

일반적인 API 편집은 자동으로 저장 control과 동기화됩니다. form 제출 직전처럼 즉시 값이 필요할 때 명시적으로 호출할 수 있습니다.

## ContentService

### 읽기

```ts
getHTML(options?: { scope?: 'document' | 'selection' }): string;
getText(options?: { scope?: 'document' | 'selection' }): string;
```

```js
const documentHTML = editor.content.getHTML();
const documentText = editor.content.getText();
const selectedHTML = editor.content.getHTML({ scope: 'selection' });
const selectedText = editor.content.getText({ scope: 'selection' });
```

`getHTML()`은 visual/source 모드 모두 RoundEditor가 저장할 수 있는 canonical HTML을 반환합니다. 선택 영역은 `editor.selection.getHTML()`과 `getText()`로도 읽을 수 있습니다.

### 공통 편집 옵션

```ts
interface EditOptions {
    source?: string;
    history?: 'record' | 'skip';
}
```

- `source`: 같은 편집으로 발생하는 `change` 이벤트의 `source` 값입니다. 모듈은 충돌을 피하기 위해 `module:<module-name>` 형식을 권장합니다.
- `history`: 기본값은 `record`입니다. 각 API 호출은 하나의 undo 단위로 기록됩니다. 초기 데이터 동기화처럼 사용자가 되돌릴 필요가 없는 작업에만 `skip`을 사용하십시오.

### `insertHTML(html, options?)`

현재 선택 영역 또는 지정한 anchor/ref 범위를 입력 HTML로 교체합니다.

```ts
interface InsertHTMLOptions extends EditOptions {
    at?: 'selection' | SelectionAnchor | ComponentRef;
    select?: 'after' | 'inserted' | 'preserve';
}
```

```js
const result = editor.content.insertHTML(
    '<p><strong>삽입할 내용</strong></p>',
    {
        at: 'selection',
        source: 'module:my-module',
        history: 'record',
        select: 'after',
    }
);
```

- `at`의 기본값은 `'selection'`입니다.
- `select`의 기본값은 `'after'`입니다.
- 현재 버전에서 `inserted`도 삽입한 내용 뒤에 caret을 둡니다. 삽입된 범위 선택이 반드시 필요한 코드에서는 이 값에 의존하지 마십시오.
- `preserve`는 transaction이 매핑한 selection을 유지합니다.
- 유효하지 않거나 해제된 handle을 `at`에 전달하면 `E_TARGET_GONE`이며 현재 cursor로 fallback하지 않습니다.
- source 모드에서는 현재 textarea 선택 영역에만 삽입할 수 있습니다. anchor/ref를 전달하면 `E_UNSUPPORTED_MODE`입니다.

### `setHTML(html, options?)`

문서 전체를 교체합니다.

```ts
interface SetHTMLOptions extends EditOptions {
    selection?: 'start' | 'end' | 'preserve';
}
```

```js
const result = editor.content.setHTML(
    '<h2>새 문서</h2><p>본문</p>',
    {
        source: 'module:my-module',
        history: 'record',
        selection: 'end',
    }
);
```

`selection`의 기본값은 `'end'`입니다.

### `clear(options?)`

문서를 비웁니다. 결과와 옵션은 `setHTML()`과 같습니다.

```js
editor.content.clear({ source: 'module:my-module' });
```

### EditResult와 HTML 정규화

모든 편집 메서드는 다음 결과를 반환합니다.

```ts
interface EditResult {
    readonly applied: boolean;
    readonly normalized: boolean;
    readonly canonicalHTML: string;
    readonly warnings: readonly NormalizationWarning[];
}

interface NormalizationWarning {
    code: 'TAG_REMOVED' | 'ATTRIBUTE_REMOVED' | 'STRUCTURE_NORMALIZED';
    detail?: string;
}
```

- `applied`: 편집이 적용되었는지 나타냅니다. 성공한 현재 편집 메서드는 `true`입니다.
- `normalized`: 입력과 canonical HTML이 다르면 `true`입니다.
- `canonicalHTML`: 편집 적용 후 전체 문서의 canonical HTML입니다.
- `warnings`: 제거 또는 구조 변경의 주요 이유입니다. 배열은 비어 있을 수 있습니다.

```js
const result = editor.content.setHTML(
    '<p onclick="run()">안전한 내용<script>run()</script></p>',
    { source: 'module:my-module' }
);

// result.canonicalHTML === '<p>안전한 내용</p>'
// result.normalized === true
// warning code: TAG_REMOVED, ATTRIBUTE_REMOVED
```

RoundEditor는 위험한 tag와 event handler를 제거하고, 문서 schema에 맞게 구조를 정규화합니다. 외부 모듈에는 sanitizer를 우회하는 옵션이 없습니다. 향후 warning code가 추가될 수 있으므로 알 수 없는 code도 기록하거나 사용자 안내 대상으로 처리하십시오.

## SelectionService

```ts
interface SelectionService {
    readonly empty: boolean;
    getHTML(): string;
    getText(): string;
    capture(options?: { ttl?: number }): SelectionAnchor;
}
```

- `empty`: 현재 선택 영역이 collapsed 상태이면 `true`
- `getHTML()`: 선택 영역 HTML
- `getText()`: 선택 영역의 plain text

### SelectionAnchor

비동기 요청이나 팝업이 열린 동안 사용자가 문서 앞부분을 편집할 수 있습니다. 숫자 position이나 DOM node를 저장하지 말고 `capture()`로 위치를 추적하십시오.

```ts
interface SelectionAnchor {
    readonly id: string;
    readonly alive: boolean;
    readonly createdAt: number;
    release(): void;
}
```

```js
const anchor = editor.selection.capture({ ttl: 5 * 60 * 1000 });

try {
    const html = await loadRemoteHTML();

    if (!anchor.alive) {
        throw new Error('원래 선택 영역이 더 이상 존재하지 않습니다.');
    }

    editor.content.insertHTML(html, {
        at: anchor,
        source: 'module:my-module',
    });
} catch (error) {
    if (error.code === 'E_TARGET_GONE') {
        editor.ui.notify('삽입 위치가 더 이상 존재하지 않습니다.', {
            type: 'warning',
        });
    } else {
        throw error;
    }
} finally {
    anchor.release();
}
```

- 기본 TTL은 30분입니다.
- `ttl`이 양수이면 시간이 지난 뒤 자동 해제됩니다.
- 대상 범위가 삭제되거나 `release()`를 호출하면 `alive`가 `false`가 됩니다.
- collapsed anchor에 삽입하면 anchor는 계속 살아 있으며 삽입된 내용 뒤를 추적합니다.
- 해제된 anchor를 사용하면 `E_TARGET_GONE`입니다.
- source 모드의 `capture()`는 `E_UNSUPPORTED_MODE`입니다.
- 사용이 끝나면 반드시 `release()`하십시오.

## ComponentService

Rhymix 에디터 컴포넌트는 저장 HTML에서 `editor_component` 속성을 가진 단위입니다. 기존 컴포넌트를 편집할 때 DOM을 직접 바꾸지 말고 `ComponentRef`를 사용합니다.

```ts
interface ComponentRef {
    readonly id: string;
    readonly name: string;
    readonly alive: boolean;
    readonly html: string;
    readonly innerHTML: string;
    readonly attributes: Readonly<Record<string, string>>;
    release(): void;
}
```

`html`, `innerHTML`, `attributes`는 ref를 얻은 시점의 snapshot입니다. 변경 후 최신 값을 읽으려면 새 ref를 얻으십시오.

### 컴포넌트 조회

```ts
getActive(expectedName?: string): ComponentRef | null;
getSelected(expectedName?: string): ComponentRef | null;
capture(ref: ComponentRef): ComponentRef;
```

현재 버전에서 `getActive()`와 `getSelected()`는 현재 selection에 있는 컴포넌트를 같은 방식으로 조회합니다. `expectedName`과 컴포넌트의 `editor_component` 값이 다르면 `null`입니다. source 모드에서도 `null`입니다.

```js
const ref = editor.components.getSelected('textbox');

if (ref) {
    try {
        console.log(ref.name, ref.attributes, ref.innerHTML);
    } finally {
        ref.release();
    }
}
```

`capture(ref)`는 ref가 아직 유효한지 검사하여 그대로 반환합니다. 유효하지 않으면 `E_TARGET_GONE`입니다.

### `insert(name, html, options?)`

컴포넌트 HTML을 삽입합니다.

```js
editor.components.insert('textbox', textboxHTML, {
    at: 'selection',
    source: 'module:textbox',
    select: 'after',
});
```

`html`의 최상위 컴포넌트에 있는 `editor_component` 값은 `name`과 일치하도록 작성하십시오. HTML은 일반 삽입과 같은 sanitizer 및 schema 정규화를 거칩니다.

### `replace(ref, html, options?)`

ref가 가리키는 컴포넌트 전체를 교체합니다.

```js
editor.components.replace(ref, nextHTML, {
    source: 'module:textbox',
});
```

교체된 컴포넌트의 후속 변경에는 새 ref를 얻으십시오.

### `updateAttributes(ref, attributes, options?)`

컴포넌트 element의 속성을 변경합니다. 문자열 값은 설정되고 `null` 값은 제거됩니다. `on*` event handler 속성은 설정되지 않으며 결과 HTML은 다시 정규화됩니다.

```js
editor.components.updateAttributes(ref, {
    skin: 'rounded',
    obsolete_option: null,
}, {
    source: 'module:textbox',
});
```

본문 내용까지 함께 바꿔야 한다면 `replace()`를 사용하여 한 번에 교체하십시오.

### `remove(ref, options?)`

컴포넌트를 삭제하고 ref를 해제합니다.

```js
editor.components.remove(ref, {
    source: 'module:textbox',
});
```

컴포넌트가 이미 삭제 또는 교체된 경우 변경 메서드는 `E_TARGET_GONE`을 발생시키며 현재 selection에 대신 적용하지 않습니다.

### 삽입 또는 수정 예제

```js
const target = editor.components.getActive('textbox');
const content = target ? target.innerHTML : editor.selection.getHTML();
const html = buildTextboxHTML(content || '&nbsp;');

try {
    if (target) {
        editor.components.replace(target, html, {
            source: 'module:textbox',
        });
    } else {
        editor.components.insert('textbox', html, {
            source: 'module:textbox',
        });
    }
} finally {
    target?.release();
}
```

## CommandService

```ts
interface CommandService {
    can(name: string, params?: unknown): boolean;
    execute(name: string, params?: unknown): boolean;
    list(): readonly string[];
}
```

- `list()`는 이 버전이 인식하는 명령 이름을 반환합니다.
- `can()`은 현재 상태에서 실행 가능한지 확인합니다.
- `execute()`는 명령을 실행했으면 `true`, 실행하지 않았으면 `false`입니다.
- 알 수 없는 명령은 `can()`과 `execute()`가 `false`입니다.

지원 명령은 다음과 같습니다.

| 명령 | 설명 |
|---|---|
| `history.undo` | 마지막 undo 단위 되돌리기 |
| `history.redo` | 되돌린 작업 다시 적용 |
| `selection.selectAll` | 문서 전체 선택 |
| `format.bold` | 굵게 toggle |
| `format.italic` | 기울임 toggle |
| `content.deleteSelection` | 선택 영역 삭제 |
| `component.open` | 선택한 Rhymix 컴포넌트의 기존 편집 UI 열기 |

```js
if (editor.commands.can('history.undo')) {
    editor.commands.execute('history.undo');
}
```

## ModeService

```ts
interface ModeService {
    readonly current: 'visual' | 'source';
    readonly sourceAvailable: boolean;
    set(mode: 'visual' | 'source'): boolean;
}
```

- `current`: 현재 모드
- `sourceAvailable`: 이 인스턴스에서 source 모드를 사용할 수 있는지 여부
- `set()`: 요청한 모드가 적용되었으면 `true`, 적용할 수 없으면 `false`

```js
if (editor.mode.sourceAvailable) {
    editor.mode.set('source');
    editor.content.insertHTML('<p>source 모드에서 삽입</p>', {
        source: 'module:my-module',
    });
    editor.mode.set('visual');
}
```

source 모드에서는 SelectionAnchor와 ComponentRef 기반 편집을 지원하지 않습니다.

## UIService

### `notify(message, options?)`

에디터 wrapper 내부에 알림을 표시하고 제어 handle을 반환합니다.

```ts
interface NotificationOptions {
    type?: 'info' | 'success' | 'warning' | 'error' | 'progress';
    duration?: number;
    progress?: number;
}

interface NotificationHandle {
    update(options: NotificationOptions & { message?: string }): void;
    close(): void;
}
```

`duration`은 ms 단위입니다. 값이 없으면 자동으로 닫히지 않습니다. `progress`는 반올림한 백분율로 메시지 뒤에 표시됩니다.

```js
const notice = editor.ui.notify('처리 중', {
    type: 'progress',
    progress: 0,
});

notice.update({
    message: '완료',
    type: 'success',
    progress: 100,
    duration: 2000,
});

// 필요하면 즉시 닫기
// notice.close();
```

## AttachmentService

첨부 서비스는 Rhymix 첨부 UI가 활성화된 인스턴스에서만 제공됩니다. 먼저 `editor.attachments`와 `available`을 모두 확인하십시오.

```js
const attachments = editor.attachments;

if (attachments?.available) {
    console.log(attachments.list());
}
```

### 첨부 정보

```ts
interface AttachmentInfo {
    fileSrl: number;
    sourceFilename: string;
    downloadUrl: string;
    mimeType: string;
    size: number;
}
```

Rhymix 첨부 DOM에 제공되지 않은 metadata는 빈 문자열 또는 `0`일 수 있습니다.

### `list()`

현재 첨부 UI에 표시된 파일의 snapshot 배열을 반환합니다.

```js
const current = editor.attachments.list();
```

### `refresh()`

기존 Rhymix 업로더에 파일 목록 갱신을 요청한 뒤 현재 snapshot을 반환합니다.

```js
const refreshed = await editor.attachments.refresh();
```

기존 업로더의 서버 요청이 별도로 비동기 실행되는 환경에서는 이 Promise가 서버 갱신 완료까지 기다린다는 보장이 없습니다. 서버 요청 완료 후의 목록이 반드시 필요하면 해당 사이트의 Rhymix 업로더 완료 신호와 함께 사용하십시오.

### `upload(files, options?)`

파일들을 페이지의 기존 Rhymix 업로더에 전달합니다.

```ts
interface UploadRequestOptions {
    at?: 'selection' | SelectionAnchor;
    signal?: AbortSignal;
}

interface UploadResult {
    file: File;
    uploaded: boolean;
    inserted: boolean;
    error?: Error;
}
```

```js
const anchor = editor.mode.current === 'visual'
    ? editor.selection.capture({ ttl: 5 * 60 * 1000 })
    : null;

try {
    const results = await editor.attachments.upload(files, {
        at: anchor || 'selection',
    });

    // 현재 반환값은 업로더 접수 상태이며 서버 업로드 완료 결과가 아니다.
    console.log(results);
} finally {
    anchor?.release();
}
```

중요한 제한 사항:

- 반환 Promise는 파일이 기존 업로더에 전달된 시점에 resolve됩니다.
- 현재 반환되는 각 결과의 `uploaded`와 `inserted`는 `false`이며, 서버 완료 여부를 의미하지 않습니다.
- 업로드 완료, 실패, 진행률이 필요한 연동은 페이지의 기존 Rhymix 업로더 이벤트를 함께 사용해야 합니다.
- `signal`은 호출 전에 이미 취소된 경우만 검사합니다. 접수 후 진행 중인 업로드를 취소하지 않습니다.
- anchor를 전달하면 업로더가 지원하는 미디어 자동 삽입 위치로 사용됩니다. anchor가 유효하지 않으면 `E_TARGET_GONE`입니다.
- 업로더를 사용할 수 없으면 `E_UNSUPPORTED`입니다.

### `delete(fileSrls)`

기존 Rhymix 첨부 UI에서 해당 파일을 선택하고 삭제 동작을 호출합니다.

```js
await editor.attachments.delete([101, 102]);
```

이 Promise는 삭제 UI를 호출한 시점을 나타내며 서버 삭제 완료를 보장하지 않습니다. 본문의 해당 파일 참조를 자동으로 제거하지도 않습니다.

### 첨부 이벤트

현재 adapter는 `refreshed`와 `deleted` payload를 발생시킬 수 있습니다.

```ts
type AttachmentEvent =
    | { type: 'refreshed'; attachments: readonly AttachmentInfo[] }
    | { type: 'deleted'; fileSrls: readonly number[] };
```

```js
const unsubscribe = editor.attachments.on('refreshed', event => {
    // 현재 버전에서는 반드시 payload.type을 다시 확인한다.
    if (event.type === 'refreshed') {
        console.log(event.attachments);
    }
});
```

현재 버전의 첨부 이벤트 adapter는 구독 시 전달한 event 이름으로 payload를 필터링하지 않으므로 listener 안에서 `event.type`을 확인해야 합니다. 업로드 완료 이벤트는 제공하지 않습니다.

## 에디터 이벤트

`editor.on(type, listener)`은 구독 해제 함수를 반환합니다.

```ts
type EditorEventType =
    | 'ready'
    | 'change'
    | 'selectionChange'
    | 'focus'
    | 'blur'
    | 'modeChange'
    | 'destroy';
```

### 이벤트 payload

```ts
interface ChangeEvent {
    editor: EditorHandle;
    source: string | 'user' | 'history';
    docChanged: boolean;
    selectionChanged: boolean;
}

interface ModeChangeEvent {
    editor: EditorHandle;
    mode: 'visual' | 'source';
}
```

| 이벤트 | Payload |
|---|---|
| `ready` | `{ editor }` |
| `change` | `{ editor, source, docChanged, selectionChanged }` |
| `selectionChange` | `{ editor }` |
| `focus` | `{ editor }` |
| `blur` | `{ editor }` |
| `modeChange` | `{ editor, mode }` |
| `destroy` | `{ editorId, sequence }` |

초기화 완료를 기다리는 용도로는 `ready` 구독보다 `RoundEditor.whenReady()`를 사용하십시오. handle을 얻은 시점에는 `ready` 이벤트가 이미 지나갔을 수 있습니다.

```js
const unsubscribe = editor.on('change', event => {
    console.log(event.source, event.docChanged, event.selectionChanged);
});

// 화면 또는 팝업 정리 시
unsubscribe();
```

`change.source`는 다음 규칙을 따릅니다.

- Integration API 편집에 `source`를 지정하면 그 문자열
- undo/redo이면 `'history'`
- 직접 사용자 편집 또는 source가 지정되지 않은 일반 transaction이면 `'user'`

이 이벤트는 관찰용이며 transaction을 취소하거나 변경할 수 없습니다. listener 안에서 다시 편집해야 한다면 재진입을 피하도록 microtask로 예약하십시오.

```js
editor.on('change', event => {
    if (!event.docChanged || event.source === 'module:normalizer') return;

    queueMicrotask(() => {
        // 필요한 경우 별도 API 편집 수행
    });
});
```

listener에서 발생한 예외는 다른 listener와 에디터 동작을 중단시키지 않습니다.

## 오류 처리

API 오류는 `Error`를 확장하며 문자열 `code`를 가집니다. 번들 초기화 전에 bootstrap의 `whenReady()`에서 발생한 오류도 동일하게 `code`로 판별할 수 있습니다.

| Code | 의미 |
|---|---|
| `E_NOT_READY` | `whenReady()` 대기가 취소됨 |
| `E_TIMEOUT` | 제한 시간 안에 인스턴스가 준비되지 않음 |
| `E_EDITOR_DESTROYED` | 파괴된 editor handle 사용 |
| `E_TARGET_GONE` | anchor 또는 component 대상이 삭제·교체·해제됨 |
| `E_UNSUPPORTED` | 현재 페이지 adapter가 작업을 제공하지 않음 |
| `E_UNSUPPORTED_MODE` | 현재 모드에서 작업을 지원하지 않음 |
| `E_UPLOAD_FAILED` | 업로드 요청이 접수되기 전에 실패하거나 취소됨 |

```js
try {
    await runIntegration();
} catch (error) {
    switch (error.code) {
        case 'E_TIMEOUT':
        case 'E_NOT_READY':
            // 초기화 실패 또는 대기 취소
            break;
        case 'E_TARGET_GONE':
            // 원래 선택 영역이나 컴포넌트가 사라짐
            break;
        case 'E_UNSUPPORTED_MODE':
            // visual 모드로 전환하거나 기능을 비활성화
            break;
        default:
            throw error;
    }
}
```

`commands.can()`, `commands.execute()`, `mode.set()`처럼 boolean 반환이 명시된 API를 제외하면, 실패를 silent no-op으로 가정하지 말고 오류를 처리하십시오.

## 권장 연동 패턴

### 템플릿 삽입 또는 덮어쓰기

```js
async function applyTemplate(editorSequence, html, overwrite = false) {
    const editor = await window.RoundEditor.whenReady(editorSequence, {
        timeout: 10000,
    });

    const options = {
        source: 'module:ap-template',
        history: 'record',
    };

    const result = overwrite
        ? editor.content.setHTML(html, { ...options, selection: 'end' })
        : editor.content.insertHTML(html, { ...options, select: 'after' });

    editor.focus();
    return result;
}
```

### 비동기 팝업에서 안전하게 삽입

팝업을 열기 전에 본문 페이지에서 anchor를 만들고 팝업 session과 연결해 보관하는 방식이 가장 안전합니다. 팝업이 닫히거나 작업이 끝나면 해제하십시오.

```js
const editor = await window.RoundEditor.whenReady(editorSequence);
const anchor = editor.selection.capture({ ttl: 300000 });

try {
    const html = await requestThirdPartyMarkup();
    editor.content.insertHTML(html, {
        at: anchor,
        source: 'popup',
    });
} finally {
    anchor.release();
}
```

### 정리 원칙

페이지 전환, 팝업 종료, 컴포넌트 UI 종료 시 다음 리소스를 정리하십시오.

- `RoundEditor.on()`과 `editor.on()`이 반환한 구독 해제 함수 호출
- `SelectionAnchor.release()` 호출
- `ComponentRef.release()` 호출
- 남아 있는 `NotificationHandle.close()` 호출

## 호환성 규칙

- Integration API 1.x에서는 공개된 메서드의 의미를 유지합니다.
- capability와 normalization warning code는 추가될 수 있습니다.
- 명령과 첨부 기능은 인스턴스 구성에 따라 사용할 수 없을 수 있으므로 실행 전 확인하십시오.
- 새 코드는 `editor_sequence`를 명시적으로 전달하십시오.
- `editorPrevSrl`, `editorPrevNode`, `_getCkeInstance()`, `CKEDITOR`, `.cke_source` 같은 legacy 전역·DOM selector는 Integration API 계약이 아닙니다.
- RoundEditor 내부 클래스명, DOM 구조, ProseMirror package는 사전 고지 없이 변경될 수 있습니다.
