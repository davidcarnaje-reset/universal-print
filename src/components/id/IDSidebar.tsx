/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { isNativeApp } from '../../utils/env'
import { PAPER_SIZES } from '../../utils/paperSizes'


const ID_SIZES = {
  "1x1": { width: 25.4, height: 25.4, label: "1\" x 1\" (25.4 x 25.4 mm)" },
  "2x2": { width: 50.8, height: 50.8, label: "2\" x 2\" (50.8 x 50.8 mm)" },
  "passport": { width: 35.0, height: 45.0, label: "Passport (35 x 45 mm)" }
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
  idSize: '1x1' | '2x2' | 'passport'
  setIdSize: (size: '1x1' | '2x2' | 'passport') => void
  idSpacing: number
  setIdSpacing: (spacing: number) => void
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
  setIdSpacing
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
            href="https://github.com/davidjosh/printflow/releases" 
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

        {/* ID Parameters Slider Controls */}
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
                  <option key={key} value={key as any}>{item.label}</option>
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
      </div>
    </aside>
  )
}
