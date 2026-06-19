// Shared ID size definitions used by IDSidebar, IDWorkspace, and IDPreviewModal

export type IdSizeKey = '1x1' | '2x2' | 'passport' | 'package_3x3' | 'custom_mix'

export interface IdSizeDef {
  width: number
  height: number
  label: string
  isPackage?: boolean
  isCustomMix?: boolean
}

export const ID_SIZES: Record<IdSizeKey, IdSizeDef> = {
  '1x1':    { width: 25.4, height: 25.4, label: '1" x 1" (25.4 × 25.4 mm)' },
  '2x2':    { width: 50.8, height: 50.8, label: '2" x 2" (50.8 × 50.8 mm)' },
  'passport': { width: 35.0, height: 45.0, label: 'Passport (35 × 45 mm)' },
  'package_3x3': { width: 0, height: 0, label: '3×3 Combo Package (9 Pieces Mix)', isPackage: true },
  'custom_mix':  { width: 0, height: 0, label: '[Custom] Combined Mixed Sizes...', isCustomMix: true }
}

// The 3×3 combo package is defined as a fixed arrangement:
// 1× 2x2, 4× passport, 4× 1x1 = 9 pieces total
export const PACKAGE_3X3_ITEMS = [
  { sizeKey: '2x2' as IdSizeKey, count: 1 },
  { sizeKey: 'passport' as IdSizeKey, count: 4 },
  { sizeKey: '1x1' as IdSizeKey, count: 4 }
]

export interface MixedQuantities {
  oneByOne: number
  twoByTwo: number
  passport: number
}

export const DEFAULT_MIXED_QUANTITIES: MixedQuantities = {
  oneByOne: 4,
  twoByTwo: 2,
  passport: 2
}

// Placement item for the auto-packer
export interface PlacedItem {
  x: number    // mm from left
  y: number    // mm from top
  w: number    // width in mm
  h: number    // height in mm
  sizeLabel: string
}

/**
 * Auto-packer: arranges mixed sizes onto a paper sheet using a simple
 * shelf-based bin packing algorithm. Places larger items first, then fills
 * remaining space with smaller ones.
 */
export function calculateCustomMixLayout(
  paperW: number,
  paperH: number,
  safetyMargin: number,
  quantities: MixedQuantities,
  spacing: number
): PlacedItem[] {
  const usableW = paperW - 2 * safetyMargin
  const usableH = paperH - 2 * safetyMargin

  // Build item list sorted by area (largest first)
  const items: { w: number; h: number; label: string }[] = []

  for (let i = 0; i < quantities.twoByTwo; i++) {
    items.push({ w: 50.8, h: 50.8, label: '2×2' })
  }
  for (let i = 0; i < quantities.passport; i++) {
    items.push({ w: 35, h: 45, label: 'Passport' })
  }
  for (let i = 0; i < quantities.oneByOne; i++) {
    items.push({ w: 25.4, h: 25.4, label: '1×1' })
  }

  // Simple shelf-based packing
  const placed: PlacedItem[] = []
  let cursorY = 0
  let cursorX = 0
  let shelfHeight = 0

  for (const item of items) {
    // Check if item fits in current row
    if (cursorX + item.w > usableW) {
      // Move to next shelf
      cursorX = 0
      cursorY += shelfHeight + spacing
      shelfHeight = 0
    }

    // Check if item fits vertically
    if (cursorY + item.h > usableH) {
      break // No more room on this page
    }

    placed.push({
      x: safetyMargin + cursorX,
      y: safetyMargin + cursorY,
      w: item.w,
      h: item.h,
      sizeLabel: item.label
    })

    cursorX += item.w + spacing
    shelfHeight = Math.max(shelfHeight, item.h)
  }

  return placed
}

/**
 * Computes the fixed 3×3 package layout placement.
 * Arranges: 1× 2x2, 4× passport, 4× 1x1 in a structured grid pattern.
 */
export function calculatePackage3x3Layout(
  paperW: number,
  paperH: number,
  safetyMargin: number,
  spacing: number
): PlacedItem[] {
  const quantities: MixedQuantities = {
    twoByTwo: 1,
    passport: 4,
    oneByOne: 4
  }
  return calculateCustomMixLayout(paperW, paperH, safetyMargin, quantities, spacing)
}
