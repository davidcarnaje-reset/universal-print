/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef } from 'react'
import { jsPDF } from 'jspdf'
import './TilingPreviewModal.css'
import { isNativeApp } from '../../utils/env'

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
  overlap: number
  setOverlap: (val: number) => void
  showMargin: boolean
  setShowMargin: (val: boolean) => void
  tilingMode: 'bleed' | 'shrink'
  setTilingMode: (mode: 'bleed' | 'shrink') => void
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
  tilingMode: 'bleed' | 'shrink'
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
  previewZoom,
  tilingMode
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [imgSrc, setImgSrc] = useState<string>('')

  // The preview page is sized exactly to the physical paper dimensions
  const pageW_MM = paperWidthMM
  const pageH_MM = paperHeightMM

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

    if (imageElement) {
      const cellW = paperWidthMM * P
      const cellH = paperHeightMM * P
      const bleedPx = showMargin ? overlap * P : 0

      const left = imageTransform?.left ?? (canvasWidth / 2)
      const top = imageTransform?.top ?? (canvasHeight / 2)
      const scaleX = imageTransform?.scaleX ?? 1
      const scaleY = imageTransform?.scaleY ?? 1
      const angle = imageTransform?.angle ?? 0

      const originalImageWidth = imageElement.width
      const originalImageHeight = imageElement.height

      const imgScaledWidth = originalImageWidth * scaleX
      const imgScaledHeight = originalImageHeight * scaleY
      const imgLeft = left - imgScaledWidth / 2
      const imgTop = top - imgScaledHeight / 2

      if (tilingMode === 'shrink') {
        const marginPx = bleedPx

        // STEP A: Source Window - Extract the exact 1:1 chunk of the layout canvas zone for this sheet
        const srcX = col * cellW
        const srcY = row * cellH
        const srcW = cellW
        const srcH = cellH

        // STEP B: Destination Window - Push coordinates INWARD symmetrically on all 4 sides to shrink the frame
        const destX = marginPx
        const destY = marginPx
        const destW = cellW - (marginPx * 2)
        const destH = cellH - (marginPx * 2)

        // Build temp canvas representing the entire workspace layout zone
        const tempCanvas = document.createElement('canvas')
        tempCanvas.width = canvasWidth
        tempCanvas.height = canvasHeight
        const tempCtx = tempCanvas.getContext('2d')
        if (tempCtx) {
          tempCtx.save()
          if (angle !== 0) {
            tempCtx.translate(left, top)
            tempCtx.rotate((angle * Math.PI) / 180)
            tempCtx.drawImage(imageElement, -imgScaledWidth / 2, -imgScaledHeight / 2, imgScaledWidth, imgScaledHeight)
          } else {
            tempCtx.drawImage(imageElement, imgLeft, imgTop, imgScaledWidth, imgScaledHeight)
          }
          tempCtx.restore()
        }

        ctx.save()
        // Clip cleanly to the outer edge of this sheet
        ctx.beginPath()
        ctx.rect(0, 0, cellW, cellH)
        ctx.clip()

        // Force pure white background to eliminate black fill artifacts
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, cellW, cellH)

        ctx.drawImage(tempCanvas, srcX, srcY, srcW, srcH, destX, destY, destW, destH)
        ctx.restore()

        // Draw dashed guide boundary rectangle showing the shrunk safe zone
        if (showMargin && marginPx > 0) {
          ctx.save()
          ctx.strokeStyle = '#9CA3AF'
          ctx.lineWidth = 0.5 * P
          ctx.setLineDash([4 * P, 4 * P])
          ctx.beginPath()
          ctx.rect(marginPx, marginPx, cellW - (marginPx * 2), cellH - (marginPx * 2))
          ctx.stroke()
          ctx.restore()
        }
      } else {
        // Bleed mode
        ctx.save()
        // Clip cleanly to the outer edge of this specific paper cell sheet
        ctx.beginPath()
        ctx.rect(0, 0, cellW, cellH)
        ctx.clip()

        // Expand image proportions globally to enforce true data overlap projection
        const expandedWidth = imgScaledWidth + (bleedPx * (tilingCols - 1))
        const expandedHeight = imgScaledHeight + (bleedPx * (tilingRows - 1))

        const dx = imgLeft - (col * cellW) + (col * bleedPx)
        const dy = imgTop - (row * cellH) + (row * bleedPx)

        if (angle !== 0) {
          const cx = left - col * cellW + col * bleedPx
          const cy = top - row * cellH + row * bleedPx
          ctx.translate(cx, cy)
          ctx.rotate((angle * Math.PI) / 180)
          ctx.drawImage(imageElement, -expandedWidth / 2, -expandedHeight / 2, expandedWidth, expandedHeight)
        } else {
          ctx.drawImage(imageElement, dx, dy, expandedWidth, expandedHeight)
        }

        ctx.restore()
      }
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
    ctx.strokeRect(0, 0, pageW_MM * P, pageH_MM * P)

    // --- STEP C: BRING BACK THE BEAUTIFUL UI (Shaded Overlap Guides & Dash Lines) ---
    if (tilingMode === 'bleed' && showMargin && overlap > 0) {
      const bleedPx = overlap * P
      const cellW = paperWidthMM * P
      const cellH = paperHeightMM * P
      const textColor = '#6B7280' // Crisp neutral dark gray for sharp visibility

      ctx.save()

      // A. Vertical Seam Rule (Right Side Gutter Indicator)
      if (col < tilingCols - 1 && bleedPx > 0) {
        // Enforce solid white block to hide bleeding edges completely
        ctx.fillStyle = 'rgba(255, 255, 255, 1)';
        ctx.fillRect(cellW - bleedPx, 0, bleedPx, cellH);

        // Draw ultra-thin dashed alignment separator
        ctx.save();
        ctx.strokeStyle = textColor;
        ctx.lineWidth = 0.5 * P;
        ctx.setLineDash([4 * P, 4 * P]);
        ctx.beginPath();
        ctx.moveTo(cellW - bleedPx, 0);
        ctx.lineTo(cellW - bleedPx, cellH);
        ctx.stroke();
        ctx.restore();

        // Render vertical text guide inside the gutter track — clipped to white gutter bounds
        ctx.save();
        // Clip strictly to the white gutter rectangle so text never bleeds into image area
        ctx.beginPath();
        ctx.rect(cellW - bleedPx, 0, bleedPx, cellH);
        ctx.clip();

        ctx.fillStyle = textColor;
        const adaptiveFontV = Math.max(6 * P, Math.min(10 * P, bleedPx * 0.4));
        ctx.font = `bold ${adaptiveFontV}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // Strict mathematical center of ONLY the white gutter rectangle block
        const gutterCenterX = cellW - (bleedPx / 2);
        const gutterCenterY = cellH / 2;
        ctx.translate(gutterCenterX, gutterCenterY);
        ctx.rotate(Math.PI / 2);

        const labelV = bleedPx < 18 * P ? "PASTE HERE" : "--- PASTE HERE ---";
        ctx.fillText(labelV, 0, 0);
        ctx.restore();
      }

      // B. Bottom Edge Gutter Indicator
      if (row < tilingRows - 1 && bleedPx > 0) {
        // Enforce solid white block to hide bleeding edges completely
        ctx.fillStyle = 'rgba(255, 255, 255, 1)';
        ctx.fillRect(0, cellH - bleedPx, cellW, bleedPx);

        // Draw ultra-thin dashed alignment separator
        ctx.save();
        ctx.strokeStyle = textColor;
        ctx.lineWidth = 0.5 * P;
        ctx.setLineDash([4 * P, 4 * P]);
        ctx.beginPath();
        ctx.moveTo(0, cellH - bleedPx);
        ctx.lineTo(cellW, cellH - bleedPx);
        ctx.stroke();
        ctx.restore();

        // Render horizontal paste alignment tracker — clipped to white gutter bounds
        ctx.save();
        // Clip strictly to the white gutter rectangle so text never bleeds into image area
        ctx.beginPath();
        ctx.rect(0, cellH - bleedPx, cellW, bleedPx);
        ctx.clip();

        ctx.fillStyle = textColor;
        const adaptiveFontH = Math.max(6 * P, Math.min(10 * P, bleedPx * 0.4));
        ctx.font = `bold ${adaptiveFontH}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const gutterCenterYB = cellH - (bleedPx / 2);
        const labelH = bleedPx < 18 * P ? "PASTE HERE" : "--- PASTE HERE ---";
        ctx.fillText(labelH, cellW / 2, gutterCenterYB);
        ctx.restore();
      }

      ctx.restore()
    }
    setImgSrc(canvas.toDataURL('image/jpeg', 0.95))
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
    P,
    tilingMode
  ])

  return (
    <div 
      className="preview-page-card print-page-tile-wrapper" 
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
          display: imgSrc ? 'none' : 'block' 
        }}
      />
      {imgSrc && (
        <img
          src={imgSrc}
          className="print-tile-image-node preview-canvas"
          alt={`Tile ${row}-${col}`}
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            objectFit: 'contain'
          }}
        />
      )}
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
  canvasHeight,
  overlap,
  setOverlap,
  showMargin,
  setShowMargin,
  tilingMode,
  setTilingMode
}) => {
  const [showCutLines, setShowCutLines] = useState<boolean>(true)
  const [showScissorMarks, setShowScissorMarks] = useState<boolean>(true)
  const [previewZoom, setPreviewZoom] = useState<number>(0.5)
  const [isExporting, setIsExporting] = useState<boolean>(false)
  const [isPreparingPrint, setIsPreparingPrint] = useState<boolean>(false)
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

    // Detect image format from source URL/Base64
    let imageFormat = 'JPEG'
    const lowerSrc = uploadedImage.toLowerCase()
    if (lowerSrc.startsWith('data:image/png') || lowerSrc.endsWith('.png')) {
      imageFormat = 'PNG'
    } else if (lowerSrc.startsWith('data:image/webp') || lowerSrc.endsWith('.webp')) {
      imageFormat = 'WEBP'
    } else if (lowerSrc.startsWith('data:image/gif') || lowerSrc.endsWith('.gif')) {
      imageFormat = 'GIF'
    }

    const left = imageTransform?.left ?? (canvasWidth / 2);
    const top = imageTransform?.top ?? (canvasHeight / 2);
    const scaleX = imageTransform?.scaleX ?? 1;
    const scaleY = imageTransform?.scaleY ?? 1;
    const angle = imageTransform?.angle ?? 0;

    const originalImageWidth = img.width;
    const originalImageHeight = img.height;

    const scaleFactor = 0.5;
    const imgScaledWidth = originalImageWidth * scaleX * scaleFactor;
    const imgScaledHeight = originalImageHeight * scaleY * scaleFactor;
    const imgLeft = (left - (originalImageWidth * scaleX) / 2) * scaleFactor;
    const imgTop = (top - (originalImageHeight * scaleY) / 2) * scaleFactor;

    // 1. Pre-render the high-res layout canvas of the entire workspace if tilingMode === 'shrink'
    let tempCanvas: HTMLCanvasElement | null = null;
    const dpiScale = 300 / 25.4; // 300 DPI in px/mm

    if (tilingMode === 'shrink') {
      const canvasW = tilingCols * paperWidthMM * dpiScale;
      const canvasH = tilingRows * paperHeightMM * dpiScale;

      tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvasW;
      tempCanvas.height = canvasH;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCtx.save();
        // Clear temp canvas with white background (or transparent)
        tempCtx.fillStyle = 'rgba(255, 255, 255, 0)';
        tempCtx.fillRect(0, 0, canvasW, canvasH);

        const leftPx = left * scaleFactor * dpiScale;
        const topPx = top * scaleFactor * dpiScale;
        const imgWPx = imgScaledWidth * dpiScale;
        const imgHPx = imgScaledHeight * dpiScale;

        if (angle !== 0) {
          tempCtx.translate(leftPx, topPx);
          tempCtx.rotate((angle * Math.PI) / 180);
          tempCtx.drawImage(img, -imgWPx / 2, -imgHPx / 2, imgWPx, imgHPx);
        } else {
          tempCtx.drawImage(img, leftPx - imgWPx / 2, topPx - imgHPx / 2, imgWPx, imgHPx);
        }
        tempCtx.restore();
      }
    }

    for (let r = 0; r < tilingRows; r++) {
      for (let c = 0; c < tilingCols; c++) {
        if (r > 0 || c > 0) pdf.addPage();

        const margin = showMargin ? overlap : 0;
        const docAny = pdf as any;

        if (tilingMode === 'shrink' && tempCanvas) {
          const marginMm = showMargin ? overlap : 0;

          // STEP A: Source Window
          const srcW = paperWidthMM * dpiScale;
          const srcH = paperHeightMM * dpiScale;
          const srcX = c * srcW;
          const sy = r * srcH;

          // STEP B: Destination Window
          const destX = marginMm;
          const destY = marginMm;
          const destW = paperWidthMM - (marginMm * 2);
          const destH = paperHeightMM - (marginMm * 2);

          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = srcW;
          pageCanvas.height = srcH;
          const pageCtx = pageCanvas.getContext('2d');
          if (pageCtx) {
            // Force pure white background to eliminate black fill artifacts
            pageCtx.fillStyle = '#ffffff';
            pageCtx.fillRect(0, 0, srcW, srcH);

            pageCtx.drawImage(tempCanvas, srcX, sy, srcW, srcH, 0, 0, srcW, srcH);
            const sliceDataUrl = pageCanvas.toDataURL(imageFormat === 'PNG' ? 'image/png' : 'image/jpeg');

            docAny.saveGraphicsState();

            // Force white page background in PDF before image
            pdf.setFillColor(255, 255, 255);
            pdf.rect(0, 0, paperWidthMM, paperHeightMM, 'F');

            // Clip cleanly to the outer edge of this sheet page
            docAny.rect(0, 0, paperWidthMM, paperHeightMM, null);
            docAny.clip();

            const tileW = Math.round(destW);
            const tileH = Math.round(destH);
            docAny.addImage(
              sliceDataUrl,
              imageFormat,
              destX,
              destY,
              tileW + 0.2,
              tileH + 0.2,
              undefined,
              'FAST'
            );
            docAny.restoreGraphicsState();

            // Draw dashed guide boundary rectangle showing the shrunk safe zone
            if (marginMm > 0) {
              pdf.saveGraphicsState();
              pdf.setDrawColor(180, 180, 180);
              pdf.setLineWidth(0.15);
              pdf.setLineDashPattern([3, 3], 0);
              pdf.rect(marginMm, marginMm, paperWidthMM - (marginMm * 2), paperHeightMM - (marginMm * 2), 'S');
              pdf.restoreGraphicsState();
            }
          }
        } else {
          // Bleed Mode
          const bleedMm = margin;
          const expandedWidth = imgScaledWidth + (bleedMm * (tilingCols - 1));
          const expandedHeight = imgScaledHeight + (bleedMm * (tilingRows - 1));

          const drawLeft = imgLeft - c * paperWidthMM + c * bleedMm;
          const drawTop = imgTop - r * paperHeightMM + r * bleedMm;

          docAny.saveGraphicsState();

          // Clip cleanly to the outer edge of this sheet page
          docAny.rect(0, 0, paperWidthMM, paperHeightMM, null);
          docAny.clip();

          if (angle !== 0) {
            const cx = left * scaleFactor - c * paperWidthMM + c * bleedMm;
            const cy = top * scaleFactor - r * paperHeightMM + r * bleedMm;
            const theta = (angle * Math.PI) / 180;
            const rotatedDrawLeft = cx - (expandedWidth / 2) * Math.cos(theta) + (expandedHeight / 2) * Math.sin(theta);
            const rotatedDrawTop = cy - (expandedWidth / 2) * Math.sin(theta) - (expandedHeight / 2) * Math.cos(theta);

            const tileW = Math.round(expandedWidth);
            const tileH = Math.round(expandedHeight);
            docAny.addImage(
              img,
              imageFormat,
              rotatedDrawLeft,
              rotatedDrawTop,
              tileW + 0.2,
              tileH + 0.2,
              undefined,
              'FAST',
              angle
            );
          } else {
            const tileW = Math.round(expandedWidth);
            const tileH = Math.round(expandedHeight);
            docAny.addImage(
              img,
              imageFormat,
              drawLeft,
              drawTop,
              tileW + 0.2,
              tileH + 0.2,
              undefined,
              'FAST'
            );
          }

          docAny.restoreGraphicsState();
        }

        // Draw solid page border helper if showMargin is active (very clean light gray outline)
        if (showMargin) {
          pdf.saveGraphicsState();
          pdf.setLineWidth(0.1);
          pdf.setDrawColor(220, 220, 220);
          pdf.rect(0, 0, paperWidthMM, paperHeightMM, 'S');
          pdf.restoreGraphicsState();
        }

        // Draw visual indicators on PDF borders (Solid Clean White Gutters, ultra-thin dashed separators, and grey text alignment instructions)
        if (tilingMode === 'bleed' && showMargin && margin > 0) {
          pdf.saveGraphicsState();

          const midX = paperWidthMM / 2;
          const midY = paperHeightMM / 2;
          const textFillRGB = [107, 114, 128]; // crisp neutral dark gray #6B7280
          pdf.setTextColor(textFillRGB[0], textFillRGB[1], textFillRGB[2]);

          const labelFontSize = Math.max(4, Math.min(7.5, margin * 0.4));
          pdf.setFontSize(labelFontSize);
          pdf.setFont('helvetica', 'bold');

          // A. Right Edge Gutter Indicator
          if (c < tilingCols - 1) {
            // Enforce 100% solid white block to hide bleeding artifact edges completely
            pdf.setFillColor(255, 255, 255);
            pdf.rect(paperWidthMM - margin, 0, margin, paperHeightMM, 'F');

            // Draw ultra-thin dashed alignment separator
            pdf.setLineWidth(0.15);
            pdf.setDrawColor(180, 180, 180);
            pdf.setLineDashPattern([3, 3], 0);
            pdf.line(paperWidthMM - margin, 0, paperWidthMM - margin, paperHeightMM);

            // Render vertical paste guide — strict gutter center anchor lock
            const pdfGutterCenterX = paperWidthMM - (margin / 2);
            const pdfGutterCenterY = midY;
            const labelR = margin < 18 ? 'PASTE HERE' : '--- PASTE HERE ---';
            pdf.text(labelR, pdfGutterCenterX, pdfGutterCenterY, {
              angle: -90,
              align: 'center',
              baseline: 'middle'
            });
          }

          // B. Bottom Edge Gutter Indicator
          if (r < tilingRows - 1) {
            // Enforce 100% solid white block to hide bleeding artifact edges completely
            pdf.setFillColor(255, 255, 255);
            pdf.rect(0, paperHeightMM - margin, paperWidthMM, margin, 'F');

            // Draw ultra-thin dashed alignment separator
            pdf.setLineWidth(0.15);
            pdf.setDrawColor(180, 180, 180);
            pdf.setLineDashPattern([3, 3], 0);
            pdf.line(0, paperHeightMM - margin, paperWidthMM, paperHeightMM - margin);

            // Render horizontal paste guide inside the white block — clipped to gutter bounds
            const labelB = margin < 18 ? 'PASTE HERE' : '--- PASTE HERE ---';
            pdf.text(labelB, midX, paperHeightMM - margin / 2 + 0.8, {
              align: 'center'
            });
          }

          pdf.restoreGraphicsState();
        }
      }
    }
    return pdf;
  };

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

  const handleNativePrintTrigger = async () => {
    setIsPreparingPrint(true);
    await new Promise((resolve) => setTimeout(resolve, 100));

    try {
      // 1. Reuse our perfect jsPDF compilation matrix configuration
      const doc = await generateHighResPDF(); 
      if (doc) {
        // 2. Extract data safely into a browser-native Base64 string stream (removing the URI header signature)
        const dataUriString = doc.output('datauristring');
        const base64String = dataUriString.split(',')[1]; // Strictly extracts only the raw base64 data array payload

        // 3. Ship the payload straight to the main process cache pipeline
        if ((window as any).electron?.ipcRenderer) {
          (window as any).electron.ipcRenderer.send('spool-cached-pdf-print', base64String);
        } else if ((window as any).ipcRenderer) {
          (window as any).ipcRenderer.send('spool-cached-pdf-print', base64String);
        } else {
          console.error("IPC bridge unavailable in web browser context.");
        }
      }
    } catch (error) {
      console.error("Frontend print cache generator failed:", error);
    } finally {
      setIsPreparingPrint(false);
    }
  };

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
          tilingMode={tilingMode}
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
              id="print-flow-layout-capture-root"
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
                  max="1.5"
                  step="0.05"
                  value={previewZoom}
                  onChange={(e) => setPreviewZoom(parseFloat(e.target.value))}
                />
                <span className="value-badge">{Math.round(previewZoom * 100)}%</span>
              </div>
            </div>

            {/* Tiling Mode selector */}
            <div className="footer-control-item footer-mode">
              <label htmlFor="modal-tiling-mode">Tiling Mode</label>
              <select
                id="modal-tiling-mode"
                value={tilingMode}
                onChange={(e) => setTilingMode(e.target.value as 'bleed' | 'shrink')}
                className="form-select"
                style={{ width: '150px' }}
              >
                <option value="bleed">Bleed Mode (Overlap)</option>
                <option value="shrink">Shrink Mode (Fit to Page)</option>
              </select>
            </div>

            {/* Overlap value slider */}
            <div className={`footer-control-item footer-overlap ${!showMargin ? 'disabled' : ''}`}>
              <label htmlFor="modal-overlap">{tilingMode === 'shrink' ? 'Page Margin' : 'Bleed Overlap'}</label>
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
                <span>{tilingMode === 'shrink' ? 'Enable Margin' : 'Enable Bleed Overlap'}</span>
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
            {isNativeApp ? (
              <>
                <button 
                  className="preview-action-btn secondary" 
                  onClick={handleSavePDF}
                  disabled={isExporting || isPreparingPrint || !uploadedImage}
                >
                  {isExporting ? 'Exporting...' : 'Save as PDF'}
                </button>
                <button 
                  className="preview-action-btn primary" 
                  onClick={handleNativePrintTrigger}
                  disabled={isExporting || isPreparingPrint || !uploadedImage}
                >
                  {isPreparingPrint ? 'Preparing...' : isExporting ? 'Exporting...' : 'Print Now'}
                </button>
              </>
            ) : (
              <button 
                className="preview-action-btn primary" 
                onClick={handleSavePDF}
                disabled={isExporting || isPreparingPrint || !uploadedImage}
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
