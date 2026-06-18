import React, { useState } from 'react'
import { TilingSidebar } from './TilingSidebar'
import { TilingWorkspace } from './TilingWorkspace'

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

interface TilingModuleProps {
  activeTab: 'tiling' | 'id-picture'
  setActiveTab: (tab: 'tiling' | 'id-picture') => void
}

export const TilingModule: React.FC<TilingModuleProps> = ({
  activeTab,
  setActiveTab
}) => {
  // Sizing & Sizing States
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
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false)

  // Sizing details helper
  const paperDef = PAPER_SIZES[paperSize] || PAPER_SIZES["A4"]
  const paperWidthMM = orientation === 'landscape' ? paperDef.height : paperDef.width
  const paperHeightMM = orientation === 'landscape' ? paperDef.width : paperDef.height

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
      />
    </>
  )
}
