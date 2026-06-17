import { useState, useCallback, useEffect, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { jsPDF } from 'jspdf'
import { Canvas, FabricImage, Line, Rect, FabricText } from 'fabric'
import './App.css'

interface PaperDimension {
  width: number
  height: number
  label: string
}

const PAPER_SIZES: Record<string, PaperDimension> = {
  "A4": { width: 210, height: 297, label: "A4 (210 x 297 mm)" },
  "Letter": { width: 215.9, height: 279.4, label: "Letter (8.5 x 11 in)" },
  "Legal": { width: 215.9, height: 355.6, label: "Legal (8.5 x 14 in)" },
  "A3": { width: 297, height: 420, label: "A3 (297 x 420 mm)" },
  "4x6": { width: 101.6, height: 152.4, label: "4\" x 6\" (Photo Paper)" },
  "5x7": { width: 127, height: 177.8, label: "5\" x 7\" (Photo Paper)" }
}

const ID_SIZES = {
  "1x1": { width: 25.4, height: 25.4, label: "1\" x 1\" (25.4 x 25.4 mm)" },
  "2x2": { width: 50.8, height: 50.8, label: "2\" x 2\" (50.8 x 50.8 mm)" },
  "passport": { width: 35.0, height: 45.0, label: "Passport (35 x 45 mm)" }
}

function App() {
  // Navigation & Sizing States
  const [activeTab, setActiveTab] = useState<'tiling' | 'id-picture'>('tiling')
  const [paperSize, setPaperSize] = useState<string>('A4')
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait')
  const [zoom, setZoom] = useState<number>(1.0)

  // Upload States
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
  const [uploadedFileSize, setUploadedFileSize] = useState<string | null>(null)

  // Tiling States
  const [tilingRows, setTilingRows] = useState<number>(2)
  const [tilingCols, setTilingCols] = useState<number>(2)
  const [overlap, setOverlap] = useState<number>(15)
  const [showGuides, setShowGuides] = useState<boolean>(false)

  // ID Picture States
  const [idSize, setIdSize] = useState<'1x1' | '2x2' | 'passport'>('2x2')
  const [idSpacing, setIdSpacing] = useState<number>(2)

  // Export State
  const [isExporting, setIsExporting] = useState<boolean>(false)

  // Ref DOM Canvas element & Fabric.js Canvas Instance
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const fabricCanvasRef = useRef<Canvas | null>(null)
  
  const fabricImageRef = useRef<FabricImage | null>(null)
  const lastLoadedSrcRef = useRef<string | null>(null)
  const lastCanvasRef = useRef<Canvas | null>(null)

  // File dropzone trigger
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      const file = acceptedFiles[0]
      setUploadedFileName(file.name)
      
      const sizeInMB = (file.size / (1024 * 1024)).toFixed(2)
      setUploadedFileSize(`${sizeInMB} MB`)

      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setUploadedImage(reader.result)
        }
      }
      reader.readAsDataURL(file)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': []
    },
    multiple: false
  })

  const handleClearImage = () => {
    setUploadedImage(null)
    setUploadedFileName(null)
    setUploadedFileSize(null)
    fabricImageRef.current = null
    lastLoadedSrcRef.current = null
    lastCanvasRef.current = null
  }

  const CANVAS_SCALE = 2.0

  // Calculate paper dimension sizes on canvas
  const paperDef = PAPER_SIZES[paperSize] || PAPER_SIZES["A4"]
  const paperWidthMM = orientation === 'landscape' ? paperDef.height : paperDef.width
  const paperHeightMM = orientation === 'landscape' ? paperDef.width : paperDef.height
  const cellW = paperWidthMM * CANVAS_SCALE
  const cellH = paperHeightMM * CANVAS_SCALE

  const canvasWidth = activeTab === 'tiling' ? tilingCols * cellW : cellW
  const canvasHeight = activeTab === 'tiling' ? tilingRows * cellH : cellH

  // ID fit calculations
  const idDef = ID_SIZES[idSize]
  const idW = idDef.width
  const idH = idDef.height
  const safetyMarginMM = 5
  const marginPx = safetyMarginMM * CANVAS_SCALE
  const spacingPx = idSpacing * CANVAS_SCALE
  const idWidthPx = idW * CANVAS_SCALE
  const idHeightPx = idH * CANVAS_SCALE

  const usableW = cellW - (2 * marginPx)
  const usableH = cellH - (2 * marginPx)

  const fitCols = Math.max(0, Math.floor((usableW + spacingPx) / (idWidthPx + spacingPx)))
  const fitRows = Math.max(0, Math.floor((usableH + spacingPx) / (idHeightPx + spacingPx)))
  const totalFitCount = fitCols * fitRows

  // Draw Tiling Static Grid Overlay
  const drawGridOverlay = useCallback((fc: Canvas) => {
    const gridStrokeColor = '#3b82f6'
    const gridLineWidth = 2

    // Columns dividing lines
    for (let c = 1; c < tilingCols; c++) {
      const x = c * cellW
      const line = new Line([x, 0, x, canvasHeight], {
        stroke: gridStrokeColor,
        strokeWidth: gridLineWidth,
        selectable: false,
        evented: false
      })
      fc.add(line)
    }

    // Rows dividing lines
    for (let r = 1; r < tilingRows; r++) {
      const y = r * cellH
      const line = new Line([0, y, canvasWidth, y], {
        stroke: gridStrokeColor,
        strokeWidth: gridLineWidth,
        selectable: false,
        evented: false
      })
      fc.add(line)
    }

    // Dash Lines for Overlaps (Cut Lines)
    if (showGuides && overlap > 0) {
      const overlapPx = overlap * CANVAS_SCALE
      const cutStrokeColor = '#3b82f6'
      const cutLineWidth = 1
      const strokeDash = [5, 5]

      for (let c = 1; c < tilingCols; c++) {
        const x = c * cellW

        const leftLine = new Line([x - overlapPx / 2, 0, x - overlapPx / 2, canvasHeight], {
          stroke: cutStrokeColor,
          strokeWidth: cutLineWidth,
          strokeDashArray: strokeDash,
          selectable: false,
          evented: false
        })
        fc.add(leftLine)

        const rightLine = new Line([x + overlapPx / 2, 0, x + overlapPx / 2, canvasHeight], {
          stroke: cutStrokeColor,
          strokeWidth: cutLineWidth,
          strokeDashArray: strokeDash,
          selectable: false,
          evented: false
        })
        fc.add(rightLine)
      }

      for (let r = 1; r < tilingRows; r++) {
        const y = r * cellH

        const topLine = new Line([0, y - overlapPx / 2, canvasWidth, y - overlapPx / 2], {
          stroke: cutStrokeColor,
          strokeWidth: cutLineWidth,
          strokeDashArray: strokeDash,
          selectable: false,
          evented: false
        })
        fc.add(topLine)

        const bottomLine = new Line([0, y + overlapPx / 2, canvasWidth, y + overlapPx / 2], {
          stroke: cutStrokeColor,
          strokeWidth: cutLineWidth,
          strokeDashArray: strokeDash,
          selectable: false,
          evented: false
        })
        fc.add(bottomLine)
      }
    }
  }, [tilingRows, tilingCols, overlap, showGuides, canvasWidth, canvasHeight, cellW, cellH, CANVAS_SCALE])

  // Initialize Fabric.js Canvas
  useEffect(() => {
    if (!canvasRef.current) return

    // Gumawa ng bagong malinis na instance
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
  }, [paperSize, orientation, tilingRows, tilingCols, activeTab]) // Mag-recreate lang kapag nagbago ang size o settings

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

    if (activeTab === 'tiling') {
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
            // Force Image Element Clean-up
            canvas.clear()
            canvas.backgroundColor = '#ffffff'
            if (typeof (canvas as any).invalidateState === 'function') {
              (canvas as any).invalidateState()
            }

            // Re-hydration Guard: I-restore ang default scaling para pumasok sa bagong aspect ratio ng canvas
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
    } else {
      // ID Picture Mode
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

      if (fitCols === 0 || fitRows === 0) {
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

      const gridW = fitCols * idWidthPx + (fitCols - 1) * spacingPx
      const gridH = fitRows * idHeightPx + (fitRows - 1) * spacingPx
      const startX = marginPx + (usableW - gridW) / 2
      const startY = marginPx + (usableH - gridH) / 2

      FabricImage.fromURL(uploadedImage).then((oImg) => {
        const imgElement = oImg.getElement() as HTMLImageElement
        const targetAspectRatio = idWidthPx / idHeightPx
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

        for (let c = 0; c < fitCols; c++) {
          for (let r = 0; r < fitRows; r++) {
            const tx = startX + c * (idWidthPx + spacingPx)
            const ty = startY + r * (idHeightPx + spacingPx)

            const idImg = new FabricImage(imgElement, {
              left: tx,
              top: ty,
              width: sWidth,
              height: sHeight,
              cropX: sx,
              cropY: sy,
              scaleX: idWidthPx / sWidth,
              scaleY: idHeightPx / sHeight,
              selectable: false,
              evented: false,
              stroke: '#cccccc',
              strokeWidth: 1
            })
            canvas.add(idImg)
          }
        }
        canvas.requestRenderAll()
      }).catch((err) => {
        console.error('Failed to draw ID pictures in Fabric:', err)
      })
    }
  }, [
    activeTab,
    uploadedImage,
    tilingRows,
    tilingCols,
    overlap,
    showGuides,
    canvasWidth,
    canvasHeight,
    cellW,
    cellH,
    idSize,
    idSpacing,
    fitCols,
    fitRows,
    idWidthPx,
    idHeightPx,
    spacingPx,
    marginPx,
    usableW,
    usableH,
    drawGridOverlay,
    fabricCanvasRef.current
  ])

  // PDF Generator Engine at 300 DPI (1mm = 11.811px)
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

    // Load original source image in offscreen canvas
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const tempImg = new Image()
      tempImg.onload = () => resolve(tempImg)
      tempImg.onerror = (err) => reject(err)
      tempImg.src = uploadedImage
    })

    if (activeTab === 'tiling') {
      const cellW = canvasWidth / tilingCols
      const cellH = canvasHeight / tilingRows

      // Scale factors mapping grid cells to A4 paper dimensions at 300 DPI
      const kX = (paperWidthMM * ratio300) / cellW
      const kY = (paperHeightMM * ratio300) / cellH

      // Retrieve image transforms from fabric
      const left = fabricImageRef.current?.left ?? (canvasWidth / 2)
      const top = fabricImageRef.current?.top ?? (canvasHeight / 2)
      const scaleX = fabricImageRef.current?.scaleX ?? 1
      const scaleY = fabricImageRef.current?.scaleY ?? 1
      const angle = fabricImageRef.current?.angle ?? 0

      for (let r = 0; r < tilingRows; r++) {
        for (let c = 0; c < tilingCols; c++) {
          // Calculate margins dynamically based on location in grid and showGuides
          const marginLeft = (showGuides && c > 0) ? overlap : 0
          const marginRight = (showGuides && c < tilingCols - 1) ? overlap : 0
          const marginTop = (showGuides && r > 0) ? overlap : 0
          const marginBottom = (showGuides && r < tilingRows - 1) ? overlap : 0

          const pageW_MM = paperWidthMM + marginLeft + marginRight
          const pageH_MM = paperHeightMM + marginTop + marginBottom

          // Add a new page with the dynamic dimensions
          pdf.addPage([pageW_MM, pageH_MM], orientation)

          const canvas = document.createElement('canvas')
          canvas.width = pdfWidthPx
          canvas.height = pdfHeightPx
          const ctx = canvas.getContext('2d')
          if (!ctx) continue

          // Clear offscreen canvas to white
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, pdfWidthPx, pdfHeightPx)

          // Distance from cell top-left to image center on screen canvas
          const dx = left - c * cellW
          const dy = top - r * cellH

          // Target translation and scale mapped to 300 DPI offscreen coordinates
          const targetX = dx * kX
          const targetY = dy * kY
          const targetScaleX = scaleX * kX
          const targetScaleY = scaleY * kY
          const angleRad = (angle * Math.PI) / 180

          ctx.save()
          ctx.translate(targetX, targetY)
          ctx.rotate(angleRad)
          ctx.scale(targetScaleX, targetScaleY)

          // Draw subject image centered
          ctx.drawImage(img, -img.width / 2, -img.height / 2, img.width, img.height)
          ctx.restore()

          const pageDataUrl = canvas.toDataURL('image/jpeg', 0.95)
          pdf.addImage(pageDataUrl, 'JPEG', marginLeft, marginTop, paperWidthMM, paperHeightMM, undefined, 'FAST')

          // Add vector Cut and Paste margins directly on the PDF page in the white margin areas
          if (showGuides && overlap > 0) {
            // Horizontal guides (Columns)
            // LEFT Edge Guide (Cut or Paste)
            if (c > 0) {
              const isEvenCol = c % 2 === 0
              const marginText = isEvenCol ? 'PASTE HERE >>' : '- CUT HERE -'

              pdf.setDrawColor(153, 153, 153)
              pdf.setLineWidth(0.2)
              if (typeof (pdf as any).setLineDashPattern === 'function') {
                (pdf as any).setLineDashPattern([2, 2], 0)
              } else if (typeof (pdf as any).setLineDash === 'function') {
                (pdf as any).setLineDash([2, 2], 0)
              }
              pdf.line(marginLeft, 0, marginLeft, pageH_MM)
              if (typeof (pdf as any).setLineDashPattern === 'function') {
                (pdf as any).setLineDashPattern([], 0)
              } else if (typeof (pdf as any).setLineDash === 'function') {
                (pdf as any).setLineDash([], 0)
              }

              pdf.setTextColor(153, 153, 153)
              pdf.setFontSize(8)
              pdf.text(marginText, marginLeft / 2, pageH_MM / 2, { angle: 90, align: 'center' })
            }

            // RIGHT Edge Guide (Cut or Paste)
            if (c < tilingCols - 1) {
              const isEvenCol = c % 2 === 0
              const marginText = isEvenCol ? 'PASTE HERE >>' : '- CUT HERE -'

              pdf.setDrawColor(153, 153, 153)
              pdf.setLineWidth(0.2)
              if (typeof (pdf as any).setLineDashPattern === 'function') {
                (pdf as any).setLineDashPattern([2, 2], 0)
              } else if (typeof (pdf as any).setLineDash === 'function') {
                (pdf as any).setLineDash([2, 2], 0)
              }
              pdf.line(marginLeft + paperWidthMM, 0, marginLeft + paperWidthMM, pageH_MM)
              if (typeof (pdf as any).setLineDashPattern === 'function') {
                (pdf as any).setLineDashPattern([], 0)
              } else if (typeof (pdf as any).setLineDash === 'function') {
                (pdf as any).setLineDash([], 0)
              }

              pdf.setTextColor(153, 153, 153)
              pdf.setFontSize(8)
              pdf.text(marginText, marginLeft + paperWidthMM + marginRight / 2, pageH_MM / 2, { angle: 270, align: 'center' })
            }

            // Vertical guides (Rows)
            // TOP Edge Guide (Cut or Paste)
            if (r > 0) {
              const isEvenRow = r % 2 === 0
              const marginText = isEvenRow ? 'PASTE HERE >>' : '- CUT HERE -'

              pdf.setDrawColor(153, 153, 153)
              pdf.setLineWidth(0.2)
              if (typeof (pdf as any).setLineDashPattern === 'function') {
                (pdf as any).setLineDashPattern([2, 2], 0)
              } else if (typeof (pdf as any).setLineDash === 'function') {
                (pdf as any).setLineDash([2, 2], 0)
              }
              pdf.line(0, marginTop, pageW_MM, marginTop)
              if (typeof (pdf as any).setLineDashPattern === 'function') {
                (pdf as any).setLineDashPattern([], 0)
              } else if (typeof (pdf as any).setLineDash === 'function') {
                (pdf as any).setLineDash([], 0)
              }

              pdf.setTextColor(153, 153, 153)
              pdf.setFontSize(8)
              pdf.text(marginText, pageW_MM / 2, marginTop / 2 + 1.5, { align: 'center' })
            }

            // BOTTOM Edge Guide (Cut or Paste)
            if (r < tilingRows - 1) {
              const isEvenRow = r % 2 === 0
              const marginText = isEvenRow ? 'PASTE HERE >>' : '- CUT HERE -'

              pdf.setDrawColor(153, 153, 153)
              pdf.setLineWidth(0.2)
              if (typeof (pdf as any).setLineDashPattern === 'function') {
                (pdf as any).setLineDashPattern([2, 2], 0)
              } else if (typeof (pdf as any).setLineDash === 'function') {
                (pdf as any).setLineDash([2, 2], 0)
              }
              pdf.line(0, marginTop + paperHeightMM, pageW_MM, marginTop + paperHeightMM)
              if (typeof (pdf as any).setLineDashPattern === 'function') {
                (pdf as any).setLineDashPattern([], 0)
              } else if (typeof (pdf as any).setLineDash === 'function') {
                (pdf as any).setLineDash([], 0)
              }

              pdf.setTextColor(153, 153, 153)
              pdf.setFontSize(8)
              pdf.text(marginText, pageW_MM / 2, marginTop + paperHeightMM + marginBottom / 2 + 1.5, { align: 'center' })
            }
          }
        }
      }
      // Delete the default initial blank page
      pdf.deletePage(1)
    } else {
      // ID Picture Mode
      const canvas = document.createElement('canvas')
      canvas.width = pdfWidthPx
      canvas.height = pdfHeightPx
      const ctx = canvas.getContext('2d')
      if (!ctx) return null

      // Fill canvas background
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, pdfWidthPx, pdfHeightPx)

      const marginPx = 5 * ratio300
      const spacingPx = idSpacing * ratio300
      const idWidthPx = idW * ratio300
      const idHeightPx = idH * ratio300

      const usableW = pdfWidthPx - (2 * marginPx)
      const usableH = pdfHeightPx - (2 * marginPx)

      const fitCols = Math.max(0, Math.floor((usableW + spacingPx) / (idWidthPx + spacingPx)))
      const fitRows = Math.max(0, Math.floor((usableH + spacingPx) / (idHeightPx + spacingPx)))

      if (fitCols > 0 && fitRows > 0) {
        const gridW = fitCols * idWidthPx + (fitCols - 1) * spacingPx
        const gridH = fitRows * idHeightPx + (fitRows - 1) * spacingPx
        const startX = marginPx + (usableW - gridW) / 2
        const startY = marginPx + (usableH - gridH) / 2

        const targetAspectRatio = idW / idH
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
        for (let c = 0; c < fitCols; c++) {
          for (let r = 0; r < fitRows; r++) {
            const tx = startX + c * (idWidthPx + spacingPx)
            const ty = startY + r * (idHeightPx + spacingPx)

            ctx.drawImage(img, sx, sy, sWidth, sHeight, tx, ty, idWidthPx, idHeightPx)

            // Draw a thin light-gray cutting border (1px #CCCCCC)
            ctx.strokeStyle = '#cccccc'
            ctx.lineWidth = 1
            ctx.strokeRect(tx, ty, idWidthPx, idHeightPx)
          }
        }
      }

      const pageDataUrl = canvas.toDataURL('image/jpeg', 0.95)
      pdf.addImage(pageDataUrl, 'JPEG', 0, 0, paperWidthMM, paperHeightMM, undefined, 'FAST')
    }

    return pdf
  }

  // Action Handlers
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

  return (
    <div className="app-container">
      {/* Sidebar Panel */}
      <aside className="sidebar">
        <header className="sidebar-header">
          <div className="logo-container">
            <span className="logo-icon">📐</span>
            <h1 className="logo-text">PrintFlow</h1>
          </div>
          <span className="badge">v1.3.0</span>
        </header>

        {/* Tab Switcher */}
        <div className="tab-switcher">
          <button 
            className={`tab-btn ${activeTab === 'tiling' ? 'active' : ''}`}
            onClick={() => setActiveTab('tiling')}
          >
            Tiling Mode
          </button>
          <button 
            className={`tab-btn ${activeTab === 'id-picture' ? 'active' : ''}`}
            onClick={() => setActiveTab('id-picture')}
          >
            ID Picture
          </button>
        </div>

        <div className="sidebar-scrollable">
          {/* Paper Size Settings */}
          <section className="sidebar-section">
            <h2 className="section-title">Paper Setup</h2>
            <div className="control-group card">
              <div className="control-field">
                <label htmlFor="paper-size">Paper Size</label>
                <select
                  id="paper-size"
                  value={paperSize}
                  onChange={(e) => setPaperSize(e.target.value)}
                  className="form-select"
                >
                  {Object.entries(PAPER_SIZES).map(([key, item]) => (
                    <option key={key} value={key}>{item.label}</option>
                  ))}
                </select>
              </div>

              <div className="control-field">
                <label htmlFor="orientation">Orientation</label>
                <select
                  id="orientation"
                  value={orientation}
                  onChange={(e) => setOrientation(e.target.value as 'portrait' | 'landscape')}
                  className="form-select"
                >
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                </select>
              </div>
            </div>
          </section>

          {/* Source Images Area */}
          <section className="sidebar-section">
            <h2 className="section-title">Source Images</h2>
            <div 
              {...getRootProps()} 
              className={`dropzone ${isDragActive ? 'active' : ''} ${uploadedImage ? 'has-image' : ''}`}
            >
              <input {...getInputProps()} />
              <div className="dropzone-content">
                <span className="dropzone-icon">📥</span>
                {isDragActive ? (
                  <p className="dropzone-text">Drop the image here...</p>
                ) : (
                  <p className="dropzone-text">
                    Drag & drop an image here, or <span className="highlight">browse</span>
                  </p>
                )}
                <p className="dropzone-subtext">Supports PNG, JPG, WEBP</p>
              </div>
            </div>
          </section>

          {/* Image Queue Section */}
          <section className="sidebar-section">
            <h2 className="section-title">Image Queue</h2>
            <div className="image-queue">
              {uploadedImage ? (
                <div className="queue-item card">
                  <div className="thumbnail-wrapper">
                    <img src={uploadedImage} alt="Thumbnail preview" className="thumbnail-preview" />
                  </div>
                  <div className="queue-item-details">
                    <span className="queue-item-name" title={uploadedFileName || 'Uploaded Image'}>
                      {uploadedFileName || 'Uploaded Image'}
                    </span>
                    <span className="queue-item-size">{uploadedFileSize || ''}</span>
                  </div>
                  <button className="btn-icon btn-danger" onClick={handleClearImage} title="Remove image">
                    ✕
                  </button>
                </div>
              ) : (
                <div className="empty-queue card">
                  <span className="empty-icon">📭</span>
                  <p className="empty-text">No images loaded yet</p>
                </div>
              )}
            </div>
          </section>

          {/* Mode-Specific Parameters */}
          {activeTab === 'tiling' ? (
            <section className="sidebar-section">
              <h2 className="section-title">Tiling Parameters</h2>
              <div className="control-group card">
                <div className="control-field">
                  <div className="control-label-row">
                    <label htmlFor="tiling-rows">Rows</label>
                    <span className="control-value">{tilingRows}</span>
                  </div>
                  <div className="input-with-buttons">
                    <button 
                      disabled={tilingRows <= 1} 
                      onClick={() => setTilingRows(r => Math.max(1, r - 1))}
                      type="button"
                    >
                      -
                    </button>
                    <input
                      type="range"
                      id="tiling-rows"
                      min="1"
                      max="10"
                      value={tilingRows}
                      onChange={(e) => setTilingRows(parseInt(e.target.value) || 1)}
                    />
                    <button 
                      disabled={tilingRows >= 10} 
                      onClick={() => setTilingRows(r => Math.min(10, r + 1))}
                      type="button"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="control-field">
                  <div className="control-label-row">
                    <label htmlFor="tiling-cols">Columns</label>
                    <span className="control-value">{tilingCols}</span>
                  </div>
                  <div className="input-with-buttons">
                    <button 
                      disabled={tilingCols <= 1} 
                      onClick={() => setTilingCols(c => Math.max(1, c - 1))}
                      type="button"
                    >
                      -
                    </button>
                    <input
                      type="range"
                      id="tiling-cols"
                      min="1"
                      max="10"
                      value={tilingCols}
                      onChange={(e) => setTilingCols(parseInt(e.target.value) || 1)}
                    />
                    <button 
                      disabled={tilingCols >= 10} 
                      onClick={() => setTilingCols(c => Math.min(10, c + 1))}
                      type="button"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="control-field">
                  <div className="control-label-row">
                    <label htmlFor="overlap">Overlap</label>
                    <span className="control-value">{overlap} mm</span>
                  </div>
                  <div className="input-slider-wrapper">
                    <input
                      type="range"
                      id="overlap"
                      min="0"
                      max="50"
                      step="1"
                      value={overlap}
                      onChange={(e) => setOverlap(parseInt(e.target.value) || 0)}
                    />
                    <div className="slider-ticks">
                      <span>0mm</span>
                      <span>25mm</span>
                      <span>50mm</span>
                    </div>
                  </div>
                </div>

                <div className="control-field checkbox-field">
                  <label htmlFor="show-guides" className="checkbox-label">
                    <input
                      type="checkbox"
                      id="show-guides"
                      checked={showGuides}
                      onChange={(e) => setShowGuides(e.target.checked)}
                    />
                    <span>Add Cut/Paste Lines</span>
                  </label>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mt-3 text-xs text-amber-800">
                <div className="flex items-start gap-1">
                  <span className="text-sm">💡</span>
                  <div>
                    <strong className="font-semibold block mb-1">Paano ito gumagana?</strong>
                    <p className="leading-relaxed">
                      Kapag naka-on ang Cut/Paste guides, awtomatikong maglalaan ang system ng halinhinang dugtungan (Glue Margin). Ang mga pahinang may 'PASTE HERE ▶' ang papahiran ng pandikit, habang ang katabing may '✂ CUT HERE' ang liyabisan o gupitin sa guhit bago ipatong.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          ) : (
            <section className="sidebar-section">
              <h2 className="section-title">ID Parameters</h2>
              <div className="control-group card">
                <div className="control-field">
                  <label htmlFor="id-size">ID Size</label>
                  <select
                    id="id-size"
                    value={idSize}
                    onChange={(e) => setIdSize(e.target.value as '1x1' | '2x2' | 'passport')}
                    className="form-select"
                  >
                    {Object.entries(ID_SIZES).map(([key, item]) => (
                      <option key={key} value={key}>{item.label}</option>
                    ))}
                  </select>
                </div>

                <div className="control-field">
                  <div className="control-label-row">
                    <label htmlFor="id-spacing">Row Spacing</label>
                    <span className="control-value">{idSpacing} mm</span>
                  </div>
                  <div className="input-slider-wrapper">
                    <input
                      type="range"
                      id="id-spacing"
                      min="0"
                      max="20"
                      step="0.5"
                      value={idSpacing}
                      onChange={(e) => setIdSpacing(parseFloat(e.target.value) || 0)}
                    />
                    <div className="slider-ticks">
                      <span>0mm</span>
                      <span>10mm</span>
                      <span>20mm</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      </aside>

      {/* Main Workspace Canvas Area */}
      <main className="workspace">
        <header className="workspace-header">
          <div className="workspace-title-area">
            <h2>
              Layout Canvas ({activeTab === 'tiling' ? 'Tiling Mode' : 'ID Picture Mode'})
            </h2>
            <p className="workspace-subtitle">
              {activeTab === 'tiling' 
                ? 'Visual grid overlay of the print pages with overlap margins (Drag/Scale/Rotate image below grid)'
                : `Auto-fitted layout grid inside paper margin boundaries`
              }
            </p>
          </div>
          <div className="workspace-controls-header">
            {uploadedImage && (
              <div className="canvas-stats">
                <div className="stat-pill">
                  <span className="stat-label">Paper:</span>
                  <span className="stat-value">{paperWidthMM} × {paperHeightMM} mm</span>
                </div>
                {activeTab === 'tiling' ? (
                  <>
                    <div className="stat-pill">
                      <span className="stat-label">Grid:</span>
                      <span className="stat-value">{tilingRows} × {tilingCols}</span>
                    </div>
                    <div className="stat-pill">
                      <span className="stat-label">Tiles:</span>
                      <span className="stat-value">{tilingRows * tilingCols}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="stat-pill">
                      <span className="stat-label">ID Size:</span>
                      <span className="stat-value">{idDef.width} × {idDef.height} mm</span>
                    </div>
                    <div className="stat-pill">
                      <span className="stat-label">Photos Fitted:</span>
                      <span className="stat-value">{totalFitCount}</span>
                    </div>
                  </>
                )}
              </div>
            )}
            
            {uploadedImage && (
              <div className="workspace-actions">
                <button 
                  onClick={handleSavePDF} 
                  className="action-btn btn-pdf"
                  disabled={isExporting}
                >
                  {isExporting ? 'Exporting...' : 'Save as PDF'}
                </button>
                <button 
                  onClick={handlePrintNow} 
                  className="action-btn btn-print"
                  disabled={isExporting}
                >
                  {isExporting ? 'Exporting...' : 'Print Now'}
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
              onClick={() => setZoom(z => Math.max(0.25, z - 0.1))} 
              className="zoom-btn" 
              title="Zoom Out"
              type="button"
            >
              -
            </button>
            <span className="zoom-label">{Math.round(zoom * 100)}%</span>
            <button 
              onClick={() => setZoom(z => Math.min(2.0, z + 0.1))} 
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
      </main>
    </div>
  )
}

export default App
