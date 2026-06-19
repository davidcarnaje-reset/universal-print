import React, { useState } from 'react'
import { IDSidebar } from './IDSidebar'
import { IDWorkspace } from './IDWorkspace'
import { PAPER_SIZES } from '../../utils/paperSizes'

interface IDModuleProps {
  activeTab: 'tiling' | 'id-picture'
  setActiveTab: (tab: 'tiling' | 'id-picture') => void
}

export const IDModule: React.FC<IDModuleProps> = ({
  activeTab,
  setActiveTab
}) => {
  // Sizing & Sizing States
  const [paperSize, setPaperSize] = useState<string>('letter')
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait')
  const [zoom, setZoom] = useState<number>(1.0)

  // Upload States
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
  const [uploadedFileSize, setUploadedFileSize] = useState<string | null>(null)

  // ID Picture States
  const [idSize, setIdSize] = useState<'1x1' | '2x2' | 'passport'>('2x2')
  const [idSpacing, setIdSpacing] = useState<number>(2)
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false)

  // Sizing details helper
  const paperDef = PAPER_SIZES.find(p => p.id === paperSize) || PAPER_SIZES[0]
  const paperWidthMM = orientation === 'landscape' ? paperDef.height : paperDef.width
  const paperHeightMM = orientation === 'landscape' ? paperDef.width : paperDef.height

  const handleClearImage = () => {
    setUploadedImage(null)
    setUploadedFileName(null)
    setUploadedFileSize(null)
  }

  return (
    <>
      <IDSidebar
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
        idSize={idSize}
        setIdSize={setIdSize}
        idSpacing={idSpacing}
        setIdSpacing={setIdSpacing}
      />

      <IDWorkspace
        paperWidthMM={paperWidthMM}
        paperHeightMM={paperHeightMM}
        orientation={orientation}
        zoom={zoom}
        setZoom={setZoom}
        uploadedImage={uploadedImage}
        idSize={idSize}
        idSpacing={idSpacing}
        isPreviewOpen={isPreviewOpen}
        setIsPreviewOpen={setIsPreviewOpen}
      />
    </>
  )
}
