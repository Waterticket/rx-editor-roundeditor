# CKEditor 4 레거시 호환 범위

RoundEditor는 기존 Rhymix 모듈, 애드온, 에디터 컴포넌트의 단계적인 이전을 위해 CKEditor 4와 Rhymix 에디터 전역 함수의 일부를 파사드로 제공합니다.

이 호환 계층은 **CKEditor 4 전체 API를 구현하지 않습니다.** 아래에 명시된 속성, 메서드, 이벤트만 호환 대상으로 봅니다. 새 코드는 [RoundEditor Integration API 1.0](INTEGRATION_API.md)을 사용하십시오.

## 지원 수준

| 수준 | 의미 |
|---|---|
| 지원 | 아래에 적힌 동작을 레거시 연동에 사용할 수 있음 |
| 제한 지원 | 호출 오류를 줄이기 위한 최소 모양 또는 부분 동작만 제공함 |
| 미지원 | 구현 또는 호환성을 보장하지 않음 |

파사드가 반환하는 객체는 실제 `CKEDITOR.editor`, `CKEDITOR.dom.*`, `CKEDITOR.dom.range` 인스턴스가 아닙니다. `instanceof`, CKEditor 플러그인 로딩, CKEditor 내부 속성 접근에 의존해서는 안 됩니다.

## 인스턴스 조회와 준비 시점

### `CKEDITOR.instances`

에디터 초기화가 끝나면 다음 이름으로 파사드가 등록됩니다.

```js
const editor = CKEDITOR.instances[`roundeditor_${editorSequence}`];
```

| 경로 | 지원 수준 | 설명 |
|---|---|---|
| `CKEDITOR.instances.roundeditor_<sequence>` | 지원 | 해당 sequence의 RoundEditor 파사드 |
| `CKEDITOR.instances.editor1` | 제한 지원 | 최초 인스턴스를 위한 레거시 별칭. 다중 에디터에서 대상 선택 용도로 사용하지 말 것 |

`ckeditor4-bootstrap.js`는 RoundEditor 본체보다 먼저 `editor1` 프록시를 만듭니다. 이 프록시에서는 초기화 전 `on()`만 사용할 수 있으며, 등록한 listener는 실제 파사드에 전달됩니다.

```js
CKEDITOR.instances.editor1.on('instanceReady', event => {
    // event.editor는 준비된 RoundEditor 파사드다.
});
```

다중 에디터 페이지에서는 `editor1` 대신 `_getCkeInstance(editorSequence)` 또는 `roundeditor_<sequence>`를 사용하십시오. 가장 안전한 신규 연동 방식은 `RoundEditor.whenReady(editorSequence)`입니다.

### `_getCkeInstance(sequence)`

지정한 RoundEditor가 등록되어 있으면 CKEditor 4 파사드를 반환합니다. 해당 sequence의 RoundEditor가 없으면 RoundEditor가 설치되기 전에 존재하던 `_getCkeInstance()`로 위임합니다.

초기화 완료 전에는 값이 없을 수 있으므로 `instanceReady` 또는 `RoundEditor.whenReady()` 이후 호출하십시오.

## 에디터 파사드

### 데이터와 포커스

| API | 지원 수준 | 동작과 제한 |
|---|---|---|
| `editor.getData()` | 지원 | 현재 HTML과 연결된 form content 필드를 동기화한 뒤 문자열을 반환. visual 모드에서는 문서를 직렬화하고 source 모드에서는 textarea 내용을 minify하여 반환 |
| `editor.setData(html)` | 지원 | 문서 전체를 교체하고 현재 HTML을 반환. visual 모드에서는 즉시 파싱·정규화하고 source 모드에서는 textarea 값을 교체. `html`은 문자열로 변환되며 falsy 값은 빈 문자열로 처리 |
| `editor.insertHtml(html)` | 지원 | 현재 선택 위치에 HTML을 삽입하고 동기화 결과를 반환. visual 모드에서는 파싱·정규화하고 source 모드에서는 textarea 선택 범위를 원문으로 교체 |
| `editor.getText()` | 지원 | 문서 전체의 일반 텍스트를 반환 |
| `editor.focus()` | 지원 | 현재 visual/source 편집 영역에 포커스를 지정 |
| `editor.mode` | 지원(읽기 전용) | visual 모드는 `'wysiwyg'`, source 모드는 `'source'`. 값을 대입해도 모드는 전환되지 않음 |

