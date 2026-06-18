/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
import React, { useEffect, useRef, useCallback } from 'react'
import { Canvas, FabricImage, Line, FabricText } from 'fabric'
import { TilingPreviewModal } from './TilingPreviewModal'

interface TilingWorkspaceProps {
  paperWidthMM: number
  paperHeightMM: number
  orientation: 'portrait' | 'landscape'
  zoom: number
  setZoom: (zoom: number | ((prev: number) => number)) => void
  uploadedImage: string | null
  tilingRows: number
  tilingCols: number
  isPreviewOpen: boolean
  setIsPreviewOpen: (open: boolean) => void
}

export const TilingWorkspace: React.FC<TilingWorkspaceProps> = ({
  paperWidthMM,
  paperHeightMM,
  orientation,
  zoom,
  setZoom,
  uploadedImage,
  tilingRows,
  tilingCols,
  isPreviewOpen,
  setIsPreviewOpen
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const fabricCanvasRef = useRef<Canvas | null>(null)
  
  const fabricImageRef = useRef<FabricImage | null>(null)
  const lastLoadedSrcRef = useRef<string | null>(null)
  const lastCanvasRef = useRef<Canvas | null>(null)

  const CANVAS_SCALE = 2.0
  const cellW = paperWidthMM * CANVAS_SCALE
  const cellH = paperHeightMM * CANVAS_SCALE

  const canvasWidth = tilingCols * cellW
  const canvasHeight = tilingRows * cellH

  const drawGridOverlay = useCallback((fc: Canvas) => {
    // 1. Remove old guide elements to prevent duplicates on re-render
    const oldGuides = fc.getObjects().filter((obj: any) => obj.id === 'guide-element')
    if (oldGuides.length > 0) {
      fc.remove(...oldGuides)
    }

    const gridStrokeColor = '#3b82f6'
    const gridLineWidth = 2

    // Solid blue grid dividers (columns)
    for (let c = 1; c < tilingCols; c++) {
      const x = c * cellW
      fc.add(new Line([x, 0, x, canvasHeight], {
        stroke: gridStrokeColor,
        strokeWidth: gridLineWidth,
        selectable: false,
        evented: false,
        id: 'guide-element'
      } as any))
    }

    // Solid blue grid dividers (rows)
    for (let r = 1; r < tilingRows; r++) {
      const y = r * cellH
      fc.add(new Line([0, y, canvasWidth, y], {
        stroke: gridStrokeColor,
        strokeWidth: gridLineWidth,
        selectable: false,
        evented: false,
        id: 'guide-element'
      } as any))
    }

    fc.requestRenderAll()
  }, [tilingRows, tilingCols, canvasWidth, canvasHeight, cellW, cellH])

  // Initialize Fabric.js Canvas
  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = new Canvas(canvasRef.current, {
      width: canvasWidth,
      height: canvasHeight,
      backgroundColor: '#ffffff',
      selection: false,
      preserveObjectStacking: true
    })

    fabricCanvasRef.current = canvas

    return () => {
      canvas.dispose()
      fabricCanvasRef.current = null
    }
  }, [paperWidthMM, paperHeightMM, tilingRows, tilingCols])

  // Unified Rendering useEffect Hook
  useEffect(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    const canvasChanged = lastCanvasRef.current !== canvas
    lastCanvasRef.current = canvas

    // Clear all objects from the canvas (keeping the background)
    canvas.clear()
    canvas.backgroundColor = '#ffffff'
    if (typeof (canvas as any).invalidateState === 'function') {
      (canvas as any).invalidateState()
    }

    if (uploadedImage) {
      const runDraw = (img: FabricImage) => {
        canvas.add(img)
        drawGridOverlay(canvas)
        canvas.setActiveObject(img)
        canvas.requestRenderAll()
      }

      const existingImg = fabricImageRef.current
      const shouldReuse = existingImg && lastLoadedSrcRef.current === uploadedImage && !canvasChanged

      if (shouldReuse) {
        runDraw(existingImg)
      } else {
        FabricImage.fromURL(uploadedImage).then((img) => {
          canvas.clear()
          canvas.backgroundColor = '#ffffff'
          if (typeof (canvas as any).invalidateState === 'function') {
            (canvas as any).invalidateState()
          }

          img.scaleToWidth(canvas.getWidth() * 0.6)
          img.set({
            left: canvas.getWidth() / 2,
            top: canvas.getHeight() / 2,
            originX: 'center',
            originY: 'center',
            selectable: true,
            hasRotatingPoint: true,
            cornerColor: '#6366f1',
            cornerStrokeColor: '#ffffff',
            borderColor: '#6366f1',
            transparentCorners: false,
            cornerSize: 8
          })

          img.setCoords()
          fabricImageRef.current = img
          lastLoadedSrcRef.current = uploadedImage
          runDraw(img)
        }).catch((err) => {
          console.error('Failed to load image in Fabric Tiling:', err)
        })
      }
    } else {
      fabricImageRef.current = null
      lastLoadedSrcRef.current = null
      const text = new FabricText('Canvas ready. Upload an image to preview.', {
        left: canvas.getWidth() / 2,
        top: canvas.getHeight() / 2,
        originX: 'center',
        originY: 'center',
        fontSize: 14,
        fill: '#94a3b8',
        fontFamily: 'sans-serif',
        selectable: false,
        evented: false
      })
      canvas.add(text)
      drawGridOverlay(canvas)
      canvas.requestRenderAll()
    }
  }, [
    uploadedImage,
    tilingRows,
    tilingCols,
    canvasWidth,
    canvasHeight,
    cellW,
    cellH,
    drawGridOverlay,
    fabricCanvasRef.current
  ])

  // Retrieve image transforms from fabric canvas
  const getImageTransform = () => {
    if (!fabricImageRef.current) {
      return {
        left: canvasWidth / 2,
        top: canvasHeight / 2,
        scaleX: 1,
        scaleY: 1,
        angle: 0
      }
    }
    const center = fabricImageRef.current.getCenterPoint()
    return {
      left: center.x,
      top: center.y,
      scaleX: fabricImageRef.current.scaleX || 1,
      scaleY: fabricImageRef.current.scaleY || 1,
      angle: fabricImageRef.current.angle || 0
    }
  }

  return (
    <main className="workspace">
      <header className="workspace-header">
        <div className="workspace-title-area">
          <h2>Layout Canvas (Tiling Mode)</h2>
          <p className="workspace-subtitle">
            Visual grid overlay of the print pages with overlap margins (Drag/Scale/Rotate image below grid)
          </p>
        </div>
        <div className="workspace-controls-header">
          {uploadedImage && (
            <div className="canvas-stats">
              <div className="stat-pill">
                <span className="stat-label">Paper:</span>
                <span className="stat-value">{paperWidthMM} × {paperHeightMM} mm</span>
              </div>
              <div className="stat-pill">
                <span className="stat-label">Grid:</span>
                <span className="stat-value">{tilingRows} × {tilingCols}</span>
              </div>
              <div className="stat-pill">
                <span className="stat-label">Tiles:</span>
                <span className="stat-value">{tilingRows * tilingCols}</span>
              </div>
            </div>
          )}
          
          {uploadedImage && (
            <div className="workspace-actions">
              <button 
                onClick={() => setIsPreviewOpen(true)} 
                className="action-btn btn-print"
              >
                Preview Poster
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="editor-canvas-container">
        <div className="canvas-scroll-viewport" style={{ width: (canvasWidth + 48) * zoom, height: (canvasHeight + 48) * zoom, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="canvas-wrapper-card" style={{ transform: `scale(${zoom})`, transformOrigin: 'center center', transition: 'transform 0.1s ease-out' }}>
            <canvas ref={canvasRef} />
          </div>
        </div>
        
        {/* Zoom controls floating */}
        <div className="zoom-controls-floating">
          <button 
            onClick={() => setZoom(z => Math.max(0.25, typeof z === 'function' ? (z as any)(zoom) : z - 0.1))} 
            className="zoom-btn" 
            title="Zoom Out"
            type="button"
          >
            -
          </button>
          <span className="zoom-label">{Math.round(zoom * 100)}%</span>
          <button 
            onClick={() => setZoom(z => Math.min(2.0, typeof z === 'function' ? (z as any)(zoom) : z + 0.1))} 
            className="zoom-btn" 
            title="Zoom In"
            type="button"
          >
            +
          </button>
          <button 
            onClick={() => setZoom(1.0)} 
            className="zoom-btn-reset" 
            title="Reset Zoom"
            type="button"
          >
            Reset
          </button>
        </div>
      </div>

      <TilingPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        uploadedImage={uploadedImage}
        tilingRows={tilingRows}
        tilingCols={tilingCols}
        paperWidthMM={paperWidthMM}
        paperHeightMM={paperHeightMM}
        orientation={orientation === 'landscape' ? 'landscape' : 'portrait'}
        imageTransform={getImageTransform()}
        canvasWidth={canvasWidth}
        canvasHeight={canvasHeight}
      />
    </main>
  )
}
