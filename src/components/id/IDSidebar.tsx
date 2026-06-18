/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'

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
  "3x3": { width: 76.2, height: 76.2, label: "3\" x 3\" (76.2 x 76.2 mm) (Visa)" },
  "passport": { width: 35.0, height: 45.0, label: "Passport (35 x 45 mm)" },
  "custom": { width: 0, height: 0, label: "Custom (Mixed Layout)" }
}

const validateMixedLayoutCapacity = (
  paperSize: string,
  copiesConfig: Record<'1x1' | '2x2' | '3x3', number>,
  idSpacing: number
): { valid: boolean; requestedArea: number; maxUsableArea: number } => {
  const paperDef = PAPER_SIZES[paperSize] || PAPER_SIZES["A4"]
  const maxUsableArea = paperDef.width * paperDef.height

  const area1x1 = 25.4 * 25.4
  const area2x2 = 50.8 * 50.8
  const area3x3 = 76.2 * 76.2

  const spacingBuffers = 
    copiesConfig['1x1'] * (25.4 * idSpacing * 2 + idSpacing * idSpacing) +
    copiesConfig['2x2'] * (50.8 * idSpacing * 2 + idSpacing * idSpacing) +
    copiesConfig['3x3'] * (76.2 * idSpacing * 2 + idSpacing * idSpacing)

  const requestedArea = 
    (copiesConfig['1x1'] * area1x1) + 
    (copiesConfig['2x2'] * area2x2) + 
    (copiesConfig['3x3'] * area3x3) + 
    spacingBuffers

  return {
    valid: requestedArea <= maxUsableArea,
    requestedArea,
    maxUsableArea
  }
}

interface IDSidebarProps {
  activeTab: 'tiling' | 'id-picture'
  setActiveTab: (tab: 'tiling' | 'id-picture') => void
  paperSize: string
  setPaperSize: (size: string) => void
  orientation: 'portrait' | 'landscape'
  setOrientation: (orientation: 'portrait' | 'landscape') => void
  uploadedImage: string | null
  setUploadedImage: (img: string | null) => void
  uploadedFileName: string | null
  setUploadedFileName: (name: string | null) => void
  uploadedFileSize: string | null
  setUploadedFileSize: (size: string | null) => void
  onClearImage: () => void
  idSize: '1x1' | '2x2' | '3x3' | 'passport' | 'custom'
  setIdSize: (size: '1x1' | '2x2' | '3x3' | 'passport' | 'custom') => void
  idSpacing: number
  setIdSpacing: (spacing: number) => void
  customCopies: Record<'1x1' | '2x2' | '3x3', number>
  setCustomCopies: React.Dispatch<React.SetStateAction<Record<'1x1' | '2x2' | '3x3', number>>>
}

export const IDSidebar: React.FC<IDSidebarProps> = ({
  activeTab,
  setActiveTab,
  paperSize,
  setPaperSize,
  orientation,
  setOrientation,
  uploadedImage,
  setUploadedImage,
  uploadedFileName,
  setUploadedFileName,
  uploadedFileSize,
  setUploadedFileSize,
  onClearImage,
  idSize,
  setIdSize,
  idSpacing,
  setIdSpacing,
  customCopies,
  setCustomCopies
}) => {
  
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
  }, [setUploadedImage, setUploadedFileName, setUploadedFileSize])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': []
    },
    multiple: false
  })

  return (
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
                <button className="btn-icon btn-danger" onClick={onClearImage} title="Remove image">
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

        {/* ID Parameters Slider Controls */}
        <section className="sidebar-section">
          <h2 className="section-title">ID Parameters</h2>
          <div className="control-group card">
            <div className="control-field">
              <label htmlFor="id-size">ID Size</label>
              <select
                id="id-size"
                value={idSize}
                onChange={(e) => setIdSize(e.target.value as '1x1' | '2x2' | '3x3' | 'passport' | 'custom')}
                className="form-select"
              >
                {Object.entries(ID_SIZES).map(([key, item]) => (
                  <option key={key} value={key as any}>{item.label}</option>
                ))}
              </select>
            </div>

            {idSize === 'custom' && (
              <div className="custom-copies-matrix" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem', borderTop: '1px solid #23273a', paddingTop: '1rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Custom Mixed Copies</div>
                {(['1x1', '2x2', '3x3'] as const).map((key) => {
                  const currentVal = customCopies[key]
                  const isIncDisabled = !validateMixedLayoutCapacity(paperSize, { ...customCopies, [key]: currentVal + 1 }, idSpacing).valid

                  return (
                    <div key={key} className="control-field" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                      <label style={{ fontSize: '0.875rem', color: '#cbd5e1' }}>
                        {key === '1x1' ? '1" x 1"' : key === '2x2' ? '2" x 2"' : '3" x 3"'} Copies
                      </label>
                      <div className="input-with-buttons" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={() => setCustomCopies(prev => ({ ...prev, [key]: Math.max(0, prev[key] - 1) }))}
                          disabled={currentVal <= 0}
                          style={{
                            width: '28px',
                            height: '28px',
                            backgroundColor: '#23273a',
                            border: '1px solid #2e344e',
                            borderRadius: '4px',
                            color: '#cbd5e1',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          -
                        </button>
                        <span style={{ minWidth: '24px', textAlign: 'center', fontWeight: 'bold', fontSize: '0.9rem', color: '#f1f5f9' }}>{currentVal}</span>
                        <button
                          type="button"
                          onClick={() => setCustomCopies(prev => ({ ...prev, [key]: prev[key] + 1 }))}
                          disabled={isIncDisabled}
                          style={{
                            width: '28px',
                            height: '28px',
                            backgroundColor: isIncDisabled ? '#151824' : '#23273a',
                            border: '1px solid #2e344e',
                            borderRadius: '4px',
                            color: isIncDisabled ? '#475569' : '#cbd5e1',
                            cursor: isIncDisabled ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )
                })}
                {!validateMixedLayoutCapacity(paperSize, customCopies, idSpacing).valid && (
                  <div className="alert-box-warning" style={{
                    padding: '0.75rem 1rem',
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '8px',
                    color: '#fca5a5',
                    fontSize: '0.825rem',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginTop: '0.5rem'
                  }}>
                    <span>⚠️</span>
                    <span>Exceeded Sheet Printing Bounds: Current combination does not fit on this paper profile.</span>
                  </div>
                )}
              </div>
            )}

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
      </div>
    </aside>
  )
}
