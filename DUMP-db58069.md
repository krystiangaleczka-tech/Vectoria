# Commit db58069 — E2E Test Fixes + data-testid

**Commit:** `db58069cebe24a9ec5279a94b91b9164b8f6a5d0`  
**Data:** 2026-08-22 02:15:58 +0200  
**Autor:** Krystian Gałeczka  
**Plik patch:** `DUMP-db58069-code-changes.patch` (353 linie)

---

## Zmienione pliki (7 plików kodu)

```
apps/web/e2e/editor.spec.ts                      | 139 +-
apps/web/src/features/canvas/CanvasViewport.tsx  |   1 +
apps/web/src/features/panels/PropertiesPanel.tsx |   5 +
apps/web/src/features/statusbar/StatusBar.tsx    |   1 +
apps/web/src/features/toolbar/ToolRail.tsx       |   1 +
apps/web/src/features/topbar/TopBar.tsx          |   2 +
packages/ui/src/primitives/NumberInput.tsx       |   3 +
```

---

## 1. E2E testy — prawdziwe asercje

### Test: Drag preview + undo/redo

**Przed:** Kliknięcia bez `expect()`, brak weryfikacji pozycji  
**Po:** Asercje na `prop-x`/`prop-y` input values

```typescript
// Podczas drag — pozycja niezmieniona (preview only)
const xDuringDrag = await xInput.inputValue();
const yDuringDrag = await yInput.inputValue();
expect(xDuringDrag).toBe(initialX);
expect(yDuringDrag).toBe(initialY);

// Po mouse.up() — pozycja zmieniona
const newX = await xInput.inputValue();
const newY = await yInput.inputValue();
expect(parseFloat(newX)).toBeGreaterThan(parseFloat(initialX));
expect(parseFloat(newY)).toBeGreaterThan(parseFloat(initialY));

// Po undo — powrót do oryginału
const xAfterUndo = await xInput.inputValue();
const yAfterUndo = await yInput.inputValue();
expect(xAfterUndo).toBe(initialX);
expect(yAfterUndo).toBe(initialY);

// Po redo — ponowna zmiana
const xAfterRedo = await xInput.inputValue();
const yAfterRedo = await yInput.inputValue();
expect(xAfterRedo).toBe(newX);
expect(yAfterRedo).toBe(newY);
```

### Test: SVG export

**Przed:** Tylko `test.skip()` + sprawdzenie rozszerzenia `.svg`  
**Po:** Odczyt treści pliku, weryfikacja struktury XML

```typescript
const stream = await download.createReadStream();
const chunks: Buffer[] = [];

await new Promise((resolve, reject) => {
  stream.on('data', (chunk: Buffer) => chunks.push(chunk));
  stream.on('end', resolve);
  stream.on('error', reject);
});

const svgContent = Buffer.concat(chunks).toString('utf-8');

expect(svgContent).toContain('<?xml version="1.0" encoding="UTF-8"?>');
expect(svgContent).toContain('<svg');
expect(svgContent).toContain('viewBox="0 0');
expect(svgContent).toContain('<rect');
expect(svgContent).toContain('width="');
expect(svgContent).toContain('height="');
expect(svgContent).toContain('transform="matrix(');
```

### Test: Autosave persistence

**Przed:** Tylko `expect(canvas).toBeVisible()` po reloadzie  
**Po:** Sprawdzenie obiektu, właściwości, wartości X/Y

```typescript
// Po reloadzie — obiekt nadal istnieje
await expect(statusbar).toContainText('1 object');

// Kliknięcie na obiekt
await selectTool.click();
await page.mouse.click(cx, cy);

// Panel pokazuje właściwości obiektu
await expect(propsPanel).toContainText('Object Properties');

// Wartości X/Y są poprawne
const xValue = await xInput.inputValue();
const yValue = await yInput.inputValue();

expect(xValue).not.toBe('');
expect(yValue).not.toBe('');
expect(parseFloat(xValue)).toBeGreaterThan(0);
expect(parseFloat(yValue)).toBeGreaterThan(0);
```

---

## 2. data-testid na komponentach UI

