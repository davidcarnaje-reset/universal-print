/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef } from 'react'
import { jsPDF } from 'jspdf'
import './TilingPreviewModal.css'

interface ImageTransform {
  left: number
  top: number
  scaleX: number
  scaleY: number
  angle: number
}

interface TilingPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  uploadedImage: string | null
  tilingRows: number
  tilingCols: number
  paperWidthMM: number
  paperHeightMM: number
  orientation: 'portrait' | 'landscape'
  imageTransform: ImageTransform
  canvasWidth: number
  canvasHeight: number
}

interface PagePreviewCanvasProps {
  row: number
  col: number
  tilingRows: number
  tilingCols: number
  paperWidthMM: number
  paperHeightMM: number
  orientation: 'portrait' | 'landscape'
  imageElement: HTMLImageElement | null
  imageTransform: ImageTransform
  canvasWidth: number
  canvasHeight: number
  overlap: number
  showMargin: boolean
  showCutLines: boolean
  showScissorMarks: boolean
  previewZoom: number
}

const PagePreviewCanvas: React.FC<PagePreviewCanvasProps> = ({
  row,
  col,
  tilingRows,
  tilingCols,
  paperWidthMM,
  paperHeightMM,
  orientation,
  imageElement,
  imageTransform,
  canvasWidth,
  canvasHeight,
  overlap,
  showMargin,
  showCutLines,
  showScissorMarks,
  previewZoom
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // Calculate margins for the page slice
  const marginVal = showMargin ? overlap : 0
  const marginLeft = (col > 0) ? marginVal : 0
  const marginRight = (col < tilingCols - 1) ? marginVal : 0
  const marginTop = (row > 0) ? marginVal : 0
  const marginBottom = (row < tilingRows - 1) ? marginVal : 0

  const pageW_MM = paperWidthMM + marginLeft + marginRight
  const pageH_MM = paperHeightMM + marginTop + marginBottom

  // Canvas drawing scale (constant for crisp rendering)
  const P = 2.0

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear and draw white background
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, pageW_MM * P, pageH_MM * P)

    // Grid cell dimensions on screen canvas
    const cellW = canvasWidth / tilingCols
    const cellH = canvasHeight / tilingRows

    // Scale conversion factor from screen canvas to page preview coordinates
    // Screen canvas uses CANVAS_SCALE = 2.0 (pixels per mm), and preview canvas uses P = 2.0
    const kX = (paperWidthMM * P) / cellW
    const kY = (paperHeightMM * P) / cellH

    if (imageElement) {
      // Distance from cell top-left to image center on screen canvas
      const dx = imageTransform.left - col * cellW
      const dy = imageTransform.top - row * cellH

      // Target translation and scale in preview coordinates
      const targetX = marginLeft * P + dx * kX
      const targetY = marginTop * P + dy * kY
      const targetScaleX = imageTransform.scaleX * kX
      const targetScaleY = imageTransform.scaleY * kY
      const angleRad = (imageTransform.angle * Math.PI) / 180

      // Clip image drawing to the active paper area (excludes overlap margins)
      ctx.save()
      ctx.beginPath()
      ctx.rect(marginLeft * P, marginTop * P, paperWidthMM * P, paperHeightMM * P)
      ctx.clip()

      // Draw image with transforms
      ctx.save()
      ctx.translate(targetX, targetY)
      ctx.rotate(angleRad)
      ctx.scale(targetScaleX, targetScaleY)
      ctx.drawImage(imageElement, -imageElement.width / 2, -imageElement.height / 2, imageElement.width, imageElement.height)
      ctx.restore()

      ctx.restore() // restore clipping state
    } else {
      // Draw placeholder text if no image
      ctx.fillStyle = '#94a3b8'
      ctx.font = `${8 * P}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(`Page ${row + 1}-${col + 1}`, (pageW_MM * P) / 2, (pageH_MM * P) / 2)
    }

    // Draw solid border of the active area (visual helper showing active paper edges)
    ctx.strokeStyle = '#e2e8f0'
    ctx.lineWidth = 0.5 * P
    ctx.strokeRect(marginLeft * P, marginTop * P, paperWidthMM * P, paperHeightMM * P)

    // Draw alignment guides (Cut/Paste) in the white margins
    if (showMargin && overlap > 0) {
      const guideColor = '#3b82f6'
      ctx.strokeStyle = guideColor
      ctx.fillStyle = guideColor
      ctx.font = `${Math.max(6, 3 * P)}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.lineWidth = 0.4 * P
      ctx.setLineDash([2 * P, 2 * P])

      const pageW = pageW_MM * P
      const pageH = pageH_MM * P

      // LEFT Edge Guide (if col > 0)
      if (col > 0) {
        const marginText = "- CUT HERE -"
        const lineX = marginLeft * P
        const textX = (marginLeft / 2) * P

        if (showCutLines) {
          ctx.beginPath()
          ctx.moveTo(lineX, 0)
          ctx.lineTo(lineX, pageH)
          ctx.stroke()
        }

        if (showScissorMarks) {
          ctx.save()
          ctx.translate(textX, pageH / 2)
          ctx.rotate(Math.PI / 2)
          ctx.fillText(marginText, 0, 0)
          ctx.restore()
        }
      }

      // RIGHT Edge Guide (if col < tilingCols - 1)
      if (col < tilingCols - 1) {
        const marginText = "--- PASTE HERE --->"
        const lineX = (marginLeft + paperWidthMM) * P
        const textX = (marginLeft + paperWidthMM + marginRight / 2) * P

        if (showCutLines) {
          ctx.beginPath()
          ctx.moveTo(lineX, 0)
          ctx.lineTo(lineX, pageH)
          ctx.stroke()
        }

        if (showScissorMarks) {
          ctx.save()
          ctx.translate(textX, pageH / 2)
          ctx.rotate(-Math.PI / 2)
          ctx.fillText(marginText, 0, 0)
          ctx.restore()
        }
      }

      // TOP Edge Guide (if row > 0)
      if (row > 0) {
        const marginText = "- CUT HERE -"
        const lineY = marginTop * P
        const textY = (marginTop / 2) * P

        if (showCutLines) {
          ctx.beginPath()
          ctx.moveTo(0, lineY)
          ctx.lineTo(pageW, lineY)
          ctx.stroke()
        }

        if (showScissorMarks) {
          ctx.fillText(marginText, pageW / 2, textY)
        }
      }

      // BOTTOM Edge Guide (if row < tilingRows - 1)
      if (row < tilingRows - 1) {
        const marginText = "--- PASTE HERE --->"
        const lineY = (marginTop + paperHeightMM) * P
        const textY = (marginTop + paperHeightMM + marginBottom / 2) * P

        if (showCutLines) {
          ctx.beginPath()
          ctx.moveTo(0, lineY)
          ctx.lineTo(pageW, lineY)
          ctx.stroke()
        }

        if (showScissorMarks) {
          ctx.fillText(marginText, pageW / 2, textY)
        }
      }
    }
  }, [
    row,
    col,
    tilingRows,
    tilingCols,
    paperWidthMM,
    paperHeightMM,
    orientation,
    imageElement,
    imageTransform,
    canvasWidth,
    canvasHeight,
    overlap,
    showMargin,
    showCutLines,
    showScissorMarks,
    pageW_MM,
    pageH_MM,
    marginLeft,
    marginRight,
    marginTop,
    marginBottom,
    P
  ])

  return (
    <div 
      className="preview-page-card" 
      style={{ 
        width: `${pageW_MM * previewZoom}px`, 
        height: `${pageH_MM * previewZoom}px` 
      }}
    >
      <canvas
        ref={canvasRef}
        width={pageW_MM * P}
        height={pageH_MM * P}
        style={{ 
          width: '100%', 
          height: '100%', 
          display: 'block' 
        }}
      />
      <div className="preview-page-label">
        Page {row + 1}, Row {row + 1} Col {col + 1}
      </div>
    </div>
  )
}