visual 모드에 입력된 HTML은 RoundEditor 스키마에 맞게 파싱·정규화됩니다. 지원하지 않거나 위험한 태그와 속성은 제거될 수 있으므로 입력 문자열과 `getData()` 결과가 같다고 가정하지 마십시오. source 모드의 textarea 값은 source 모드를 닫거나 form을 제출하여 visual 문서에 반영할 때 파싱·정규화됩니다. CKEditor의 `internal`, `unfiltered_html` 같은 mode 인수는 지원하지 않습니다.

`setData()`의 CKEditor callback 인수와 options 인수, `insertHtml()`의 mode/range 인수는 구현하지 않습니다. 비동기 callback을 기다리는 코드는 `instanceReady`가 아니라 호출 직후 반환값을 사용하거나 Integration API로 이전해야 합니다.

### 이벤트

| API | 지원 수준 | 동작 |
|---|---|---|
| `editor.on(name, listener)` | 지원 | listener를 등록하고 editor를 반환 |
| `editor.once(name, listener)` | 지원 | 한 번만 실행되는 listener를 등록하고 editor를 반환 |
| `editor.removeListener(name, listener)` | 지원 | 동일 함수 참조의 listener를 제거하고 editor를 반환 |
| `editor.hasListeners(name)` | 지원 | 등록된 listener가 있으면 `true` |
| `editor.fire(name, data)` | 지원 | 동기적으로 listener를 실행하고 event 객체를 반환 |

파사드 event의 최소 형태는 다음과 같습니다.

```ts
interface LegacyEvent {
    name: string;
    editor: LegacyEditorFacade;
    sender: LegacyEditorFacade;
    data: object;
    stop(): void;
    cancel(): void;
    readonly stopped: boolean;
}
```

`stop()`과 `cancel()`은 모두 `stopped`를 `true`로 만듭니다. listener 전파 자체를 중단하지는 않습니다.

RoundEditor가 자동으로 발생시키는 호환 이벤트는 다음뿐입니다.

| 이벤트 | data | 설명 |
|---|---|---|
| `instanceReady` | `{}` | 파사드 초기화 완료. 완료 후 listener를 등록해도 microtask에서 한 번 호출됨 |
| `paste` | `{ dataValue, dataTransfer: { $ } }` | 일반 붙여넣기 처리 전 발생. `stop()`/`cancel()`하면 RoundEditor의 후속 일반 붙여넣기 처리를 막음 |
| `drop` | `{ dataTransfer: { $ } }` | RoundEditor가 파일 업로드나 내부 이동으로 먼저 처리하지 않은 drop에서 발생. 중단하면 후속 처리를 막음 |
| `insertHtml` | `{ dataValue }` | 파사드의 `insertHtml()`이 호출된 뒤 발생 |

`change`, `selectionChange`, `focus`, `blur`, `mode`, `beforeCommandExec`, `afterCommandExec` 등의 CKEditor 4 이벤트는 파사드에서 자동 발생하지 않습니다. 이름이 임의 이벤트 저장소에 등록될 수 있다는 사실을 해당 이벤트의 지원으로 해석하면 안 됩니다.

### 선택 영역

| API | 지원 수준 | 동작과 제한 |
|---|---|---|
| `editor.getSelection().getSelectedText()` | 지원 | 현재 선택 영역의 일반 텍스트 반환 |
| `editor.getSelection().createBookmarks()` | 제한 지원 | 항상 빈 배열 `[]` 반환 |
| `editor.getSelection().selectRanges()` | 제한 지원 | 아무 동작도 하지 않음 |