| Komponent | data-testid |
|-----------|-------------|
| CanvasViewport | `canvas-viewport` |
| PropertiesPanel | `properties-panel` |
| NumberInput (X) | `prop-x` |
| NumberInput (Y) | `prop-y` |
| NumberInput (W) | `prop-w` |
| NumberInput (H) | `prop-h` |
| TopBar | `topbar` |
| ToolRail | `tool-rail` |
| StatusBar | `statusbar` |
| Export SVG button | `export-svg-button` |

### Zmiany w kodzie

**CanvasViewport.tsx:**
```tsx
<div
  ref={containerRef}
  data-testid="canvas-viewport"
  onWheel={handleWheel}
  ...
>
```

**PropertiesPanel.tsx:**
```tsx
<aside
  data-testid="properties-panel"
  style={{
  ...
>
```

**NumberInput.tsx:**
```tsx
export interface NumberInputProps {
  label: string;
  value: number;
  ...
  'data-testid'?: string;
  onChange: (val: number) => void;
}

export const NumberInput: React.FC<NumberInputProps> = ({
  label,
  value,
  ...
  'data-testid': testId,
  onChange,
}) => {
  ...
  return (
    <div
      data-testid={testId}
      style={{
      ...
    >
```

**PropertiesPanel.tsx — NumberInput z testid:**
```tsx
<NumberInput
  data-testid="prop-x"
  label="X"
  value={selectedObject.transform.position.x}
  onChange={(newX) => ...}
/>
<NumberInput
  data-testid="prop-y"
  label="Y"
  value={selectedObject.transform.position.y}
  onChange={(newY) => ...}
/>
<NumberInput
  data-testid="prop-w"
  label="W"
  value={(selectedObject as RectangleObject).width}
  min={1}
  onChange={(newW) => ...}
/>
<NumberInput
  data-testid="prop-h"
  label="H"
  value={(selectedObject as RectangleObject).height}
  min={1}
  onChange={(newH) => ...}
/>
```

**TopBar.tsx:**
```tsx
<header
  data-testid="topbar"
  style={{
  ...
>
```

**TopBar.tsx — Export button:**
```tsx
<Button
  data-testid="export-svg-button"
  size="sm"
  variant="primary"
  icon={<VectoriaIcon name="fileExport" size={14} />}
  onClick={onExportSvg}
>
  Export SVG
</Button>
```

**ToolRail.tsx:**
```tsx
<aside
  data-testid="tool-rail"
  style={{
  ...
>
```

**StatusBar.tsx:**
```tsx
<footer
  data-testid="statusbar"
  style={{
  ...
>
```

---

## Wyniki weryfikacji

| Sprawdzenie | Wynik |
|-------------|-------|
| `pnpm test` | 62 testy — 0 błędów |
| `pnpm typecheck` | 7/7 pakietów — 0 błędów |
| `pnpm lint` | 7/7 pakietów — 0 błędów, 0 ostrzeżeń |

---

## Pełny diff

