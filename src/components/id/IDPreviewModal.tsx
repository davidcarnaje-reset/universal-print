/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef, useMemo } from 'react'
import { jsPDF } from 'jspdf'
import '../tiling/TilingPreviewModal.css' // Reuse the same premium modal CSS layout
import { isNativeApp } from '../../utils/env'
import {
  ID_SIZES,
  IdSizeKey,
  MixedQuantities,
  PlacedItem,
  calculateCustomMixLayout,
  calculatePackage3x3Layout
} from '../../utils/idSizes'

interface IDPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  uploadedImage: string | null
  paperWidthMM: number
  paperHeightMM: number
  orientation: 'portrait' | 'landscape'
  idSize: IdSizeKey
  idSpacing: number
  mixedQuantities: MixedQuantities
}

export const IDPreviewModal: React.FC<IDPreviewModalProps> = ({
  isOpen,
  onClose,
  uploadedImage,
  paperWidthMM,
  paperHeightMM,
  orientation,
  idSize,
  idSpacing,
  mixedQuantities
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [previewZoom, setPreviewZoom] = useState<number>(0.65)
  const [isExporting, setIsExporting] = useState<boolean>(false)
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null)

  // Sizing definitions
  const isStandardMode = idSize !== 'package_3x3' && idSize !== 'custom_mix'
  const idDef = ID_SIZES[idSize]
  const idWidthMm = isStandardMode ? idDef.width : 0
  const idHeightMm = isStandardMode ? idDef.height : 0
  const safetyMarginMM = 5
  const spacingMm = idSpacing

  const cols = isStandardMode
    ? Math.max(0, Math.floor((paperWidthMM - 2 * safetyMarginMM + spacingMm) / (idWidthMm + spacingMm)))
    : 0
  const rows = isStandardMode
    ? Math.max(0, Math.floor((paperHeightMM - 2 * safetyMarginMM + spacingMm) / (idHeightMm + spacingMm)))
    : 0

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

  // Canvas drawing scale (constant for crisp rendering)
  const P = 2.0

  // Load image element
  useEffect(() => {
    if (!uploadedImage) {
      setImageElement(null)
      return
    }

    const img = new Image()
    img.onload = () => setImageElement(img)
    img.onerror = (err) => console.error('Failed to load image in IDPreviewModal:', err)
    img.src = uploadedImage
  }, [uploadedImage])

  // Helper: crop source region to match target aspect ratio
  const getCropRegion = (imgW: number, imgH: number, targetW: number, targetH: number) => {
    const targetAR = targetW / targetH
    const imgAR = imgW / imgH
    let sx = 0, sy = 0, sWidth = imgW, sHeight = imgH

    if (imgAR > targetAR) {
      sWidth = imgH * targetAR
      sx = (imgW - sWidth) / 2
    } else if (imgAR < targetAR) {
      sHeight = imgW / targetAR
      sy = (imgH - sHeight) / 2
    }
    return { sx, sy, sWidth, sHeight }
  }

  // Canvas drawing effect
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear and draw white background
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, paperWidthMM * P, paperHeightMM * P)

    const marginPx = safetyMarginMM * P

    const usableW = (paperWidthMM - 2 * safetyMarginMM) * P
    const usableH = (paperHeightMM - 2 * safetyMarginMM) * P

    // Draw safety margins dashed rect
    ctx.strokeStyle = '#cbd5e1'
    ctx.lineWidth = 0.5 * P
    ctx.setLineDash([2 * P, 2 * P])
    ctx.strokeRect(marginPx, marginPx, usableW, usableH)
    ctx.setLineDash([]) // Reset

    if (!imageElement) {
      ctx.fillStyle = '#94a3b8'
      ctx.font = `${8 * P}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('No image loaded', (paperWidthMM * P) / 2, (paperHeightMM * P) / 2)
    } else if (isStandardMode) {
      // --- STANDARD SINGLE-SIZE RENDERING ---
      if (cols > 0 && rows > 0) {
        const totalGridWidth = (cols * idWidthMm) + ((cols - 1) * spacingMm);
        const totalGridHeight = (rows * idHeightMm) + ((rows - 1) * spacingMm);
        const centerOffsetX = (paperWidthMM - totalGridWidth) / 2;
        const centerOffsetY = (paperHeightMM - totalGridHeight) / 2;

        const { sx, sy, sWidth, sHeight } = getCropRegion(imageElement.width, imageElement.height, idWidthMm, idHeightMm)

        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const finalX = centerOffsetX + (c * (idWidthMm + spacingMm));
            const finalY = centerOffsetY + (r * (idHeightMm + spacingMm));

            const pxX = finalX * P;
            const pxY = finalY * P;
            const pxW = idWidthMm * P;
            const pxH = idHeightMm * P;

            ctx.drawImage(imageElement, sx, sy, sWidth, sHeight, pxX, pxY, pxW, pxH)

            // Thin cutting border
            ctx.strokeStyle = '#cccccc'
            ctx.lineWidth = 0.5 * P
            ctx.strokeRect(pxX, pxY, pxW, pxH)
          }
        }
      } else {
        ctx.fillStyle = '#ef4444'
        ctx.font = `${6 * P}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('Paper size too small', (paperWidthMM * P) / 2, (paperHeightMM * P) / 2)
      }
    } else {
      // --- MULTI-SIZE RENDERING (package_3x3 or custom_mix) ---
      if (placedItems.length > 0) {
        for (const item of placedItems) {
          const { sx, sy, sWidth, sHeight } = getCropRegion(imageElement.width, imageElement.height, item.w, item.h)

          const pxX = item.x * P
          const pxY = item.y * P
          const pxW = item.w * P
          const pxH = item.h * P

          ctx.drawImage(imageElement, sx, sy, sWidth, sHeight, pxX, pxY, pxW, pxH)

          // Thin cutting border
          ctx.strokeStyle = '#cccccc'
          ctx.lineWidth = 0.5 * P
          ctx.strokeRect(pxX, pxY, pxW, pxH)

          // Size label inside each item
          ctx.save()
          ctx.fillStyle = 'rgba(0, 0, 0, 0.35)'
          ctx.font = `bold ${Math.max(5, Math.min(8, pxW * 0.06)) * P}px sans-serif`
          ctx.textAlign = 'right'
          ctx.textBaseline = 'bottom'
          ctx.fillText(item.sizeLabel, pxX + pxW - 2 * P, pxY + pxH - 2 * P)
          ctx.restore()
        }
      } else {
        ctx.fillStyle = '#ef4444'
        ctx.font = `${6 * P}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('No items fit on this paper', (paperWidthMM * P) / 2, (paperHeightMM * P) / 2)
      }
    }
  }, [
    paperWidthMM,
    paperHeightMM,
    imageElement,
    idSize,
    idSpacing,
    cols,
    rows,
    idWidthMm,
    idHeightMm,
    spacingMm,
    placedItems,
    isStandardMode,
    P
  ])

  if (!isOpen) return null

  // PDF High Res Compile Engine
  const generateHighResPDF = async (): Promise<jsPDF | null> => {
    if (!uploadedImage) return null

    const ratio300 = 11.811
    const pdfWidthPx = Math.round(paperWidthMM * ratio300)
    const pdfHeightPx = Math.round(paperHeightMM * ratio300)

    const pdf = new jsPDF({
      orientation: orientation,
      unit: 'mm',
      format: [paperWidthMM, paperHeightMM]
    })

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const tempImg = new Image()
      tempImg.onload = () => resolve(tempImg)
      tempImg.onerror = (err) => reject(err)
      tempImg.src = uploadedImage
    })

    const canvas = document.createElement('canvas')
    canvas.width = pdfWidthPx
    canvas.height = pdfHeightPx
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    // Background white
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, pdfWidthPx, pdfHeightPx)

    if (isStandardMode) {
      // --- STANDARD MODE PDF ---
      if (cols > 0 && rows > 0) {
        const totalGridWidth = (cols * idWidthMm) + ((cols - 1) * spacingMm);
        const totalGridHeight = (rows * idHeightMm) + ((rows - 1) * spacingMm);
        const centerOffsetX = (paperWidthMM - totalGridWidth) / 2;
        const centerOffsetY = (paperHeightMM - totalGridHeight) / 2;

        const { sx, sy, sWidth, sHeight } = getCropRegion(img.width, img.height, idWidthMm, idHeightMm)

        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const finalX = centerOffsetX + (c * (idWidthMm + spacingMm));
            const finalY = centerOffsetY + (r * (idHeightMm + spacingMm));

            const pxX = finalX * ratio300;
            const pxY = finalY * ratio300;
            const pxW = idWidthMm * ratio300;
            const pxH = idHeightMm * ratio300;

            ctx.drawImage(img, sx, sy, sWidth, sHeight, pxX, pxY, pxW, pxH)

            // Light gray border
            ctx.strokeStyle = '#cccccc'
            ctx.lineWidth = 1
            ctx.strokeRect(pxX, pxY, pxW, pxH)
          }
        }
      }
    } else {
      // --- MULTI-SIZE MODE PDF ---
      for (const item of placedItems) {
        const { sx, sy, sWidth, sHeight } = getCropRegion(img.width, img.height, item.w, item.h)

        const pxX = item.x * ratio300
        const pxY = item.y * ratio300
        const pxW = item.w * ratio300
        const pxH = item.h * ratio300

        ctx.drawImage(img, sx, sy, sWidth, sHeight, pxX, pxY, pxW, pxH)

        // Light gray border
        ctx.strokeStyle = '#cccccc'
        ctx.lineWidth = 1
        ctx.strokeRect(pxX, pxY, pxW, pxH)
      }
    }

    const pageDataUrl = canvas.toDataURL('image/jpeg', 0.95)
    pdf.addImage(pageDataUrl, 'JPEG', 0, 0, paperWidthMM, paperHeightMM, undefined, 'FAST')

    return pdf
  }

  const handleSavePDF = async () => {
    setIsExporting(true)
    try {
      const pdf = await generateHighResPDF()
      if (pdf) {
        pdf.save('id-photo-sheet.pdf')
      }
    } catch (err) {
      console.error('Error compiling ID PDF:', err)
    } finally {
      setIsExporting(false)
    }
  }

  const handlePrintNow = async () => {
    setIsExporting(true)
    try {
      const pdf = await generateHighResPDF()
      if (pdf) {
        const dataUriString = pdf.output('datauristring')
        const base64String = dataUriString.split(',')[1]

        const ipc = (window as any).electron?.ipcRenderer || (window as any).ipcRenderer
        if (ipc && typeof ipc.send === 'function') {
          ipc.send('spool-cached-pdf-print', base64String)
        } else {
          alert('System printing is only available inside the desktop application. Please use "Save as PDF" instead.')
        }
      }
    } catch (err) {
      console.error('Error triggering print:', err)
    } finally {
      setIsExporting(false)
    }
  }

  // Display label
  const displayLabel = isStandardMode
    ? idDef.label
    : idSize === 'package_3x3'
      ? '3×3 Combo Package'
      : 'Custom Mixed Sizes'

  return (
    <div className="preview-modal-overlay">
      <div className="preview-modal-container" style={{ maxWidth: '800px' }}>
        
        {/* Modal Header */}
        <header className="preview-modal-header">
          <div className="header-info">
            <h2>ID Picture Print Preview</h2>
            <p>Review page layout margins before exporting</p>
          </div>
          <button className="close-modal-btn" onClick={onClose} aria-label="Close Preview">
            ✕
          </button>
        </header>

        {/* Modal Body - Canvas Sheet */}
        <div className="preview-modal-body">
          <div className="preview-matrix-scroll-container">
            <div 
              className="preview-page-card print-page-tile-wrapper"
              style={{
                width: `${paperWidthMM * previewZoom}px`,
                height: `${paperHeightMM * previewZoom}px`
              }}
            >
              <canvas
                ref={canvasRef}
                width={paperWidthMM * P}
                height={paperHeightMM * P}
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'block'
                }}
              />
            </div>
          </div>
        </div>

        {/* Configurations Bar */}
        <footer className="preview-modal-footer">
          <div className="footer-controls">
            {/* Zoom slider */}
            <div className="footer-control-item footer-zoom">
              <label htmlFor="modal-zoom">Preview Size</label>
              <div className="slider-wrapper">
                <input
                  type="range"
                  id="modal-zoom"
                  min="0.3"
                  max="1.5"
                  step="0.05"
                  value={previewZoom}
                  onChange={(e) => setPreviewZoom(parseFloat(e.target.value))}
                />
                <span className="value-badge">{Math.round(previewZoom * 100)}%</span>
              </div>
            </div>

            <div className="footer-control-item">
              <span className="value-badge" style={{ padding: '4px 10px', height: 'auto' }}>
                Layout: {displayLabel}
              </span>
            </div>
          </div>

          {/* Action Export Buttons */}
          <div className="footer-actions">
            {isNativeApp ? (
              <>
                <button 
                  className="preview-action-btn secondary" 
                  onClick={handleSavePDF}
                  disabled={isExporting || !uploadedImage}
                >
                  {isExporting ? 'Exporting...' : 'Save as PDF'}
                </button>
                <button 
                  className="preview-action-btn primary" 
                  onClick={handlePrintNow}
                  disabled={isExporting || !uploadedImage}
                >
                  {isExporting ? 'Exporting...' : 'Print Now'}
                </button>
              </>
            ) : (
              <button 
                className="preview-action-btn primary" 
                onClick={handleSavePDF}
                disabled={isExporting || !uploadedImage}
              >
                {isExporting ? 'Exporting...' : 'Save as PDF'}
              </button>
            )}
          </div>
        </footer>

      </div>
    </div>
  )
}