CKEditor bookmark/range를 이용한 비동기 선택 위치 복원은 지원하지 않습니다. 대신 Integration API의 `editor.selection.capture()`와 `content.insertHTML({ at })`를 사용하십시오.

### 편집 가능 영역

`editor.editable()`은 최소 이벤트 파사드를 반환하며 실제 `CKEDITOR.dom.element`가 아닙니다.

| API | 지원 수준 | 동작과 제한 |
|---|---|---|
| `editable.on('input', listener)` | 지원 | visual 편집 DOM의 native `input`을 `{ $: nativeEvent }`로 감싸 전달 |
| `editable.removeListener(name, listener)` | 지원 | listener 제거 |
| `editable.fire(name, nativeEvent)` | 제한 지원 | 등록된 listener를 수동 실행. event의 `editor`는 `null` |

자동 전달되는 editable 이벤트는 `input`뿐입니다. CKEditor DOM wrapper 메서드와 키보드·selection 이벤트 호환은 제공하지 않습니다.

### 알림

```js
const notification = editor.showNotification('업로드 중', 'progress', 0);
notification.update({ message: '업로드 중', progress: 50, type: 'progress' });
notification.hide();
```

| API | 지원 수준 | 동작과 제한 |
|---|---|---|
| `editor.showNotification(message, type, duration)` | 지원 | RoundEditor wrapper에 status 알림을 추가하고 handle 반환 |
| `notification.update(values)` | 지원 | `message`, `type`, `progress`, `duration` 갱신 후 자기 자신 반환 |
| `notification.hide()` | 지원 | 타이머를 취소하고 알림 DOM 제거 |

`duration > 0`이면 millisecond 뒤 자동으로 숨습니다. progress가 있으면 표시 문자열 뒤에 `N%`가 붙습니다. CKEditor notification plugin의 stacking, primary/secondary UI, 모든 type별 시각 표현까지 호환하지는 않습니다.

### `editor.document`

| API | 지원 수준 | 동작과 제한 |
|---|---|---|
| `editor.document.find(selector).toArray()` | 제한 지원 | visual 편집 영역의 `querySelectorAll()` 결과인 native DOM element 배열 반환 |
| `editor.document.getBody().getHtml()` | 지원 | `editor.getData()`와 동일 |
| `editor.document.getBody().setHtml(html)` | 지원 | `editor.setData(html)`와 동일 |
| `editor.document.getById(id)` | 제한 지원 | visual 편집 영역에서 찾은 native DOM element 또는 `null` 반환 |
| `editor.createRange()` | 제한 지원 | no-op `setStart()`와 `setEnd()`만 가진 객체 반환 |

반환 노드는 `CKEDITOR.dom.node`가 아닌 native DOM element입니다. 편집 DOM을 직접 변경해도 문서 state나 저장 HTML에 반영된다는 보장이 없으며, 렌더링 시 덮어써질 수 있습니다. selector가 잘못되면 native `querySelectorAll()` 예외가 발생할 수 있습니다.

## Rhymix 레거시 전역 함수

| 함수 | 지원 수준 | RoundEditor 대상 동작 |
|---|---|---|
| `_getCkeInstance(sequence)` | 지원 | 해당 sequence의 CKEditor 4 파사드 반환 |
| `_getCkeContainer(sequence)` | 제한 지원 | jQuery가 있으면 wrapper의 jQuery 객체, 없으면 native wrapper element 반환 |
| `editorGetIFrame(sequence)` | 제한 지원 | iframe이 아니라 visual 편집 영역의 native DOM element 반환 |
| `editorReplaceHTML(frame, html)` | 지원 | `frame`으로 RoundEditor를 찾아 현재 선택 위치에 HTML 삽입 |
| `editorGetContent(sequence)` | 지원 | content 필드를 동기화하고 현재 HTML 반환 |
| `editorGetContentTextarea_xe(sequence)` | 지원 | 문서 전체의 일반 텍스트 반환 |
| `editorGetSelectedHtml(sequence)` | 지원 | 현재 선택 영역 HTML 반환. source 모드에서는 textarea에서 선택된 원문 반환 |

