/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react'
import { jsPDF } from 'jspdf'
import '../tiling/TilingPreviewModal.css' // Reuse the same premium modal CSS layout

interface IDPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  uploadedImage: string | null
  paperWidthMM: number
  paperHeightMM: number
  orientation: 'portrait' | 'landscape'
  idSize: '1x1' | '2x2' | '3x3' | 'passport' | 'custom'
  idSpacing: number
  previewImage: string | null
  customCopies: Record<'1x1' | '2x2' | '3x3', number>
}

const ID_SIZES = {
  "1x1": { width: 25.4, height: 25.4, label: "1\" x 1\" (25.4 x 25.4 mm)" },
  "2x2": { width: 50.8, height: 50.8, label: "2\" x 2\" (50.8 x 50.8 mm)" },
  "3x3": { width: 76.2, height: 76.2, label: "3\" x 3\" (76.2 x 76.2 mm) (Visa)" },
  "passport": { width: 35.0, height: 45.0, label: "Passport (35 x 45 mm)" },
  "custom": { width: 0, height: 0, label: "Custom (Mixed Layout)" }
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
  previewImage,
  customCopies
}) => {
  const [previewZoom, setPreviewZoom] = useState<number>(0.65)
  const [isExporting, setIsExporting] = useState<boolean>(false)

  // Sizing definitions
  const idDef = ID_SIZES[idSize] || ID_SIZES["2x2"]
  const idWidthMm = idDef.width
  const idHeightMm = idDef.height
  const safetyMarginMM = 5
  const spacingMm = idSpacing

  const isCustomMode = idSize === 'custom'

  const cols = isCustomMode ? 0 : Math.max(0, Math.floor((paperWidthMM - 2 * safetyMarginMM + spacingMm) / (idWidthMm + spacingMm)))
  const rows = isCustomMode ? 0 : Math.max(0, Math.floor((paperHeightMM - 2 * safetyMarginMM + spacingMm) / (idHeightMm + spacingMm)))

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

    if (isCustomMode) {
      const copies1x1 = customCopies['1x1'] || 0
      const copies2x2 = customCopies['2x2'] || 0
      const copies3x3 = customCopies['3x3'] || 0

      interface MixedIDItem {
        width: number;
        height: number;
        type: string;
      }
      const itemsToRender: MixedIDItem[] = []

      for (let i = 0; i < copies3x3; i++) itemsToRender.push({ width: 76.2, height: 76.2, type: '3x3' })
      for (let i = 0; i < copies2x2; i++) itemsToRender.push({ width: 50.8, height: 50.8, type: '2x2' })
      for (let i = 0; i < copies1x1; i++) itemsToRender.push({ width: 25.4, height: 25.4, type: '1x1' })

      // Sort descending so large photos allocate slots first
      const sortedItems = [...itemsToRender].sort((a, b) => b.height - a.height)

      interface Row {
        y: number;
        height: number;
        currentX: number;
      }

      const rowsList: Row[] = []
      const spacing = spacingMm
      const maxRowWidth = paperWidthMM - 2 * safetyMarginMM

      const initialPlacements: { x: number; y: number; width: number; height: number }[] = []

      sortedItems.forEach((item) => {
        let placed = false
        for (const r of rowsList) {
          if (r.currentX + item.width <= maxRowWidth) {
            initialPlacements.push({
              x: r.currentX,
              y: r.y,
              width: item.width,
              height: item.height
            })
            r.currentX += item.width + spacing
            placed = true
            break
          }
        }

        if (!placed) {
          let nextY = 0
          if (rowsList.length > 0) {
            const lastRow = rowsList[rowsList.length - 1]
            nextY = lastRow.y + lastRow.height + spacing
          }

          const newRow: Row = {
            y: nextY,
            height: item.height,
            currentX: item.width + spacing
          }

          initialPlacements.push({
            x: 0,
            y: nextY,
            width: item.width,
            height: item.height
          })
          rowsList.push(newRow)
        }
      })

      if (initialPlacements.length > 0) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
        for (const pos of initialPlacements) {
          if (pos.x < minX) minX = pos.x
          if (pos.y < minY) minY = pos.y
          if (pos.x + pos.width > maxX) maxX = pos.x + pos.width
          if (pos.y + pos.height > maxY) maxY = pos.y + pos.height
        }

        const boxWidth = maxX - minX
        const boxHeight = maxY - minY
        const shiftX = (paperWidthMM - boxWidth) / 2 - minX
        const shiftY = (paperHeightMM - boxHeight) / 2 - minY

        for (const pos of initialPlacements) {
          const finalX = pos.x + shiftX
          const finalY = pos.y + shiftY

          const pxX = finalX * ratio300
          const pxY = finalY * ratio300
          const pxW = pos.width * ratio300
          const pxH = pos.height * ratio300

          const targetAspectRatio = pos.width / pos.height
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

          ctx.drawImage(img, sx, sy, sWidth, sHeight, pxX, pxY, pxW, pxH)

          ctx.strokeStyle = '#cccccc'
          ctx.lineWidth = 1
          ctx.strokeRect(pxX, pxY, pxW, pxH)
        }
      }
    } else if (cols > 0 && rows > 0) {
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
              className="preview-page-card relative bg-white"
              style={{
                width: `${paperWidthMM * previewZoom}px`,
                height: `${paperHeightMM * previewZoom}px`
              }}
            >
              {previewImage ? (
                <img 
                  src={previewImage} 
                  className="absolute inset-0 w-full h-full object-contain" 
                  alt="ID Sheet Preview" 
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain'
                  }}
                />
              ) : (
                <div 
                  className="flex items-center justify-center h-full text-gray-400"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    color: '#94a3b8'
                  }}
                >
                  Loading preview...
                </div>
              )}
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
                Layout Format: {isCustomMode ? `Custom (${customCopies['1x1']}x 1"x1", ${customCopies['2x2']}x 2"x2", ${customCopies['3x3']}x 3"x3")` : idDef.label}
              </span>
            </div>
          </div>

          {/* Action Export Buttons */}
          <div className="footer-actions">
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
          </div>
        </footer>

      </div>
    </div>
  )
}
