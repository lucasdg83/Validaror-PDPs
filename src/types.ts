export type CountryCode = 'AR' | 'UY' | 'CL' | 'MX' | 'CERAN' | 'ADAPTACIONES';

export interface CountryInfo {
  code: CountryCode;
  name: string;
  flag: string;
  description: string;
  status: 'active' | 'pending';
  expectedRetailersCount: number;
  isAdaptationModule?: boolean;
}

export interface RetailerSpec {
  id: string;
  name: string;
  country: CountryCode;
  aliases: string[];
  width: number;
  height: number;
  aspectRatio: string;
  minImages?: number;
  maxImages: number;
  isMinimumResolution?: boolean;
  allowedFormats: ('JPG' | 'JPEG' | 'PNG' | 'WEBP')[];
  maxFileSizeKB?: number;
  dpi?: number;
  requireVideo?: boolean;
  allowsVideo?: boolean;
  videoSpecs?: string;
  videoType?: 'any' | 'vertical_30s';
  mainWhiteBackground?: boolean;
  btfAllowed?: boolean;
  btfSpecs?: string;
  ldbRule?: string;
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

export interface AdaptationTask {
  id: string;
  type: 'resize' | 'translation' | 'element_removal' | 'general';
  title: string;
  description: string;
  targetFileName?: string;
  expectedDimensions?: string;
  expectedRatio?: string;
  originalText?: string;
  expectedTranslation?: string;
  elementToRemove?: string;
}

export interface AdaptationAmbiguityAlert {
  id: string;
  title: string;
  pmNoteText: string;
  reason: string;
  suggestedClarification: string;
  severity: 'high' | 'medium' | 'low';
}

export interface AdaptationItemResult {
  fileName: string;
  previewUrl?: string;
  width?: number;
  height?: number;
  aspectRatio?: string;
  status: 'OK' | 'ERROR' | 'AMBIGUOUS';
  tasksEvaluated: {
    taskType: 'resize' | 'translation' | 'element_removal' | 'general';
    description: string;
    passed: boolean;
    details: string;
  }[];
  errors: string[];
  warnings: string[];
  notes: string[];
}

export interface AdaptationReport {
  id: string;
  briefFileName: string;
  briefFileType: 'pdf' | 'pptx' | 'ppt';
  folderName: string;
  analyzedDate: string;
  timestamp: number;
  totalImagesAnalyzed: number;
  totalTasksDetected: number;
  conformImagesCount: number;
  inconsistentImagesCount: number;
  ambiguityAlerts: AdaptationAmbiguityAlert[];
  items: AdaptationItemResult[];
  extractedBriefSummary: string[];
  rawTxtReport: string;
}