해당 sequence나 frame이 RoundEditor에 속하지 않으면 스킨 설치 전에 존재하던 같은 이름의 함수로 위임합니다. 이전 함수도 없으면 함수별로 `null`, 빈 문자열 또는 `undefined`가 반환될 수 있으므로 RoundEditor가 아닌 에디터에 대한 fallback 반환형은 이 문서의 계약이 아닙니다.

`editorGetIFrame()`의 반환값은 iframe과 jQuery 객체가 아닙니다. 반환 DOM에는 호환을 위해 다음 멤버만 추가됩니다.

| 멤버 | 지원 수준 | 동작 |
|---|---|---|
| `frame.editor_sequence` | 지원 | 숫자 sequence |
| `frame.setFocus()` | 지원 | visual 편집 영역에 포커스 |
| `frame.replaceHTML(html)` | 지원 | 현재 선택 위치에 HTML 삽입 |

## Rhymix 레거시 전역 상태

RoundEditor는 Rhymix 공통 에디터 코드와의 연동을 위해 다음 값을 게시합니다. 외부 코드에서 새로 의존하는 것은 권장하지 않습니다.

```js
editorRelKeys[sequence] = {
    primary, // 현재 primary form control
    content, // 현재 content form control
    func,    // content 동기화 함수
    pasteHTML,
    editor: { getFrame }
};

editorMode[sequence] = null;   // visual
editorMode[sequence] = 'html'; // source
```

form control이 다른 element로 교체되면 다음 동기화 때 `editorRelKeys[sequence]`도 새 control을 가리킵니다. form에는 `editor_sequence` 속성과 `use_editor=Y`, `use_html=Y` hidden field가 설정됩니다.

## 명시적으로 지원하지 않는 CKEditor 4 영역

다음 항목은 파사드의 지원 범위 밖입니다.

- `CKEDITOR.replace()`, `CKEDITOR.inline()`, `CKEDITOR.editor` 생성 및 인스턴스 생명 주기 관리
- `CKEDITOR.plugins`, `addCommand()`, `execCommand()`, toolbar/button/dialog/menu 등록
- `editor.config`, `editor.ui`, `editor.commands`, `editor.filter`, `editor.dataProcessor`
- CKEditor DOM element/document/window wrapper와 DOM iterator
- 실제 range, selection range, bookmark 생성·복원
- `editor.destroy()`, `updateElement()`, `setMode()`, `resize()`, `keystrokeHandler`
- CKEditor upload, fileTools, widget, clipboard, undo manager API
- iframe 구조, `.cke_*` DOM 구조 또는 CSS class 호환 (`.cke_source`는 내부 source textarea 식별자일 뿐 공개 계약이 아님)
- CKEditor 4 플러그인을 수정 없이 로드하거나 실행하는 것

문서에 없는 속성이나 메서드는 현재 우연히 존재하더라도 호환 계약이 아닙니다.

## 이전 권장표

| 레거시 사용 | Integration API 1.0 대체 |
|---|---|
| `_getCkeInstance(sequence)` | `await RoundEditor.whenReady(sequence)` |
| `getData()` / `editorGetContent()` | `editor.content.getHTML()` 또는 `editor.document.sync()` |
| `setData(html)` | `editor.content.setHTML(html)` |
| `insertHtml(html)` / `editorReplaceHTML()` | `editor.content.insertHTML(html)` |
| `getSelectedText()` | `editor.selection.getText()` |
| `editorGetSelectedHtml()` | `editor.selection.getHTML()` |
| bookmark/range | `editor.selection.capture()`로 만든 anchor |
| `showNotification()` | `editor.ui.notify()` |
| undo/redo 등 명령 | `editor.commands.execute()` |
| `editor.mode` | `editor.mode.current` |
| CKEditor/Rhymix 호환 이벤트 | `editor.on()`의 Integration API 이벤트 |

Integration API의 정확한 options, 반환값, 오류와 capability는 [Integration API 문서](INTEGRATION_API.md)를 참조하십시오.
