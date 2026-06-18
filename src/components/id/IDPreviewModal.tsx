/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef } from 'react'
import { jsPDF } from 'jspdf'
import '../tiling/TilingPreviewModal.css' // Reuse the same premium modal CSS layout
import { isNativeApp } from '../../utils/env'

interface IDPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  uploadedImage: string | null
  paperWidthMM: number
  paperHeightMM: number
  orientation: 'portrait' | 'landscape'
  idSize: '1x1' | '2x2' | 'passport'
  idSpacing: number
}

const ID_SIZES = {
  "1x1": { width: 25.4, height: 25.4, label: "1\" x 1\" (25.4 x 25.4 mm)" },
  "2x2": { width: 50.8, height: 50.8, label: "2\" x 2\" (50.8 x 50.8 mm)" },
  "passport": { width: 35.0, height: 45.0, label: "Passport (35 x 45 mm)" }
}

export const IDPreviewModal: React.FC<IDPreviewModalProps> = ({
  isOpen,
  onClose,
  uploadedImage,
  paperWidthMM,
  paperHeightMM,
  orientation,
  idSize,
  idSpacing
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [previewZoom, setPreviewZoom] = useState<number>(0.65)
  const [isExporting, setIsExporting] = useState<boolean>(false)
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null)

  // Sizing definitions
  const idDef = ID_SIZES[idSize]
  const idWidthMm = idDef.width
  const idHeightMm = idDef.height
  const safetyMarginMM = 5
  const spacingMm = idSpacing

  const cols = Math.max(0, Math.floor((paperWidthMM - 2 * safetyMarginMM + spacingMm) / (idWidthMm + spacingMm)))
  const rows = Math.max(0, Math.floor((paperHeightMM - 2 * safetyMarginMM + spacingMm) / (idHeightMm + spacingMm)))

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

    if (imageElement && cols > 0 && rows > 0) {
      // Strict physical dimensions conversion
      const totalGridWidth = (cols * idWidthMm) + ((cols - 1) * spacingMm);
      const totalGridHeight = (rows * idHeightMm) + ((rows - 1) * spacingMm);

      // Find leftover space and split it equally to get the margins
      const centerOffsetX = (paperWidthMM - totalGridWidth) / 2;
      const centerOffsetY = (paperHeightMM - totalGridHeight) / 2;

      const targetAspectRatio = idWidthMm / idHeightMm
      const imgAspectRatio = imageElement.width / imageElement.height
      let sx = 0
      let sy = 0
      let sWidth = imageElement.width
      let sHeight = imageElement.height

      if (imgAspectRatio > targetAspectRatio) {
        sWidth = imageElement.height * targetAspectRatio
        sx = (imageElement.width - sWidth) / 2
      } else if (imgAspectRatio < targetAspectRatio) {
        sHeight = imageElement.width / targetAspectRatio
        sy = (imageElement.height - sHeight) / 2
      }

      // Draw fitted ID pictures
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          // Ensure current loop item calculations strictly add the offsets:
          const finalX = centerOffsetX + (c * (idWidthMm + spacingMm));
          const finalY = centerOffsetY + (r * (idHeightMm + spacingMm));

          // Convert mm to active canvas pixels using our scale factor
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
    } else if (!imageElement) {
      ctx.fillStyle = '#94a3b8'
      ctx.font = `${8 * P}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('No image loaded', (paperWidthMM * P) / 2, (paperHeightMM * P) / 2)
    } else {
      ctx.fillStyle = '#ef4444'
      ctx.font = `${6 * P}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('Paper size too small', (paperWidthMM * P) / 2, (paperHeightMM * P) / 2)
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

    if (cols > 0 && rows > 0) {
      // Strict physical dimensions conversion
      const totalGridWidth = (cols * idWidthMm) + ((cols - 1) * spacingMm);
      const totalGridHeight = (rows * idHeightMm) + ((rows - 1) * spacingMm);

      // Find leftover space and split it equally to get the margins
      const centerOffsetX = (paperWidthMM - totalGridWidth) / 2;
      const centerOffsetY = (paperHeightMM - totalGridHeight) / 2;

      const targetAspectRatio = idWidthMm / idHeightMm
      const imgAspectRatio = img.width / img.height
      let sx = 0
      let sy = 0
      let sWidth = img.width
      let sHeight = img.height

      if (imgAspectRatio > targetAspectRatio) {
        sWidth = img.height * targetAspectRatio
        sx = (img.width - sWidth) / 2
      } else if (imgAspectRatio < targetAspectRatio) {
        sHeight = img.width / targetAspectRatio
        sy = (img.height - sHeight) / 2
      }

      // Draw repeating ID photos
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          // Ensure current loop item calculations strictly add the offsets:
          const finalX = centerOffsetX + (c * (idWidthMm + spacingMm));
          const finalY = centerOffsetY + (r * (idHeightMm + spacingMm));

          // Convert mm to active canvas pixels using our global scale factor (ratio300)
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
        const pdfBase64 = pdf.output('datauristring')
        if ((window as any).ipcRenderer && typeof (window as any).ipcRenderer.send === 'function') {
          (window as any).ipcRenderer.send('trigger-print', pdfBase64)
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
              className="preview-page-card"
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
                  max="1.2"
                  step="0.05"
                  value={previewZoom}
                  onChange={(e) => setPreviewZoom(parseFloat(e.target.value))}
                />
                <span className="value-badge">{Math.round(previewZoom * 100)}%</span>
              </div>
            </div>

            <div className="footer-control-item">
              <span className="value-badge" style={{ padding: '4px 10px', height: 'auto' }}>
                Layout Format: {idDef.label}
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
