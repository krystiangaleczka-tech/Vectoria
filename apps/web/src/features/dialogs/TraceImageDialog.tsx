import React, { useState, useEffect, useRef } from 'react';
import type { ImageObject, PathObject } from '@vectoria/core';
import { traceImageToPaths, type TraceOptions, type PixelBuffer } from '@vectoria/core';
import { VectoriaIcon } from '@vectoria/ui';

export interface TraceImageDialogProps {
  image: ImageObject;
  isOpen: boolean;
  onClose: () => void;
  onApply: (paths: readonly PathObject[]) => void;
}

export const TraceImageDialog: React.FC<TraceImageDialogProps> = ({
  image,
  isOpen,
  onClose,
  onApply,
}) => {
  const [mode, setMode] = useState<'black-and-white' | 'color'>('black-and-white');
  const [threshold, setThreshold] = useState<number>(128);
  const [colorCount, setColorCount] = useState<number>(4);
  const [simplifyTolerance, setSimplifyTolerance] = useState<number>(1.5);
  const [tracedPaths, setTracedPaths] = useState<PathObject[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    let isCancelled = false;
    setIsProcessing(true);

    const runTrace = async () => {
      const src = image.source.type === 'embed' ? image.source.data : image.source.url;
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        if (isCancelled) return;
        const offscreen = document.createElement('canvas');
        const w = Math.min(image.naturalWidth, 400);
        const h = Math.min(image.naturalHeight, 400);
        offscreen.width = w;
        offscreen.height = h;
        const ctx = offscreen.getContext('2d');
        if (!ctx) {
          setIsProcessing(false);
          return;
        }

        ctx.drawImage(img, 0, 0, w, h);
        const imgData = ctx.getImageData(0, 0, w, h);

        const pixels: PixelBuffer = {
          data: imgData.data,
          width: w,
          height: h,
        };

        const opts: TraceOptions = {
          mode,
          threshold,
          colorCount,
          simplifyTolerance,
        };

        const paths = traceImageToPaths(pixels, opts);

        // Scale paths to match image object dimensions
        const scaleX = image.width / w;
        const scaleY = image.height / h;
        const scaledPaths = paths.map((p) => ({
          ...p,
          transform: {
            ...p.transform,
            position: {
              x: image.transform.position.x,
              y: image.transform.position.y,
            },
          },
          nodes: p.nodes.map((node) => ({
            ...node,
            point: { x: node.point.x * scaleX, y: node.point.y * scaleY },
            inHandle: node.inHandle ? { x: node.inHandle.x * scaleX, y: node.inHandle.y * scaleY } : null,
            outHandle: node.outHandle ? { x: node.outHandle.x * scaleX, y: node.outHandle.y * scaleY } : null,
          })),
        }));

        setTracedPaths(scaledPaths);
        setIsProcessing(false);

        // Draw preview
        const pCanvas = previewCanvasRef.current;
        if (pCanvas) {
          pCanvas.width = 280;
          pCanvas.height = 200;
          const pCtx = pCanvas.getContext('2d');
          if (pCtx) {
            pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);
            pCtx.fillStyle = '#1e1e24';
            pCtx.fillRect(0, 0, pCanvas.width, pCanvas.height);

            const fitScale = Math.min(260 / image.width, 180 / image.height);
            pCtx.save();
            pCtx.translate((280 - image.width * fitScale) / 2, (200 - image.height * fitScale) / 2);
            pCtx.scale(fitScale, fitScale);

            for (const path of scaledPaths) {
              pCtx.fillStyle = path.style.fill.type === 'solid' ? path.style.fill.color : '#000000';
              pCtx.beginPath();
              path.nodes.forEach((n, idx) => {
                if (idx === 0) pCtx.moveTo(n.point.x, n.point.y);
                else pCtx.lineTo(n.point.x, n.point.y);
              });
              pCtx.closePath();
              pCtx.fill();
            }
            pCtx.restore();
          }
        }
      };

      img.onerror = () => {
        if (!isCancelled) setIsProcessing(false);
      };
      img.src = src;
    };

    runTrace();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, image, mode, threshold, colorCount, simplifyTolerance]);

  if (!isOpen) return null;

  return (
    <div className="trace-dialog-overlay" role="dialog" aria-modal="true" aria-labelledby="trace-dialog-title">
      <div className="trace-dialog-card">
        <div className="trace-dialog-header">
          <div className="trace-dialog-title-row">
            <VectoriaIcon name="trace" size={20} />
            <h2 id="trace-dialog-title">Trace Image (Vectorize)</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close dialog">
            <VectoriaIcon name="close" size={16} />
          </button>
        </div>

        <div className="trace-dialog-body">
          <div className="trace-preview-pane">
            <canvas ref={previewCanvasRef} className="trace-preview-canvas" />
            <div className="trace-status-bar">
              {isProcessing ? (
                <span>Tracing vector paths...</span>
              ) : (
                <span>Generated {tracedPaths.length} path(s) ({tracedPaths.reduce((acc, p) => acc + p.nodes.length, 0)} nodes)</span>
              )}
            </div>
          </div>

          <div className="trace-controls-pane">
            <div className="control-group">
              <label className="control-label">Tracing Preset</label>
              <div className="segmented-control">
                <button
                  className={`segment-btn ${mode === 'black-and-white' ? 'active' : ''}`}
                  onClick={() => setMode('black-and-white')}
                >
                  B&amp;W Silhouette
                </button>
                <button
                  className={`segment-btn ${mode === 'color' ? 'active' : ''}`}
                  onClick={() => setMode('color')}
                >
                  Color Logo
                </button>
              </div>
            </div>

            {mode === 'black-and-white' ? (
              <div className="control-group">
                <div className="control-label-row">
                  <label htmlFor="trace-threshold">Black Threshold</label>
                  <span>{threshold}</span>
                </div>
                <input
                  id="trace-threshold"
                  type="range"
                  min="10"
                  max="245"
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                />
              </div>
            ) : (
              <div className="control-group">
                <div className="control-label-row">
                  <label htmlFor="trace-colors">Color Regions</label>
                  <span>{colorCount} colors</span>
                </div>
                <input
                  id="trace-colors"
                  type="range"
                  min="2"
                  max="8"
                  value={colorCount}
                  onChange={(e) => setColorCount(Number(e.target.value))}
                />
              </div>
            )}

            <div className="control-group">
              <div className="control-label-row">
                <label htmlFor="trace-simplify">Path Smoothing / Simplify</label>
                <span>{simplifyTolerance.toFixed(1)}px</span>
              </div>
              <input
                id="trace-simplify"
                type="range"
                min="0.5"
                max="5.0"
                step="0.5"
                value={simplifyTolerance}
                onChange={(e) => setSimplifyTolerance(Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        <div className="trace-dialog-footer">
          <button className="button-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="button-primary"
            disabled={isProcessing || tracedPaths.length === 0}
            onClick={() => {
              onApply(tracedPaths);
              onClose();
            }}
          >
            Apply &amp; Replace Image
          </button>
        </div>
      </div>
    </div>
  );
};
