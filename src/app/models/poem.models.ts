export type Tone = '平' | '仄' | '中' | '?';
export type MarkTone = '平' | '仄' | '中';

/** 依据台账条目：登记称谓、版本卷页与摘录，供字格引用。 */
export interface EvidenceEntry {
  id: string;
  /** 称谓，如《平水韵》 */
  title: string;
  /** 版本卷页，如「宋蜀刻本 · 卷上 · 上声十七筱」 */
  edition: string;
  /** 摘录原文 */
  excerpt: string;
  /** 改版序号，每次改版 +1 */
  revision: number;
  /** 停用后不可新增引用，但已有引用仍可查 */
  status: 'active' | 'disabled';
  createdAt: string;
  updatedAt: string;
}

/**
 * 字格对台账条目的引用。
 * 未确认时快照跟随台账当前版本；确认后冻结为引用时快照。
 */
export interface EvidenceRef {
  entryId: string;
  confirmed: boolean;
  /** 快照对应的条目改版序号 */
  revision: number;
  title: string;
  edition: string;
  excerpt: string;
  referencedAt: string;
}

export interface CharacterMark {
  tone: MarkTone | '?';
  rhyme: string;
  pauseAfter: boolean;
  /** 手写判断依据，保留原文，不随台账变化 */
  basis: string;
  /** 台账引用；为空表示未引用 */
  basisRef?: EvidenceRef | null;
  note: string;
}

export interface PoemVersion {
  id: string;
  name: string;
  source: string;
  createdAt: string;
  text: string;
  marks: Record<string, CharacterMark>;
  antithesisPairs: AntithesisPair[];
}

export interface AntithesisPair {
  id: string;
  leftLine: number;
  rightLine: number;
  note: string;
}

export interface PoemWorkspace {
  title: string;
  author: string;
  templateId: string;
  versions: PoemVersion[];
  activeVersionId: string;
  /** 依据台账，跨版本共享；条目停用不删除 */
  evidenceLedger: EvidenceEntry[];
  updatedAt: string;
}

export interface MeterTemplate {
  id: string;
  name: string;
  summary: string;
  lineCount: number;
  lineLength: number;
  pattern: Tone[];
  rhymeLines: number[];
}

export interface AnalysisCell {
  char: string;
  position: number;
  expected: Tone;
  actual: Tone;
  status: 'correct' | 'variant' | 'error' | 'unknown' | 'neutral';
  message: string;
  mark: CharacterMark;
}

export interface AnalysisLine {
  index: number;
  cells: AnalysisCell[];
  rhymeChars: string[];
  errors: number;
  variants: number;
}

export interface PoemIssue {
  id: string;
  level: 'error' | 'warning' | 'info';
  title: string;
  detail: string;
  line?: number;
  position?: number;
}

export interface CharDiff {
  index: number;
  left: string;
  right: string;
  changed: boolean;
}
