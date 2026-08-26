export type CountryCode = 'AR' | 'UY' | 'CL' | 'MX' | 'CERAN';

export interface CountryInfo {
  code: CountryCode;
  name: string;
  flag: string;
  description: string;
  status: 'active' | 'pending';
  expectedRetailersCount: number;
}

export interface RetailerSpec {
  id: string;
  name: string;
  country: CountryCode;
  aliases: string[];
  width: number;
  height: number;
  aspectRatio: string;
  maxImages: number;
  allowedFormats: ('JPG' | 'JPEG' | 'PNG' | 'WEBP')[];
  maxFileSizeKB?: number;
  dpi?: number;
  requireVideo?: boolean;
  videoType?: 'any' | 'vertical_30s';
  mainWhiteBackground?: boolean;
  packshotCentering?: {
    minPackshotSize: number; // e.g. 750px
    fieldSize: number;       // e.g. 900px
  };
  sequenceRule?: string;
  specificRulesSummary?: string[];
}

export interface BulletItem {
  type: 'OK' | 'ERROR' | 'ADVERTENCIA' | 'INFO';
  message: string;
  fileName?: string;
}

export interface AnalyzedFile {
  name: string;
  relativePath: string;
  sizeBytes: number;
  sizeKB: number;
  extension: string;
  isImage: boolean;
  isVideo: boolean;
  width?: number;
  height?: number;
  aspectRatio?: string;
  dpi?: number;
  whiteBgRatio?: number;
  packshotBoundingSize?: number;
  videoDuration?: number;
  videoWidth?: number;
  videoHeight?: number;
  isVerticalVideo?: boolean;
  previewUrl?: string;
  fileObj?: File;
  errors: string[];
  warnings: string[];
  okNotes: string[];
}

export interface RetailerAnalysisResult {
  retailerSpec: RetailerSpec;
  matchedFolderName: string | null;
  files: AnalyzedFile[];
  imageCount: number;
  videoCount: number;
  hasErrors: boolean;
  hasWarnings: boolean;
  conformFilesCount: number;
  inconsistentFilesCount: number;
  bulletItems: BulletItem[];
}

export interface AnalysisReport {
  id: string;
  country: CountryCode;
  countryName: string;
  rootFolderName: string;
  analyzedDate: string;
  timestamp: number;
  retailers: RetailerAnalysisResult[];
  totalRetailersExpected: number;
  totalRetailersValidated: number;
  totalConformFiles: number;
  totalInconsistentFiles: number;
  rawTxtReport: string;
}
