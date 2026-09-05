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

  const handlePointerDown = (axis: 'horizontal' | 'vertical', e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLCanvasElement).getBoundingClientRect();
    if (axis === 'horizontal') {
      const screenX = e.clientX - rect.left;
      const worldX = camera.screenToWorld({ x: screenX, y: 0 }).x;
      onAddGuide?.('vertical', worldX);
    } else {
      const screenY = e.clientY - rect.top;
      const worldY = camera.screenToWorld({ x: 0, y: screenY }).y;
      onAddGuide?.('horizontal', worldY);
    }
  };

  return (
    <>
      <div className="ruler-corner" aria-hidden="true" style={{ width: RULER_SIZE, height: RULER_SIZE, position: 'absolute', top: 0, left: 0, zIndex: 3 }} />
      <canvas
        ref={horizontalRef}
        className="ruler ruler-horizontal"
        style={{ position: 'absolute', top: 0, left: RULER_SIZE, cursor: 'ns-resize', zIndex: 2 }}
        onPointerDown={(e) => handlePointerDown('horizontal', e)}
      />
      <canvas
        ref={verticalRef}
        className="ruler ruler-vertical"
        style={{ position: 'absolute', top: RULER_SIZE, left: 0, cursor: 'ew-resize', zIndex: 2 }}
        onPointerDown={(e) => handlePointerDown('vertical', e)}
      />
    </>
  );
};