```diff
diff --git a/apps/web/e2e/editor.spec.ts b/apps/web/e2e/editor.spec.ts
index 84b6c22..934ca1c 100644
--- a/apps/web/e2e/editor.spec.ts
+++ b/apps/web/e2e/editor.spec.ts
@@ -6,33 +6,30 @@ test.describe('Vectoria MVP Skeleton', () => {
 
     await expect(page).toHaveTitle(/Vectoria/i);
 
-    const canvasContainer = page.locator('div[style*="cursor: default"]');
-    await expect(canvasContainer).toBeVisible();
+    const canvas = page.locator('[data-testid="canvas-viewport"]');
+    await expect(canvas).toBeVisible();
 
-    const propertiesPanel = page.locator('aside:has-text("Properties")');
+    const propertiesPanel = page.locator('[data-testid="properties-panel"]');
     await expect(propertiesPanel).toBeVisible();
 
     const rectangleTool = page.locator('button[title="Rectangle Tool (R)"]');
     await expect(rectangleTool).toBeVisible();
   });
 
-  test('draw rectangle → select → drag → undo → redo → verify no doc mutation during drag', async ({ page }) => {
+  test('draw rectangle → select → drag → verify position changes → undo → redo', async ({ page }) => {
     await page.goto('/');
     await page.waitForLoadState('networkidle');
 
-    // Wait for editor to load
-    const canvas = page.locator('canvas').first();
+    const canvas = page.locator('[data-testid="canvas-viewport"]');
     await expect(canvas).toBeVisible();
 
     // Select rectangle tool
     const rectTool = page.locator('button[title="Rectangle Tool (R)"]');
     await rectTool.click();
 
-    // Get the canvas bounding box
     const canvasBox = await canvas.boundingBox();
     if (!canvasBox) throw new Error('Canvas not found');
 
-    // Center of canvas (artboard should be centered)
     const cx = canvasBox.x + canvasBox.width / 2;
     const cy = canvasBox.y + canvasBox.height / 2;
 
@@ -49,38 +46,64 @@ test.describe('Vectoria MVP Skeleton', () => {
     // Click on the rectangle to select it
     await page.mouse.click(cx, cy);
 
-    // Verify properties panel shows the rectangle
-    const propsPanel = page.locator('aside');
-    await expect(propsPanel).toContainText(/Object Properties|Transform/i);
+    // Verify properties panel shows the rectangle with initial position
+    const propsPanel = page.locator('[data-testid="properties-panel"]');
+    await expect(propsPanel).toContainText('Object Properties');
+
+    const xInput = page.locator('[data-testid="prop-x"] input');
+    const yInput = page.locator('[data-testid="prop-y"] input');
+    
+    const initialX = await xInput.inputValue();
+    const initialY = await yInput.inputValue();
 
     // Drag the rectangle to move it
     await page.mouse.move(cx, cy);
     await page.mouse.down();
-    await page.mouse.move(cx + 100, cy + 100, { steps: 10 });
+    
+    // Move but don't release yet - verify position hasn't changed (no doc mutation during drag)
+    await page.mouse.move(cx + 50, cy + 50, { steps: 5 });
+    
+    // Position should still be initial (preview only, not committed)
+    const xDuringDrag = await xInput.inputValue();
+    const yDuringDrag = await yInput.inputValue();
+    expect(xDuringDrag).toBe(initialX);
+    expect(yDuringDrag).toBe(initialY);
+    
+    // Release mouse to commit the move
     await page.mouse.up();
 
+    // Now position should have changed
+    const newX = await xInput.inputValue();
+    const newY = await yInput.inputValue();
+    expect(parseFloat(newX)).toBeGreaterThan(parseFloat(initialX));
+    expect(parseFloat(newY)).toBeGreaterThan(parseFloat(initialY));
+
     // Undo the move (Cmd+Z on Mac, Ctrl+Z on others)
     const isMac = process.platform === 'darwin';
     const mod = isMac ? 'Meta' : 'Control';
     await page.keyboard.press(`${mod}+z`);
 
     // Verify rectangle is back at original position
-    // The properties panel should show the original coordinates
-    await page.mouse.click(cx, cy);
+    const xAfterUndo = await xInput.inputValue();
+    const yAfterUndo = await yInput.inputValue();
+    expect(xAfterUndo).toBe(initialX);
+    expect(yAfterUndo).toBe(initialY);
 
     // Redo the move
     await page.keyboard.press(`${mod}+Shift+z`);
 
     // Verify rectangle moved again
-    await page.mouse.click(cx + 100, cy + 100);
+    const xAfterRedo = await xInput.inputValue();
+    const yAfterRedo = await yInput.inputValue();
+    expect(xAfterRedo).toBe(newX);
+    expect(yAfterRedo).toBe(newY);
   });
 
   test('SVG export contains correct structure', async ({ page }) => {
     await page.goto('/');
     await page.waitForLoadState('networkidle');
 
-    // Draw a rectangle
-    const canvas = page.locator('canvas').first();
+    const canvas = page.locator('[data-testid="canvas-viewport"]');
     await expect(canvas).toBeVisible();
 
     const rectTool = page.locator('button[title="Rectangle Tool (R)"]');
@@ -101,33 +124,41 @@ test.describe('Vectoria MVP Skeleton', () => {
     const downloadPromise = page.waitForEvent('download');
 
     // Click export SVG button
-    const exportBtn = page.locator('button:has-text("SVG")').first();
-    if (await exportBtn.isVisible()) {
-      await exportBtn.click();
-    } else {
-      // Try keyboard shortcut or menu
-      const exportMenu = page.locator('button:has-text("Export")').first();
-      if (await exportMenu.isVisible()) {
-        await exportMenu.click();
-        await page.locator('text=SVG').first().click();
-      }
-    }
-
-    // Verify download was triggered
-    try {
-      const download = await downloadPromise;
-      expect(download.suggestedFilename()).toMatch(/\.svg$/i);
-    } catch {
-      // Export button might not be visible in skeleton — skip gracefully
-      test.skip();
-    }
+    const exportBtn = page.locator('[data-testid="export-svg-button"]');
+    await expect(exportBtn).toBeVisible();
+    await exportBtn.click();
+
+    // Verify download was triggered and contains correct SVG structure
+    const download = await downloadPromise;
+    expect(download.suggestedFilename()).toMatch(/\.svg$/i);
+
+    // Read the downloaded file content
+    const stream = await download.createReadStream();
+    const chunks: Buffer[] = [];
+    
+    await new Promise((resolve, reject) => {
+      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
+      stream.on('end', resolve);
+      stream.on('error', reject);
+    });
+
+    const svgContent = Buffer.concat(chunks).toString('utf-8');
+
+    // Verify SVG structure
+    expect(svgContent).toContain('<?xml version="1.0" encoding="UTF-8"?>');
+    expect(svgContent).toContain('<svg');
+    expect(svgContent).toContain('viewBox="0 0');
+    expect(svgContent).toContain('<rect');
+    expect(svgContent).toContain('width="');
+    expect(svgContent).toContain('height="');
+    expect(svgContent).toContain('transform="matrix(');
   });
 
   test('autosave: document persists after page reload', async ({ page }) => {
     await page.goto('/');
     await page.waitForLoadState('networkidle');
 
-    const canvas = page.locator('canvas').first();
+    const canvas = page.locator('[data-testid="canvas-viewport"]');
     await expect(canvas).toBeVisible();
 
     // Draw a rectangle
@@ -145,6 +176,10 @@ test.describe('Vectoria MVP Skeleton', () => {
     await page.mouse.move(cx + 40, cy + 40, { steps: 5 });
     await page.mouse.up();
 
+    // Verify object count is 1
+    const statusbar = page.locator('[data-testid="statusbar"]');
+    await expect(statusbar).toContainText('1 object');
+
     // Wait for autosave (debounced at 700ms)
     await page.waitForTimeout(1500);
 
@@ -153,8 +188,30 @@ test.describe('Vectoria MVP Skeleton', () => {
     await page.waitForLoadState('networkidle');
 
     // Verify the editor loaded with the saved document
-    // The canvas should still be visible and the object count should be > 0
-    // Just verify the editor loaded successfully
-    await expect(page.locator('canvas').first()).toBeVisible();
+    await expect(canvas).toBeVisible();
+
+    // Verify object count is still 1 after reload
+    await expect(statusbar).toContainText('1 object');
+
+    // Switch to select tool and click where the rectangle was
+    const selectTool = page.locator('button[title="Select Tool (V)"]');
+    await selectTool.click();
+    await page.mouse.click(cx, cy);
+
+    // Verify properties panel shows the rectangle (proves it was saved and restored)
+    const propsPanel = page.locator('[data-testid="properties-panel"]');
+    await expect(propsPanel).toContainText('Object Properties');
+    
+    // Verify X and Y inputs have values (not empty)
+    const xInput = page.locator('[data-testid="prop-x"] input');
+    const yInput = page.locator('[data-testid="prop-y"] input');
+    
+    const xValue = await xInput.inputValue();
+    const yValue = await yInput.inputValue();
+    
+    expect(xValue).not.toBe('');
+    expect(yValue).not.toBe('');
+    expect(parseFloat(xValue)).toBeGreaterThan(0);
+    expect(parseFloat(yValue)).toBeGreaterThan(0);
   });
 });
diff --git a/apps/web/src/features/canvas/CanvasViewport.tsx b/apps/web/src/features/canvas/CanvasViewport.tsx
index 8abcc01..0c58247 100644
--- a/apps/web/src/features/canvas/CanvasViewport.tsx
+++ b/apps/web/src/features/canvas/CanvasViewport.tsx
@@ -420,6 +420,7 @@ export const CanvasViewport: React.FC<CanvasViewportProps> = ({
   return (
     <div
       ref={containerRef}
+      data-testid="canvas-viewport"
       onWheel={handleWheel}
       onPointerDown={handlePointerDown}
       onPointerMove={handlePointerMove}
diff --git a/apps/web/src/features/panels/PropertiesPanel.tsx b/apps/web/src/features/panels/PropertiesPanel.tsx
index 8d971e8..86a5cca 100644
--- a/apps/web/src/features/panels/PropertiesPanel.tsx
+++ b/apps/web/src/features/panels/PropertiesPanel.tsx
@@ -22,6 +22,7 @@ export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
 
   return (
     <aside
+      data-testid="properties-panel"
       style={{
         width: '280px',
         minWidth: '280px',
@@ -69,6 +70,7 @@ export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
               </span>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                 <NumberInput
+                  data-testid="prop-x"
                   label="X"
                   value={selectedObject.transform.position.x}
                   onChange={(newX) =>
@@ -76,6 +78,7 @@ export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
                   }
                 />
                 <NumberInput
+                  data-testid="prop-y"
                   label="Y"
                   value={selectedObject.transform.position.y}
                   onChange={(newY) =>
@@ -85,6 +88,7 @@ export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
               </div>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                 <NumberInput
+                  data-testid="prop-w"
                   label="W"
                   value={(selectedObject as RectangleObject).width}
                   min={1}
@@ -93,6 +97,7 @@ export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
                   }
                 />
                 <NumberInput
+                  data-testid="prop-h"
                   label="H"
                   value={(selectedObject as RectangleObject).height}
                   min={1}
diff --git a/apps/web/src/features/statusbar/StatusBar.tsx b/apps/web/src/features/statusbar/StatusBar.tsx
index b26eed3..e84d077 100644
--- a/apps/web/src/features/statusbar/StatusBar.tsx
+++ b/apps/web/src/features/statusbar/StatusBar.tsx
@@ -18,6 +18,7 @@ export const StatusBar: React.FC<StatusBarProps> = ({
 }) => {
   return (
     <footer
+      data-testid="statusbar"
       style={{
         height: '26px',
         minHeight: '26px',
diff --git a/apps/web/src/features/toolbar/ToolRail.tsx b/apps/web/src/features/toolbar/ToolRail.tsx
index cd194d4..0288c76 100644
--- a/apps/web/src/features/toolbar/ToolRail.tsx
+++ b/apps/web/src/features/toolbar/ToolRail.tsx
@@ -11,6 +11,7 @@ export interface ToolRailProps {
 export const ToolRail: React.FC<ToolRailProps> = ({ activeTool, onSelectTool }) => {
   return (
     <aside
+      data-testid="tool-rail"
       style={{
         width: '48px',
         minWidth: '48px',
diff --git a/apps/web/src/features/topbar/TopBar.tsx b/apps/web/src/features/topbar/TopBar.tsx
index f410187..d1a5f19 100644
--- a/apps/web/src/features/topbar/TopBar.tsx
+++ b/apps/web/src/features/topbar/TopBar.tsx
@@ -28,6 +28,7 @@ export const TopBar: React.FC<TopBarProps> = ({
 }) => {
   return (
     <header
+      data-testid="topbar"
       style={{
         height: '40px',
         minHeight: '40px',
@@ -159,6 +160,7 @@ export const TopBar: React.FC<TopBarProps> = ({
 
         {/* Export SVG */}
         <Button
+          data-testid="export-svg-button"
           size="sm"
           variant="primary"
           icon={<VectoriaIcon name="fileExport" size={14} />}
diff --git a/packages/ui/src/primitives/NumberInput.tsx b/packages/ui/src/primitives/NumberInput.tsx
index 2ea6158..2cbf55a 100644
--- a/packages/ui/src/primitives/NumberInput.tsx
+++ b/packages/ui/src/primitives/NumberInput.tsx
@@ -9,6 +9,7 @@ export interface NumberInputProps {
   step?: number;
   decimals?: number;
   disabled?: boolean;
+  'data-testid'?: string;
   onChange: (val: number) => void;
 }
 
@@ -21,6 +22,7 @@ export const NumberInput: React.FC<NumberInputProps> = ({
   step = 1,
   decimals = 0,
   disabled = false,
+  'data-testid': testId,
   onChange,
 }) => {
   const [text, setText] = useState(() => value.toFixed(decimals));
@@ -75,6 +77,7 @@ export const NumberInput: React.FC<NumberInputProps> = ({
 
   return (
     <div
+      data-testid={testId}
       style={{
         display: 'flex',
         alignItems: 'center',
```