export const TilingPreviewModal: React.FC<TilingPreviewModalProps> = ({
  isOpen,
  onClose,
  uploadedImage,
  tilingRows,
  tilingCols,
  paperWidthMM,
  paperHeightMM,
  orientation,
  imageTransform,
  canvasWidth,
  canvasHeight
}) => {
  const [overlap, setOverlap] = useState<number>(15)
  const [showMargin, setShowMargin] = useState<boolean>(true)
  const [showCutLines, setShowCutLines] = useState<boolean>(true)
  const [showScissorMarks, setShowScissorMarks] = useState<boolean>(true)
  const [previewZoom, setPreviewZoom] = useState<number>(0.5)
  const [isExporting, setIsExporting] = useState<boolean>(false)
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null)

  // Load image element once for drawing
  useEffect(() => {
    if (!uploadedImage) {
      setImageElement(null)
      return
    }

    const img = new Image()
    img.onload = () => setImageElement(img)
    img.onerror = (err) => console.error('Failed to load image in TilingPreviewModal:', err)
    img.src = uploadedImage
  }, [uploadedImage])

  // Reset zoom based on row/column count to fit screen initially
  useEffect(() => {
    const maxDimensionCount = Math.max(tilingCols, tilingRows)
    if (maxDimensionCount >= 5) {
      setPreviewZoom(0.35)
    } else if (maxDimensionCount >= 3) {
      setPreviewZoom(0.5)
    } else {
      setPreviewZoom(0.65)
    }
  }, [tilingRows, tilingCols, isOpen])

  if (!isOpen) return null

  // PDF Generator Engine at 300 DPI
  const generateHighResPDF = async (): Promise<jsPDF | null> => {
    if (!uploadedImage) return null

    const ratio300 = 11.811

    const pdf = new jsPDF({
      orientation: orientation,
      unit: 'mm',
      format: [paperWidthMM, paperHeightMM]
    })

    // Load original source image
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const tempImg = new Image()
      tempImg.onload = () => resolve(tempImg)
      tempImg.onerror = (err) => reject(err)
      tempImg.src = uploadedImage
    })

    const cellW = canvasWidth / tilingCols
    const cellH = canvasHeight / tilingRows

    // Scale factors mapping grid cells to paper dimensions at 300 DPI
    const kX = (paperWidthMM * ratio300) / cellW
    const kY = (paperHeightMM * ratio300) / cellH

    const { left, top, scaleX, scaleY, angle } = imageTransform

    for (let r = 0; r < tilingRows; r++) {
      for (let c = 0; c < tilingCols; c++) {
        if (r > 0 || c > 0) pdf.addPage();

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const glueOverlapMargin = showMargin ? overlap : 0;
        const margin = glueOverlapMargin;

        // Derive physical margin offsets for this cell position
        const marginLeft = (c > 0) ? margin : 0;
        const marginRight = (c < tilingCols - 1) ? margin : 0;
        const marginTopVal = (r > 0) ? margin : 0;
        const marginBottom = (r < tilingRows - 1) ? margin : 0;

        // Strict pixel boundary: canvas sized EXACTLY to the PDF page dimensions at 300 DPI
        const canvasPxW = Math.round(paperWidthMM * ratio300);
        const canvasPxH = Math.round(paperHeightMM * ratio300);

        const canvas = document.createElement('canvas');
        canvas.width = canvasPxW;
        canvas.height = canvasPxH;
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;

        // White background for full page
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvasPxW, canvasPxH);

        // --- STRICT CLIPPING CONSTRAINT ---
        // The cell boundary in screen-canvas coordinates
        const cellX0 = c * cellW;       // left edge of this cell
        const cellY0 = r * cellH;       // top edge of this cell

        // Image center relative to this cell's top-left corner
        const dx = left - cellX0;
        const dy = top - cellY0;

        // Map to 300 DPI coordinates, offset by the margin zone
        const targetX = marginLeft * ratio300 + dx * kX;
        const targetY = marginTopVal * ratio300 + dy * kY;
        const targetScaleX = scaleX * kX;
        const targetScaleY = scaleY * kY;
        const angleRad = (angle * Math.PI) / 180;

        // Clip strictly to the active paper area of the layout cell (excluding overlap margin areas)
        // This enforces that no image pixel bleeds past the cell division point (dashed guidelines)
        ctx.save();
        ctx.beginPath();
        ctx.rect(
          marginLeft * ratio300,
          marginTopVal * ratio300,
          (paperWidthMM - marginLeft - marginRight) * ratio300,
          (paperHeightMM - marginTopVal - marginBottom) * ratio300
        );
        ctx.clip();

        // Draw the image with transform
        ctx.save();
        ctx.translate(targetX, targetY);
        ctx.rotate(angleRad);
        ctx.scale(targetScaleX, targetScaleY);
        ctx.drawImage(img, -img.width / 2, -img.height / 2, img.width, img.height);
        ctx.restore();
        ctx.restore();

        const tileImgData = canvas.toDataURL('image/jpeg', 0.95);

        // 1. STRICT FULL BLEED: Image slice occupies the entire page
        pdf.addImage(tileImgData, 'JPEG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');

        const showGuides = showMargin;

        // 2. OVERLAY MASKING LAYER
        if (showGuides) {
          pdf.setLineWidth(0.2);
          if (typeof (pdf as any).setLineDashPattern === 'function') {
            (pdf as any).setLineDashPattern([2, 2], 0);
          } else if (typeof (pdf as any).setLineDash === 'function') {
            (pdf as any).setLineDash([2, 2], 0);
          }
          pdf.setDrawColor(180, 180, 180);
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(7);
          pdf.setTextColor(140, 140, 140);

          const midX = pageWidth / 2;
          const midY = pageHeight / 2;

          // 1. LEFT SIDE GUIDELINES (Middle and Right columns)
          if (c > 0) {
            const lineX = margin; 
            pdf.line(lineX, 0, lineX, pageHeight);
            
            // Plain horizontal text, left-aligned, right next to the left edge of the paper
            // Stacked safely halfway down the page height
            pdf.text('CUT', 2, midY - 2);
            pdf.text('HERE', 2, midY + 2);
          }

          // 2. RIGHT SIDE GUIDELINES (Left and Middle columns)
          if (c < tilingCols - 1) {
            const lineX = pageWidth - margin;
            pdf.line(lineX, 0, lineX, pageHeight);
            
            // Plain horizontal text, anchored safely between lineX and the right physical edge of the paper
            // Using a safe static right-aligned layout to prevent image bleeding
            pdf.text('PASTE', pageWidth - 2, midY - 2, { align: 'right' });
            pdf.text('HERE', pageWidth - 2, midY + 2, { align: 'right' });
          }

          // 3. TOP SIDE GUIDELINES (Middle and Bottom rows)
          if (r > 0) {
            pdf.line(0, margin, pageWidth, margin);
            pdf.text('- CUT HERE -', midX, margin / 2 + 1, { align: 'center' });
          }

          // 4. BOTTOM SIDE GUIDELINES (Top and Middle rows)
          if (r < tilingRows - 1) {
            const lineY = pageHeight - margin;
            pdf.line(0, lineY, pageWidth, lineY);
            pdf.text('--- PASTE HERE --->', midX, pageHeight - (margin / 2) + 1, { align: 'center' });
          }

          // Reset line dash pattern to solid
          if (typeof (pdf as any).setLineDashPattern === 'function') {
            (pdf as any).setLineDashPattern([], 0);
          } else if (typeof (pdf as any).setLineDash === 'function') {
            (pdf as any).setLineDash([], 0);
          }
        }
      }
    }

    return pdf;
  }

  const handleSavePDF = async () => {
    setIsExporting(true)
    try {
      const pdf = await generateHighResPDF()
      if (pdf) {
        pdf.save('print-layout.pdf')
      }
    } catch (err) {
      console.error('Error generating PDF:', err)
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

  // Create page grid components
  const pageGridItems = []
  for (let r = 0; r < tilingRows; r++) {
    for (let c = 0; c < tilingCols; c++) {
      pageGridItems.push(
        <PagePreviewCanvas
          key={`${r}-${c}`}
          row={r}
          col={c}
          tilingRows={tilingRows}
          tilingCols={tilingCols}
          paperWidthMM={paperWidthMM}
          paperHeightMM={paperHeightMM}
          orientation={orientation}
          imageElement={imageElement}
          imageTransform={imageTransform}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
          overlap={overlap}
          showMargin={showMargin}
          showCutLines={showCutLines}
          showScissorMarks={showScissorMarks}
          previewZoom={previewZoom}
        />
      )
    }
  }

  return (
    <div className="preview-modal-overlay">
      <div className="preview-modal-container">
        
        {/* Modal Header */}
        <header className="preview-modal-header">
          <div className="header-info">
            <h2>Multi-Page Print Preview</h2>
            <p>Review exact print layout and margins before saving</p>
          </div>
          <button className="close-modal-btn" onClick={onClose} aria-label="Close Preview">
            ✕
          </button>
        </header>

        {/* Modal Body - Grid Matrix View */}
        <div className="preview-modal-body">
          <div className="preview-matrix-scroll-container">
            <div 
              className="preview-matrix-grid"
              style={{
                gridTemplateColumns: `repeat(${tilingCols}, auto)`
              }}
            >
              {pageGridItems}
            </div>
          </div>
        </div>

        {/* Modal Configurations Bar */}
        <footer className="preview-modal-footer">
          <div className="footer-controls">
            
            {/* Zoom slider */}
            <div className="footer-control-item footer-zoom">
              <label htmlFor="modal-zoom">Preview Size</label>
              <div className="slider-wrapper">
                <input
                  type="range"
                  id="modal-zoom"
                  min="0.15"
                  max="1.2"
                  step="0.05"
                  value={previewZoom}
                  onChange={(e) => setPreviewZoom(parseFloat(e.target.value))}
                />
                <span className="value-badge">{Math.round(previewZoom * 100)}%</span>
              </div>
            </div>

            {/* Overlap value slider */}
            <div className={`footer-control-item footer-overlap ${!showMargin ? 'disabled' : ''}`}>
              <label htmlFor="modal-overlap">Glue Overlap Margin</label>
              <div className="slider-wrapper">
                <input
                  type="range"
                  id="modal-overlap"
                  min="0"
                  max="50"
                  step="1"
                  disabled={!showMargin}
                  value={overlap}
                  onChange={(e) => setOverlap(parseInt(e.target.value) || 0)}
                />
                <span className="value-badge">{overlap} mm</span>
              </div>
            </div>

            {/* Checklist parameter toggles */}
            <div className="footer-control-item footer-toggles">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={showMargin}
                  onChange={(e) => setShowMargin(e.target.checked)}
                />
                <span>Enable Margins</span>
              </label>

              <label className="toggle-label" style={{ opacity: showMargin ? 1 : 0.4 }}>
                <input
                  type="checkbox"
                  checked={showCutLines}
                  disabled={!showMargin}
                  onChange={(e) => setShowCutLines(e.target.checked)}
                />
                <span>Cut Lines</span>
              </label>

              <label className="toggle-label" style={{ opacity: showMargin ? 1 : 0.4 }}>
                <input
                  type="checkbox"
                  checked={showScissorMarks}
                  disabled={!showMargin}
                  onChange={(e) => setShowScissorMarks(e.target.checked)}
                />
                <span>Scissor Marks</span>
              </label>
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
