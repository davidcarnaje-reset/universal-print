/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
import React, { useEffect, useRef, useMemo } from 'react'
import { Canvas, FabricImage, Rect, FabricText, Group } from 'fabric'
import { IDPreviewModal } from './IDPreviewModal'
import { isNativeApp } from '../../utils/env'
import {
  ID_SIZES,
  IdSizeKey,
  MixedQuantities,
  PlacedItem,
  calculateCustomMixLayout,
  calculatePackage3x3Layout
} from '../../utils/idSizes'

interface IDWorkspaceProps {
  paperWidthMM: number
  paperHeightMM: number
  orientation: 'portrait' | 'landscape'
  zoom: number
  setZoom: (zoom: number | ((prev: number) => number)) => void
  uploadedImage: string | null
  idSize: IdSizeKey
  idSpacing: number
  isPreviewOpen: boolean
  setIsPreviewOpen: (open: boolean) => void
  mixedQuantities: MixedQuantities
}

export const IDWorkspace: React.FC<IDWorkspaceProps> = ({
  paperWidthMM,
  paperHeightMM,
  orientation,
  zoom,
  setZoom,
  uploadedImage,
  idSize,
  idSpacing,
  isPreviewOpen,
  setIsPreviewOpen,
  mixedQuantities
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const fabricCanvasRef = useRef<Canvas | null>(null)

  const CANVAS_SCALE = 2.0
  const cellW = paperWidthMM * CANVAS_SCALE
  const cellH = paperHeightMM * CANVAS_SCALE

  const canvasWidth = cellW
  const canvasHeight = cellH

  const safetyMarginMM = 5
  const spacingMm = idSpacing

  // Determine if this is a standard single-size mode or a multi-size mode
  const isStandardMode = idSize !== 'package_3x3' && idSize !== 'custom_mix'

  // Standard mode sizing
  const idDef = ID_SIZES[idSize]
  const idWidthMm = isStandardMode ? idDef.width : 0
  const idHeightMm = isStandardMode ? idDef.height : 0

  const cols = isStandardMode
    ? Math.max(0, Math.floor((paperWidthMM - 2 * safetyMarginMM + spacingMm) / (idWidthMm + spacingMm)))
    : 0
  const rows = isStandardMode
    ? Math.max(0, Math.floor((paperHeightMM - 2 * safetyMarginMM + spacingMm) / (idHeightMm + spacingMm)))
    : 0
  const totalFitCount = isStandardMode ? cols * rows : 0

  // Multi-size layout placement
  const placedItems: PlacedItem[] = useMemo(() => {
    if (idSize === 'package_3x3') {
      return calculatePackage3x3Layout(paperWidthMM, paperHeightMM, safetyMarginMM, spacingMm)
    }
    if (idSize === 'custom_mix') {
      return calculateCustomMixLayout(paperWidthMM, paperHeightMM, safetyMarginMM, mixedQuantities, spacingMm)
    }
    return []
  }, [idSize, paperWidthMM, paperHeightMM, safetyMarginMM, spacingMm, mixedQuantities])

  // Pixel definitions for canvas elements
  const marginPx = safetyMarginMM * CANVAS_SCALE
  const spacingPx = spacingMm * CANVAS_SCALE
  const idWidthPx = idWidthMm * CANVAS_SCALE
  const idHeightPx = idHeightMm * CANVAS_SCALE

  const usableW = cellW - (2 * marginPx)
  const usableH = cellH - (2 * marginPx)

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
  }, [paperWidthMM, paperHeightMM])

  // Unified Rendering useEffect Hook
  useEffect(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    canvas.clear()
    canvas.backgroundColor = '#ffffff'
    if (typeof (canvas as any).invalidateState === 'function') {
      (canvas as any).invalidateState()
    }

    // Add Margins Dashed Rect
    const marginRect = new Rect({
      left: marginPx,
      top: marginPx,
      width: usableW,
      height: usableH,
      fill: 'transparent',
      stroke: '#cbd5e1',
      strokeWidth: 1,
      strokeDashArray: [4, 4],
      selectable: false,
      evented: false
    })
    canvas.add(marginRect)

    if (!uploadedImage) {
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
      canvas.requestRenderAll()
      return
    }

    if (isStandardMode) {
      // --- STANDARD SINGLE-SIZE MODE ---
      if (cols === 0 || rows === 0) {
        const errorText = new FabricText('Paper size too small for selected ID size.', {
          left: canvasWidth / 2,
          top: canvasHeight / 2,
          originX: 'center',
          originY: 'center',
          fontSize: 12,
          fill: '#ef4444',
          fontFamily: 'sans-serif',
          selectable: false,
          evented: false
        })
        canvas.add(errorText)
        canvas.requestRenderAll()
        return
      }

      // Strict physical dimensions conversion
      const totalGridWidth = (cols * idWidthMm) + ((cols - 1) * spacingMm);
      const totalGridHeight = (rows * idHeightMm) + ((rows - 1) * spacingMm);

      // Find leftover space and split it equally to get the margins
      const centerOffsetX = (paperWidthMM - totalGridWidth) / 2;
      const centerOffsetY = (paperHeightMM - totalGridHeight) / 2;

      // Clear old grid objects from Fabric canvas
      const existingPhotos = canvas.getObjects().filter((obj: any) => obj.id === 'id-photo-item');
      canvas.remove(...existingPhotos);

      // Render the centered grid loop using Group containment
      FabricImage.fromURL(uploadedImage).then((oImg) => {
        const imgElement = oImg.getElement() as HTMLImageElement
        const targetAspectRatio = idWidthMm / idHeightMm
        const imgAspectRatio = imgElement.width / imgElement.height
        let sx = 0
        let sy = 0
        let sWidth = imgElement.width
        let sHeight = imgElement.height

        if (imgAspectRatio > targetAspectRatio) {
          sWidth = imgElement.height * targetAspectRatio
          sx = (imgElement.width - sWidth) / 2
        } else if (imgAspectRatio < targetAspectRatio) {
          sHeight = imgElement.width / targetAspectRatio
          sy = (imgElement.height - sHeight) / 2
        }

        const idObjectsArray: any[] = [];

        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            // Ensure current loop item calculations strictly add the offsets:
            const finalX = centerOffsetX + (c * (idWidthMm + spacingMm));
            const finalY = centerOffsetY + (r * (idHeightMm + spacingMm));

            // Convert mm to active canvas pixels using our global scale factor (CANVAS_SCALE)
            const pxX = finalX * CANVAS_SCALE;
            const pxY = finalY * CANVAS_SCALE;
            const pxW = idWidthMm * CANVAS_SCALE;
            const pxH = idHeightMm * CANVAS_SCALE;

            const idImg = new FabricImage(imgElement, {
              left: pxX,
              top: pxY,
              width: sWidth,
              height: sHeight,
              cropX: sx,
              cropY: sy,
              scaleX: pxW / sWidth,
              scaleY: pxH / sHeight,
              selectable: false,
              evented: false,
              stroke: '#cccccc',
              strokeWidth: 1
            })
            idObjectsArray.push(idImg)
          }
        }

        // Wrap all individual items into a single non-interactable strict structural set
        const finalCenteredGroup = new Group(idObjectsArray, {
          id: 'id-photo-item',
          selectable: false,
          evented: false,
          subTargetCheck: false
        } as any);

        // 1. FORCE FABRIC CORE CENTER CALCULATIONS
        canvas.centerObject(finalCenteredGroup);

        // 2. Clear native coordinate origin drift overrides
        finalCenteredGroup.setCoords();

        // 3. Render directly onto the screen context
        canvas.add(finalCenteredGroup);
        canvas.requestRenderAll();
      }).catch((err) => {
        console.error('Failed to draw centered ID pictures in Fabric Group:', err)
      })
    } else {
      // --- MULTI-SIZE MODE (package_3x3 or custom_mix) ---
      if (placedItems.length === 0) {
        const errorText = new FabricText('No items fit on the current paper size.', {
          left: canvasWidth / 2,
          top: canvasHeight / 2,
          originX: 'center',
          originY: 'center',
          fontSize: 12,
          fill: '#ef4444',
          fontFamily: 'sans-serif',
          selectable: false,
          evented: false
        })
        canvas.add(errorText)
        canvas.requestRenderAll()
        return
      }

      // Clear old grid objects
      const existingPhotos = canvas.getObjects().filter((obj: any) => obj.id === 'id-photo-item');
      canvas.remove(...existingPhotos);

      FabricImage.fromURL(uploadedImage).then((oImg) => {
        const imgElement = oImg.getElement() as HTMLImageElement
        const idObjectsArray: any[] = [];

        for (const item of placedItems) {
          const targetAR = item.w / item.h
          const imgAR = imgElement.width / imgElement.height
          let sx = 0
          let sy = 0
          let sWidth = imgElement.width
          let sHeight = imgElement.height

          if (imgAR > targetAR) {
            sWidth = imgElement.height * targetAR
            sx = (imgElement.width - sWidth) / 2
          } else if (imgAR < targetAR) {
            sHeight = imgElement.width / targetAR
            sy = (imgElement.height - sHeight) / 2
          }

          const pxX = item.x * CANVAS_SCALE
          const pxY = item.y * CANVAS_SCALE
          const pxW = item.w * CANVAS_SCALE
          const pxH = item.h * CANVAS_SCALE

          const idImg = new FabricImage(imgElement, {
            left: pxX,
            top: pxY,
            width: sWidth,
            height: sHeight,
            cropX: sx,
            cropY: sy,
            scaleX: pxW / sWidth,
            scaleY: pxH / sHeight,
            selectable: false,
            evented: false,
            stroke: '#cccccc',
            strokeWidth: 1
          })
          idObjectsArray.push(idImg)
        }

        const mixedGroup = new Group(idObjectsArray, {
          id: 'id-photo-item',
          selectable: false,
          evented: false,
          subTargetCheck: false
        } as any);

        canvas.add(mixedGroup);
        canvas.requestRenderAll();
      }).catch((err) => {
        console.error('Failed to draw mixed ID pictures:', err)
      })
    }
  }, [
    uploadedImage,
    canvasWidth,
    canvasHeight,
    cellW,
    cellH,
    idSize,
    idSpacing,
    cols,
    rows,
    idWidthPx,
    idHeightPx,
    spacingPx,
    marginPx,
    usableW,
    usableH,
    paperWidthMM,
    paperHeightMM,
    idWidthMm,
    idHeightMm,
    spacingMm,
    placedItems,
    isStandardMode,
    fabricCanvasRef.current
  ])

  // Display label for stats bar
  const displayLabel = isStandardMode
    ? `${idDef.width} × ${idDef.height} mm`
    : idSize === 'package_3x3'
      ? '3×3 Combo'
      : 'Custom Mix'

  const displayCount = isStandardMode ? totalFitCount : placedItems.length

  return (
    <main className="workspace">
      <header className="workspace-header">
        <div className="workspace-title-area">
          <h2>Layout Canvas (ID Picture Mode)</h2>
          <p className="workspace-subtitle">
            Auto-fitted layout grid inside paper margin boundaries
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
                <span className="stat-label">ID Size:</span>
                <span className="stat-value">{displayLabel}</span>
              </div>
              <div className="stat-pill">
                <span className="stat-label">Photos Fitted:</span>
                <span className="stat-value">{displayCount}</span>
              </div>
            </div>
          )}
          
          {(!isNativeApp || uploadedImage) && (
            <div className="workspace-actions">
              {!isNativeApp && (
                <a 
                  href="https://github.com/davidjosh/printflow/releases" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="action-btn btn-pdf"
                  style={{ textDecoration: 'none', gap: '0.35rem' }}
                >
                  📥 Download App
                </a>
              )}
              {uploadedImage && (
                <button 
                  onClick={() => setIsPreviewOpen(true)} 
                  className="action-btn btn-print"
                >
                  Preview Sheet
                </button>
              )}
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

      <IDPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        uploadedImage={uploadedImage}
        paperWidthMM={paperWidthMM}
        paperHeightMM={paperHeightMM}
        orientation={orientation}
        idSize={idSize}
        idSpacing={idSpacing}
        mixedQuantities={mixedQuantities}
      />
    </main>
  )
}
