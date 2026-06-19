/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { isNativeApp } from '../../utils/env'
import { PAPER_SIZES } from '../../utils/paperSizes'


interface TilingSidebarProps {
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
  tilingRows: number
  setTilingRows: (rows: number | ((prev: number) => number)) => void
  tilingCols: number
  setTilingCols: (cols: number | ((prev: number) => number)) => void
  tilingMode: 'bleed' | 'shrink'
  setTilingMode: (mode: 'bleed' | 'shrink') => void
}

export const TilingSidebar: React.FC<TilingSidebarProps> = ({
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
  tilingRows,
  setTilingRows,
  tilingCols,
  setTilingCols,
  tilingMode,
  setTilingMode
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
        {!isNativeApp && (
          <a
            href="https://github.com/davidcarnaje-reset/universal-print/releases/tag/1.3.0"
            target="_blank"
            rel="noopener noreferrer"
            className="download-desktop-card"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(79, 70, 229, 0.15))',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              borderRadius: '10px',
              padding: '0.75rem 1rem',
              color: '#a5b4fc',
              textDecoration: 'none',
              fontSize: '0.85rem',
              fontWeight: '600',
              textAlign: 'center',
              transition: 'all 0.2s ease',
              marginBottom: '-0.5rem'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.6)';
              e.currentTarget.style.boxShadow = '0 0 12px rgba(99, 102, 241, 0.25)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.3)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            📥 Download Desktop App
          </a>
        )}
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
                {PAPER_SIZES.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
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

        {/* Tiling Parameters Slider Controls */}
        <section className="sidebar-section">
          <h2 className="section-title">Tiling Parameters</h2>
          <div className="control-group card">
            <div className="control-field">
              <label htmlFor="tiling-mode">Tiling Mode</label>
              <select
                id="tiling-mode"
                value={tilingMode}
                onChange={(e) => setTilingMode(e.target.value as 'bleed' | 'shrink')}
                className="form-select"
              >
                <option value="bleed">Bleed Mode (Overlap)</option>
                <option value="shrink">Shrink Mode (Fit to Page)</option>
              </select>
            </div>

            <div className="control-field">
              <div className="control-label-row">
                <label htmlFor="tiling-rows">Rows</label>
                <span className="control-value">{tilingRows}</span>
              </div>
              <div className="input-with-buttons">
                <button
                  disabled={tilingRows <= 1}
                  onClick={() => setTilingRows(r => Math.max(1, typeof r === 'function' ? (r as any)(tilingRows) : r - 1))}
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
                  onClick={() => setTilingRows(r => Math.min(10, typeof r === 'function' ? (r as any)(tilingRows) : r + 1))}
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
                  onClick={() => setTilingCols(c => Math.max(1, typeof c === 'function' ? (c as any)(tilingCols) : c - 1))}
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
                  onClick={() => setTilingCols(c => Math.min(10, typeof c === 'function' ? (c as any)(tilingCols) : c + 1))}
                  type="button"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </aside>
  )
}
