export interface PaperDimension {
  id: string;
  name: string;
  width: number;
  height: number;
}

export const PAPER_SIZES: PaperDimension[] = [
  // --- Philippine Standards (Default & Localized) ---
  { id: 'letter', name: 'Letter (Short / 8.5" x 11")', width: 215.9, height: 279.4 },
  { id: 'long_ph', name: 'LONG PH (Foolscap / 8.5" x 13")', width: 215.9, height: 330.2 },
  { id: 'legal', name: 'Legal (US Legal / 8.5" x 14")', width: 215.9, height: 355.6 },

  // --- ISO A-Series Standard ---
  { id: 'a0', name: 'A0 (841 x 1189 mm)', width: 841.0, height: 1189.0 },
  { id: 'a1', name: 'A1 (594 x 841 mm)', width: 594.0, height: 841.0 },
  { id: 'a2', name: 'A2 (420 x 594 mm)', width: 420.0, height: 594.0 },
  { id: 'a3', name: 'A3 (297 x 420 mm)', width: 297.0, height: 420.0 },
  { id: 'a4', name: 'A4 (210 x 297 mm)', width: 210.0, height: 297.0 },
  { id: 'a5', name: 'A5 (148 x 210 mm)', width: 148.0, height: 210.0 },
  { id: 'a6', name: 'A6 (105 x 148 mm)', width: 105.0, height: 148.0 },

  // --- Standard Photo R-Series (Inches converted to mm) ---
  { id: '2r', name: '2R (2.5" x 3.5")', width: 63.5, height: 88.9 },
  { id: '3r', name: '3R (3.5" x 5")', width: 88.9, height: 127.0 },
  { id: '4r', name: '4R (4" x 6")', width: 101.6, height: 152.4 },
  { id: '5r', name: '5R (5" x 7")', width: 127.0, height: 177.8 },
  { id: '6r', name: '6R (6" x 8")', width: 152.4, height: 203.2 },
  { id: '8r', name: '8R (8" x 10")', width: 203.2, height: 254.0 }
];
