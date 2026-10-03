import React, { useRef, useEffect, useState } from 'react';
import type { Camera } from '@vectoria/editor-engine';
import { convertUnit } from '@vectoria/shared';
import type { DocumentUnit } from '@vectoria/core';

export interface CanvasRulersProps {
  camera: Camera;
  unit: DocumentUnit;
  theme?: 'dark' | 'light';
  onAddGuide?: (axis: 'horizontal' | 'vertical', worldCoord: number) => void;
}

const RULER_SIZE = 22; // Height of horizontal ruler and width of vertical ruler in CSS px

function getThemeColor(varName: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || fallback;
}

export const CanvasRulers: React.FC<CanvasRulersProps> = ({ camera, unit, theme, onAddGuide }) => {
  const guideDragRef = useRef<{ axis: 'horizontal' | 'vertical'; pointerId: number; position: number } | null>(null);
  const guidePreviewRef = useRef<HTMLDivElement>(null);
  const [previewAxis, setPreviewAxis] = useState<'horizontal' | 'vertical' | null>(null);
  useEffect(() => {
    const cancel = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && guideDragRef.current) {
        guideDragRef.current = null;
        setPreviewAxis(null);
      }
    };
    window.addEventListener('keydown', cancel);
    return () => window.removeEventListener('keydown', cancel);
  }, []);
  const horizontalRef = useRef<HTMLCanvasElement>(null);
  const verticalRef = useRef<HTMLCanvasElement>(null);
  const [currentTheme, setCurrentTheme] = useState<'dark' | 'light'>(
    theme ?? (typeof document !== 'undefined' && document.documentElement.dataset.theme === 'light' ? 'light' : 'dark')
  );

  useEffect(() => {
    if (theme) {
      setCurrentTheme(theme);
    }
  }, [theme]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const observer = new MutationObserver(() => {
      const isLight = document.documentElement.dataset.theme === 'light';
      setCurrentTheme(isLight ? 'light' : 'dark');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let rafId: number;
    let lastCameraSig = '';

    const render = () => {
      rafId = requestAnimationFrame(render);
      const horizCanvas = horizontalRef.current;
      const vertCanvas = verticalRef.current;
      if (!horizCanvas || !vertCanvas) return;

      const horizCtx = horizCanvas.getContext('2d', { alpha: false });
      const vertCtx = vertCanvas.getContext('2d', { alpha: false });
      if (!horizCtx || !vertCtx) return;

      const sig = `${camera.pan.x.toFixed(2)},${camera.pan.y.toFixed(2)},${camera.zoom.toFixed(4)},${currentTheme}`;
      if (sig === lastCameraSig) return;
      lastCameraSig = sig;

      const rect = horizCanvas.parentElement?.getBoundingClientRect();
      if (!rect) return;

      const width = rect.width - RULER_SIZE;
      const height = rect.height - RULER_SIZE;
      
      const dpr = window.devicePixelRatio || 1;
      
      if (horizCanvas.width !== width * dpr || horizCanvas.height !== RULER_SIZE * dpr) {
        horizCanvas.width = width * dpr;
        horizCanvas.height = RULER_SIZE * dpr;
        horizCanvas.style.width = `${width}px`;
        horizCanvas.style.height = `${RULER_SIZE}px`;
      }
      
      if (vertCanvas.width !== RULER_SIZE * dpr || vertCanvas.height !== height * dpr) {
        vertCanvas.width = RULER_SIZE * dpr;
        vertCanvas.height = height * dpr;
        vertCanvas.style.width = `${RULER_SIZE}px`;
        vertCanvas.style.height = `${height}px`;
      }

      horizCtx.scale(dpr, dpr);
      vertCtx.scale(dpr, dpr);

      const isLight = currentTheme === 'light' || (typeof document !== 'undefined' && document.documentElement.dataset.theme === 'light');
      const bgColor = getThemeColor('--color-ruler', isLight ? '#f2f2ed' : '#262624');
      const strokeColor = getThemeColor('--color-ruler-tick', isLight ? '#cacac3' : '#464641');
      const textColor = getThemeColor('--color-ruler-text', isLight ? '#55554f' : '#a8a89f');

      // Background
      horizCtx.fillStyle = bgColor;
      horizCtx.fillRect(0, 0, width, RULER_SIZE);
      vertCtx.fillStyle = bgColor;
      vertCtx.fillRect(0, 0, RULER_SIZE, height);

      horizCtx.strokeStyle = strokeColor;
      vertCtx.strokeStyle = strokeColor;
      horizCtx.fillStyle = textColor;
      vertCtx.fillStyle = textColor;
      horizCtx.font = '10px var(--font-ui), Inter, sans-serif';
      vertCtx.font = '10px var(--font-ui), Inter, sans-serif';
      horizCtx.textBaseline = 'top';
      vertCtx.textBaseline = 'top';

      const zoom = camera.zoom;
      
      // Determine step based on unit and zoom
      // Try to find a nice round number in target unit that is roughly 50-100px apart on screen
      const minScreenStep = 60; 
      const minWorldStep = minScreenStep / zoom;
      
      const exponent = Math.floor(Math.log10(minWorldStep));
      const mag = Math.pow(10, exponent);
      let stepValue;
      if (minWorldStep / mag > 5) stepValue = mag * 10;
      else if (minWorldStep / mag > 2) stepValue = mag * 5;
      else stepValue = mag * 2;

      const stepPx = stepValue; // world units are always pixels internally
      
      const topLeftWorld = camera.screenToWorld({ x: 0, y: 0 });
      const bottomRightWorld = camera.screenToWorld({ x: width, y: height });

      // Horizontal
      horizCtx.beginPath();
      const startX = Math.floor(topLeftWorld.x / stepPx) * stepPx;
      for (let x = startX; x <= bottomRightWorld.x; x += stepPx) {
        const screenX = camera.worldToScreen({ x, y: 0 }).x;
        horizCtx.moveTo(screenX, RULER_SIZE - 4);
        horizCtx.lineTo(screenX, RULER_SIZE);
        
        const displayValue = Math.round(convertUnit(x, 'px', unit) * 10) / 10;
        horizCtx.fillText(displayValue.toString(), screenX + 3, 2);
        
        // Subdivisions
        for (let i = 1; i < 10; i++) {
          const subX = screenX + (i * stepPx * zoom) / 10;
          if (subX < width) {
            horizCtx.moveTo(subX, RULER_SIZE - (i === 5 ? 8 : 4));
            horizCtx.lineTo(subX, RULER_SIZE);
          }
        }
      }
      horizCtx.stroke();

      // Vertical
      vertCtx.beginPath();
      const startY = Math.floor(topLeftWorld.y / stepPx) * stepPx;
      for (let y = startY; y <= bottomRightWorld.y; y += stepPx) {
        const screenY = camera.worldToScreen({ x: 0, y }).y;
        vertCtx.moveTo(RULER_SIZE - 4, screenY);
        vertCtx.lineTo(RULER_SIZE, screenY);
        
        const displayValue = Math.round(convertUnit(y, 'px', unit) * 10) / 10;
        
        vertCtx.save();
        vertCtx.translate(4, screenY + 3);
        vertCtx.rotate(-Math.PI / 2);
        vertCtx.fillText(displayValue.toString(), 0, 0);
        vertCtx.restore();

        for (let i = 1; i < 10; i++) {
          const subY = screenY + (i * stepPx * zoom) / 10;
          if (subY < height) {
            vertCtx.moveTo(RULER_SIZE - (i === 5 ? 8 : 4), subY);
            vertCtx.lineTo(RULER_SIZE, subY);
          }
        }
      }
      vertCtx.stroke();
      
      horizCtx.setTransform(1, 0, 0, 1, 0, 0);
      vertCtx.setTransform(1, 0, 0, 1, 0, 0);
    };

    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, [camera, unit, currentTheme]);

  const updateGuide = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = guideDragRef.current;
    const viewport = e.currentTarget.parentElement?.querySelector('[data-testid="canvas-viewport"]');
    if (!drag || drag.pointerId !== e.pointerId || !viewport) return;
    const rect = viewport.getBoundingClientRect();
    const screen = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const world = camera.screenToWorld(screen);
    drag.position = drag.axis === 'horizontal' ? world.y : world.x;
    const preview = guidePreviewRef.current;
    if (preview) {
      if (drag.axis === 'horizontal') preview.style.top = `${screen.y}px`;
      else preview.style.left = `${screen.x}px`;
    }
  };

  const cancelGuide = () => {
    guideDragRef.current = null;
    setPreviewAxis(null);
  };

  const handlePointerDown = (axis: 'horizontal' | 'vertical', e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    guideDragRef.current = { axis, pointerId: e.pointerId, position: 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
    setPreviewAxis(axis);
    updateGuide(e);
  };

  const finishGuide = (e: React.PointerEvent<HTMLCanvasElement>) => {
    updateGuide(e);
    const drag = guideDragRef.current;
    const viewport = e.currentTarget.parentElement?.querySelector('[data-testid="canvas-viewport"]');
    if (drag && drag.pointerId === e.pointerId && viewport) {
      const rect = viewport.getBoundingClientRect();
      if (e.clientX >= rect.left + RULER_SIZE && e.clientX < rect.right
        && e.clientY >= rect.top + RULER_SIZE && e.clientY < rect.bottom && Number.isFinite(drag.position)) {
        onAddGuide?.(drag.axis, drag.position);
      }
    }
    cancelGuide();
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <>
      {previewAxis && <div
        ref={guidePreviewRef}
        data-testid="guide-preview"
        aria-hidden="true"
        style={{ position: 'absolute', pointerEvents: 'none', zIndex: 2,
          ...(previewAxis === 'horizontal'
            ? { left: 0, right: 0, top: 0, borderTop: '1px solid var(--color-guide)' }
            : { top: 0, bottom: 0, left: 0, borderLeft: '1px solid var(--color-guide)' }) }}
      />}
      <div className="ruler-corner" aria-hidden="true" style={{ width: RULER_SIZE, height: RULER_SIZE, position: 'absolute', top: 0, left: 0, zIndex: 3 }} />
      <canvas
        ref={horizontalRef}
        className="ruler ruler-horizontal"
        data-testid="ruler-horizontal"
        aria-label="Miarka pozioma — przeciągnij, aby utworzyć prowadnicę poziomą"
        style={{ position: 'absolute', top: 0, left: RULER_SIZE, cursor: 'ns-resize', zIndex: 2, pointerEvents: 'auto', touchAction: 'none' }}
        onPointerMove={updateGuide}
        onPointerUp={finishGuide}
        onPointerCancel={cancelGuide}
        onLostPointerCapture={cancelGuide}
        onPointerDown={(e) => handlePointerDown('horizontal', e)}
      />
      <canvas
        ref={verticalRef}
        className="ruler ruler-vertical"
        data-testid="ruler-vertical"
        aria-label="Miarka pionowa — przeciągnij, aby utworzyć prowadnicę pionową"
        style={{ position: 'absolute', top: RULER_SIZE, left: 0, cursor: 'ew-resize', zIndex: 2, pointerEvents: 'auto', touchAction: 'none' }}
        onPointerMove={updateGuide}
        onPointerUp={finishGuide}
        onPointerCancel={cancelGuide}
        onLostPointerCapture={cancelGuide}
        onPointerDown={(e) => handlePointerDown('vertical', e)}
      />
    </>
  );
};
