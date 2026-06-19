import React, { useState, useEffect, useRef } from 'react'
import { TilingSidebar } from './TilingSidebar'
import { TilingWorkspace } from './TilingWorkspace'
import { PAPER_SIZES } from '../../utils/paperSizes'

interface TilingModuleProps {
  activeTab: 'tiling' | 'id-picture'
  setActiveTab: (tab: 'tiling' | 'id-picture') => void
}

export const TilingModule: React.FC<TilingModuleProps> = ({
  activeTab,
  setActiveTab
}) => {
  // Sizing & Sizing States
  const [paperSize, setPaperSize] = useState<string>('letter')
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait')
  const [zoom, setZoom] = useState<number>(0.7)

  // Upload States
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
  const [uploadedFileSize, setUploadedFileSize] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('test') === 'true') {
      setUploadedImage('/printflow-logo.png')
      setUploadedFileName('printflow-logo.png')
      setUploadedFileSize('0.05 MB')
    }
  }, [])

  // Tiling States
  const [tilingRows, setTilingRows] = useState<number>(2)
  const [tilingCols, setTilingCols] = useState<number>(2)
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false)
  const [overlap, setOverlap] = useState<number>(15)
  const [showMargin, setShowMargin] = useState<boolean>(true)
  const [tilingMode, setTilingMode] = useState<'bleed' | 'shrink'>('bleed')

  // Sizing details helper
  const paperDef = PAPER_SIZES.find(p => p.id === paperSize) || PAPER_SIZES[0]
  const paperWidthMM = orientation === 'landscape' ? paperDef.height : paperDef.width
  const paperHeightMM = orientation === 'landscape' ? paperDef.width : paperDef.height

  // Reference to keep track of the latest cols and rows without triggering dependencies
  const tilingColsRef = useRef(tilingCols)
  const tilingRowsRef = useRef(tilingRows)
  tilingColsRef.current = tilingCols
  tilingRowsRef.current = tilingRows

  // Reference to keep track of the previous dimensions for scaling
  const prevPaperDimRef = useRef<{ width: number; height: number }>({
    width: 215.9, // Default Letter width in mm
    height: 279.4 // Default Letter height in mm
  })

  // Dynamic Grid Recalculation Effect
  useEffect(() => {
    const prev = prevPaperDimRef.current
    if (prev.width !== paperWidthMM || prev.height !== paperHeightMM) {
      // Calculate the previous overall canvas physical dimension
      const prevTotalWidth = tilingColsRef.current * prev.width
      const prevTotalHeight = tilingRowsRef.current * prev.height

      // Estimate the new grid divisions (using Math.ceil to avoid clipping the source poster)
      const newCols = Math.max(1, Math.ceil(prevTotalWidth / paperWidthMM))
      const newRows = Math.max(1, Math.ceil(prevTotalHeight / paperHeightMM))

      setTilingCols(newCols)
      setTilingRows(newRows)

      // Update reference to the new size
      prevPaperDimRef.current = { width: paperWidthMM, height: paperHeightMM }
    }
  }, [paperWidthMM, paperHeightMM])

  const handleClearImage = () => {
    setUploadedImage(null)
    setUploadedFileName(null)
    setUploadedFileSize(null)
  }

  return (
    <>
      <TilingSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        paperSize={paperSize}
        setPaperSize={setPaperSize}
        orientation={orientation}
        setOrientation={setOrientation}
        uploadedImage={uploadedImage}
        setUploadedImage={setUploadedImage}
        uploadedFileName={uploadedFileName}
        setUploadedFileName={setUploadedFileName}
        uploadedFileSize={uploadedFileSize}
        setUploadedFileSize={setUploadedFileSize}
        onClearImage={handleClearImage}
        tilingRows={tilingRows}
        setTilingRows={setTilingRows}
        tilingCols={tilingCols}
        setTilingCols={setTilingCols}
        tilingMode={tilingMode}
        setTilingMode={setTilingMode}
      />

      <TilingWorkspace
        paperWidthMM={paperWidthMM}
        paperHeightMM={paperHeightMM}
        orientation={orientation}
        zoom={zoom}
        setZoom={setZoom}
        uploadedImage={uploadedImage}
        tilingRows={tilingRows}
        tilingCols={tilingCols}
        isPreviewOpen={isPreviewOpen}
        setIsPreviewOpen={setIsPreviewOpen}
        overlap={overlap}
        setOverlap={setOverlap}
        showMargin={showMargin}
        setShowMargin={setShowMargin}
        tilingMode={tilingMode}
        setTilingMode={setTilingMode}
      />
    </>
  )
}
