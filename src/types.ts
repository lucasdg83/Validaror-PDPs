export type CountryCode = 'AR' | 'UY' | 'CL' | 'MX' | 'CERAN' | 'ADAPTACIONES' | 'CHECK_OPERA';

export interface CountryInfo {
  code: CountryCode;
  name: string;
  flag: string;
  description: string;
  status: 'active' | 'pending';
  expectedRetailersCount: number;
  isAdaptationModule?: boolean;
  isOperaModule?: boolean;
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
  briefFileType: 'pdf' | 'pptx' | 'ppt' | 'docx' | 'doc';
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

export interface BriefResourceLink {
  url: string;
  title: string;
  description?: string;
  type?: 'dam' | 'zip' | 'key_visual' | 'general';
}

export interface BriefActionItem {
  category: 'sizes_formats' | 'translations' | 'shades_skus' | 'background_composition' | 'removals' | 'disclaimers' | 'general';
  categoryTitle: string;
  icon?: string;
  instructions: string[];
}

export interface BriefAmbiguity {
  id: string;
  title: string;
  pmNoteText: string;
  reason: string;
  suggestedQuestionToPM: string;
  severity: 'high' | 'medium' | 'low';
}

export interface BriefSlideDetail {
  slideNumber: number | string;
  sectionTitle: string;
  requestedChanges: string[];
  originalText?: string;
  translatedText?: string;
  targetDimensions?: string[];
  links?: string[];
  notes?: string;
}

export interface BriefShadeItem {
  name: string;
  sku?: string;
  ean?: string;
  action: 'keep' | 'remove' | 'add' | 'replicate' | 'info';
  details?: string;
}

export interface BriefFormatRequirement {
  channelOrSection: string;
  dimensions: string;
  aspectRatio?: string;
  details?: string;
}

export interface BriefLegalDisclaimer {
  text: string;
  stylingRequirement?: string;
  appliesTo?: string;
}

export interface BriefAnalysisResult {
  id: string;
  fileName: string;
  fileType: 'pdf' | 'pptx' | 'ppt' | 'docx' | 'doc';
  fileSizeBytes: number;
  analyzedDate: string;
  timestamp: number;
  productOrBrand: string;
  overview: string;
  totalSlidesOrSections?: number;
  clarityScore: number; // 0-100
  clarityStatus: 'clear' | 'needs_clarification' | 'ambiguous';
  clarityReasoning: string;
  links: BriefResourceLink[];
  actionCategories: BriefActionItem[];
  slideBySlideBreakdown?: BriefSlideDetail[];
  shadesAndSkusList?: BriefShadeItem[];
  requiredFormatsByChannel?: BriefFormatRequirement[];
  legalDisclaimers?: BriefLegalDisclaimer[];
  ambiguities: BriefAmbiguity[];
  plainTextReport: string;
}

export interface OperaImageFile {
  id: string;
  name: string;
  relativePath: string;
  sizeBytes: number;
  sizeKB: number;
  width: number;
  height: number;
  aspectRatio: string;
  dimensionsStr: string; // e.g. "1200x1200"
  extension: string;
  previewUrl?: string;
  thumbnailBase64?: string;
  hash?: string;
  fileObj?: File;
}

export interface OperaDuplicateGroup {
  groupId: string;
  dimensionsStr: string; // e.g. "1200x1200"
  width: number;
  height: number;
  aspectRatio: string;
  visualSummary: string; // Resumen del contenido visual
  files: OperaImageFile[];
  totalDuplicateCopies: number; // copias redundantes
  wastedBytes: number;
  confidence: number; // 0-100
  aiExplanation: string;
}

export interface OperaDifferentSizeItem {
  id: string;
  imageA: OperaImageFile;
  imageB: OperaImageFile;
  reason: string; // "Mismo contenido pero diferente tamaño -> NO se clasifica como duplicado"
}

export interface OperaAnalysisReport {
  id: string;
  folderName: string;
  analyzedDate: string;
  timestamp: number;
  totalImagesScanned: number;
  totalUniqueImages: number;
  totalDuplicateGroups: number;
  totalDuplicateFiles: number;
  totalWastedBytes: number;
  duplicateGroups: OperaDuplicateGroup[];
  differentSizeIgnored: OperaDifferentSizeItem[];
  allImages: OperaImageFile[];
  rawTxtReport: string;
}


