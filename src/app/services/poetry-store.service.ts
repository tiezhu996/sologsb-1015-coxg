import { computed, Injectable, signal } from '@angular/core';
import type {
  AntithesisPair,
  AnalysisCell,
  AnalysisLine,
  CharacterMark,
  CharDiff,
  EvidenceEntry,
  EvidenceRef,
  EvidenceSnapshot,
  MarkTone,
  MeterTemplate,
  PoemIssue,
  PoemVersion,
  PoemWorkspace,
  Tone,
} from '../models/poem.models';

export const METER_TEMPLATES: MeterTemplate[] = [
  {
    id: 'wuyan-zeqi',
    name: '五言绝句 · 仄起首句不入韵',
    summary: '四句，每句五字；二、四句押韵',
    lineCount: 4,
    lineLength: 5,
    pattern: ['仄', '仄', '中', '平', '仄', '中', '平', '中', '仄', '仄', '中', '平', '中', '仄', '中', '平', '中', '仄', '中', '平'],
    rhymeLines: [1, 3],
  },
  {
    id: 'wuyan-pingqi',
    name: '五言绝句 · 平起首句入韵',
    summary: '四句，每句五字；一、二、四句押韵',
    lineCount: 4,
    lineLength: 5,
    pattern: ['中', '平', '中', '仄', '平', '仄', '仄', '中', '平', '仄', '中', '平', '中', '仄', '仄', '中', '平', '仄', '中', '平'],
    rhymeLines: [0, 1, 3],
  },
  {
    id: 'qiyan-zeqi',
    name: '七言绝句 · 仄起首句入韵',
    summary: '四句，每句七字；一、二、四句押韵',
    lineCount: 4,
    lineLength: 7,
    pattern: ['仄', '仄', '中', '平', '中', '仄', '平', '中', '平', '中', '仄', '仄', '中', '平', '中', '仄', '中', '平', '中', '仄', '仄', '中', '平', '中', '仄', '中', '平', '中'],
    rhymeLines: [0, 1, 3],
  },
  {
    id: 'qiyan-pingqi',
    name: '七言绝句 · 平起首句不入韵',
    summary: '四句，每句七字；二、四句押韵',
    lineCount: 4,
    lineLength: 7,
    pattern: ['中', '平', '中', '仄', '仄', '中', '平', '仄', '仄', '中', '平', '平', '仄', '仄', '中', '平', '中', '仄', '中', '平', '仄', '仄', '中', '平', '中', '仄', '仄', '中', '平'],
    rhymeLines: [1, 3],
  },
];

const STORAGE_KEY = 'sologsb-1015-poetry-workspace-v1';
const PUNCTUATION = new Set(['，', '。', '！', '？', '；', '：', '、', ' ', '\t']);
const TONE_DICTIONARY: Record<string, Tone> = {
  春: '平', 眠: '平', 不: '仄', 觉: '仄', 晓: '仄', 处: '仄', 闻: '平', 啼: '平', 鸟: '仄',
  夜: '仄', 来: '平', 风: '平', 雨: '仄', 声: '平', 花: '平', 落: '仄', 知: '平', 多: '平', 少: '仄',
  国: '仄', 破: '仄', 山: '平', 河: '平', 在: '仄', 城: '平', 深: '平', 木: '仄', 草: '仄', 独: '仄',
  明: '平', 月: '仄', 高: '平', 天: '平', 故: '仄', 乡: '平', 万: '仄', 里: '仄', 江: '平', 船: '平',
};

const clone = <T>(value: T): T => structuredClone(value);
const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

function key(line: number, position: number): string {
  return `${line}:${position}`;
}

function defaultMark(): CharacterMark {
  return { tone: '?', rhyme: '', pauseAfter: false, basis: '', note: '', evidenceRefs: [] };
}

function snapshotOf(entry: EvidenceEntry): EvidenceSnapshot {
  return {
    title: entry.title,
    edition: entry.edition,
    excerpt: entry.excerpt,
    revision: entry.revision,
    capturedAt: new Date().toISOString(),
  };
}

function initialWorkspace(): PoemWorkspace {
  const now = new Date().toISOString();
  const spring = '春眠不觉晓，\n处处闻啼鸟。\n夜来风雨声，\n花落知多少。';
  const marks: Record<string, CharacterMark> = {};
  const cells = [
    ['晓', 0, '平', false], ['鸟', 1, '平', false], ['声', 2, '平', false], ['少', 3, '平', false],
  ] as const;
  cells.forEach(([char, line, tone, pause]) => {
    marks[key(line, 4)] = { tone, rhyme: 'A', pauseAfter: pause, basis: '《平水韵》上声十七筱', note: `${char} 为韵脚` };
  });
  marks[key(0, 2)] = { tone: '平', rhyme: '', pauseAfter: false, basis: '平水韵', note: '句中平声' };
  marks[key(1, 2)] = { tone: '平', rhyme: '', pauseAfter: false, basis: '平水韵', note: '' };
  marks[key(2, 2)] = { tone: '平', rhyme: '', pauseAfter: false, basis: '平水韵', note: '' };

  const variants = spring.replace('处处闻啼鸟', '处处闻啼鸟');
  const topVersion: PoemVersion = {
    id: 'version-main',
    name: '通行本 · 孟浩然集',
    source: '《孟浩然诗集笺注》',
    createdAt: now,
    text: variants,
    marks,
    antithesisPairs: [],
  };
  const variant: PoemVersion = {
    id: 'version-song',
    name: '宋刻本异文',
    source: '宋蜀刻本',
    createdAt: now,
    text: '春眠不觉晓，\n处处闻啼鸟。\n夜来风雨声，\n花落知多少。',
    marks: clone(marks),
    antithesisPairs: [],
  };
  const evidenceLedger: EvidenceEntry[] = [
    {
      id: 'evidence-pingshui',
      title: '《平水韵》',
      edition: '上声十七筱',
      excerpt: '筱小皎皛杳窅嫋娆扰娆…晓鸟少…同部。',
      status: 'active',
      revision: 1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'evidence-songke',
      title: '宋蜀刻本《孟浩然集》',
      edition: '卷一叶三',
      excerpt: '「春眠不觉晓」句，宋刻作「不觉晓」，无别本异文。',
      status: 'active',
      revision: 1,
      createdAt: now,
      updatedAt: now,
    },
  ];
  return {
    title: '春晓',
    author: '孟浩然',
    templateId: 'wuyan-zeqi',
    versions: [topVersion, variant],
    activeVersionId: topVersion.id,
    evidenceLedger,
    updatedAt: now,
  };
}

function loadWorkspace(): PoemWorkspace {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialWorkspace();
    const parsed = JSON.parse(raw) as PoemWorkspace;
    if (!parsed.versions?.length) return initialWorkspace();
    parsed.evidenceLedger ??= [];
    parsed.versions.forEach((version) => {
      Object.values(version.marks ?? {}).forEach((mark) => {
        mark.evidenceRefs ??= [];
      });
    });
    return parsed;
  } catch {
    return initialWorkspace();
  }
}

@Injectable({ providedIn: 'root' })
export class PoetryStoreService {
  readonly workspace = signal<PoemWorkspace>(loadWorkspace());
  readonly selectedLine = signal(0);
  readonly selectedPosition = signal(4);
  readonly baselineVersionId = signal<string>('');
  readonly currentDiffIndex = signal(0);
  readonly toast = signal('');
  readonly undoCount = signal(0);
  readonly redoCount = signal(0);

  private undoStack: PoemWorkspace[] = [];
  private redoStack: PoemWorkspace[] = [];

  readonly activeVersion = computed(() => {
    const state = this.workspace();
    return state.versions.find((version) => version.id === state.activeVersionId) ?? state.versions[0];
  });

  readonly template = computed(() => {
    return METER_TEMPLATES.find((item) => item.id === this.workspace().templateId) ?? METER_TEMPLATES[0];
  });

  readonly lines = computed(() => this.activeVersion().text.split('\n'));

  readonly analysis = computed<AnalysisLine[]>(() => {
    const version = this.activeVersion();
    const template = this.template();
    return this.lines().map((line, lineIndex) => {
      const chars = Array.from(line).filter((char) => !PUNCTUATION.has(char));
      const cells: AnalysisCell[] = chars.map((char, position) => {
        const mark = version.marks[key(lineIndex, position)] ?? defaultMark();
        const expected = template.pattern[lineIndex * template.lineLength + position] ?? '中';
        const actual = mark.tone === '?' ? (TONE_DICTIONARY[char] ?? '?') : mark.tone;
        let status: AnalysisCell['status'] = 'neutral';
        let message = '标点或不计律位置';
        if (PUNCTUATION.has(char)) {
          status = 'neutral';
        } else if (actual === '?') {
          status = 'unknown';
          message = '尚未标注平仄';
        } else if (expected === '中') {
          status = 'correct';
          message = '可平可仄';
        } else if (actual === expected) {
          status = 'correct';
          message = '合律';
        } else if (this.isAcceptableVariant(template, lineIndex, position)) {
          status = 'variant';
          message = '一三五位置的可接受变体';
        } else {
          status = 'error';
          message = `此处应为${expected}声`;
        }
        return { char, position, expected, actual, status, message, mark };
      });
      const rhymeChars = template.rhymeLines.includes(lineIndex) ? cells.slice(-1).map((cell) => cell.char) : [];
      return {
        index: lineIndex,
        cells,
        rhymeChars,
        errors: cells.filter((cell) => cell.status === 'error').length,
        variants: cells.filter((cell) => cell.status === 'variant').length,
      };
    });
  });

  readonly issues = computed<PoemIssue[]>(() => {
    const analysis = this.analysis();
    const version = this.activeVersion();
    const template = this.template();
    const issues: PoemIssue[] = [];
    analysis.forEach((line) => {
      line.cells.filter((cell) => cell.status === 'error').forEach((cell) => {
        issues.push({
          id: uid('issue'),
          level: 'error',
          title: '出律位置',
          detail: `第 ${line.index + 1} 句“${cell.char}”：${cell.message}`,
          line: line.index,
          position: cell.position,
        });
      });
      if (line.cells.some((cell) => cell.status === 'unknown')) {
        issues.push({ id: uid('issue'), level: 'warning', title: '存在未标注字', detail: `第 ${line.index + 1} 句仍有平仄未确认。`, line: line.index });
      }
    });
    const rhymeCells = template.rhymeLines.map((line) => analysis[line]?.cells.at(-1)).filter(Boolean);
    const rhymeGroups = new Map<string, string[]>();
    rhymeCells.forEach((cell) => {
      if (!cell?.mark.rhyme) {
        issues.push({ id: uid('issue'), level: 'warning', title: '韵脚缺少韵部', detail: `第 ${(cell?.position ?? 0) + 1} 句末字尚未指定韵部。` });
        return;
      }
      rhymeGroups.set(cell.mark.rhyme, [...(rhymeGroups.get(cell.mark.rhyme) ?? []), cell.char]);
    });
    rhymeGroups.forEach((chars, rhyme) => {
      const duplicate = chars.find((char, index) => chars.indexOf(char) !== index);
      if (duplicate) issues.push({ id: uid('issue'), level: 'warning', title: '重复用韵', detail: `韵部 ${rhyme} 重复使用末字“${duplicate}”。` });
    });
    if (version.antithesisPairs.length === 0) {
      issues.push({ id: 'antithesis-empty', level: 'info', title: '尚未标记对仗', detail: '可在检视器中把两句建立对仗关系。' });
    }
    const ledger = this.workspace().evidenceLedger;
    const stale = new Map<string, number>();
    const deprecated = new Map<string, number>();
    this.workspace().versions.forEach((item) => {
      Object.values(item.marks).forEach((mark) => {
        (mark.evidenceRefs ?? []).forEach((ref) => {
          const entry = ledger.find((candidate) => candidate.id === ref.entryId);
          if (!entry) return;
          if (entry.status === 'deprecated') deprecated.set(entry.id, (deprecated.get(entry.id) ?? 0) + 1);
          if (ref.confirmed && entry.revision > ref.snapshot.revision) stale.set(entry.id, (stale.get(entry.id) ?? 0) + 1);
        });
      });
    });
    deprecated.forEach((count, id) => {
      const entry = ledger.find((candidate) => candidate.id === id);
      issues.push({ id: `evidence-deprecated-${id}`, level: 'warning', title: '引用条目已停用', detail: `${entry?.title ?? '未知条目'}已停用，仍有 ${count} 处引用，原文快照仍可查。` });
    });
    stale.forEach((count, id) => {
      const entry = ledger.find((candidate) => candidate.id === id);
      issues.push({ id: `evidence-stale-${id}`, level: 'info', title: '台账条目已改版', detail: `${entry?.title ?? '未知条目'}已改至第 ${entry?.revision} 版，${count} 处已确认引用仍按引用时快照显示。` });
    });
    if (!issues.some((issue) => issue.level === 'error')) {
      issues.unshift({ id: 'meter-ok', level: 'info', title: '格律检查通过', detail: '当前未发现硬性出律，请继续核对可接受变体。' });
    }
    return issues;
  });

  readonly diff = computed<CharDiff[]>(() => {
    const left = this.workspace().versions.find((version) => version.id === this.baselineVersionId());
    const right = this.activeVersion();
    if (!left || left.id === right.id) return [];
    const leftChars = Array.from(left.text.replace(/\n/g, ''));
    const rightChars = Array.from(right.text.replace(/\n/g, ''));
    const size = Math.max(leftChars.length, rightChars.length);
    return Array.from({ length: size }, (_, index) => ({
      index,
      left: leftChars[index] ?? '',
      right: rightChars[index] ?? '',
      changed: leftChars[index] !== rightChars[index],
    }));
  });

  readonly differences = computed(() => this.diff().filter((item) => item.changed).map((item) => item.index));
  readonly baselineVersion = computed(() => this.workspace().versions.find((version) => version.id === this.baselineVersionId()));

  readonly evidenceUsage = computed(() => {
    const usage = new Map<string, { total: number; confirmed: number }>();
    this.workspace().versions.forEach((version) => {
      Object.values(version.marks).forEach((mark) => {
        (mark.evidenceRefs ?? []).forEach((ref) => {
          const entry = usage.get(ref.entryId) ?? { total: 0, confirmed: 0 };
          entry.total += 1;
          if (ref.confirmed) entry.confirmed += 1;
          usage.set(ref.entryId, entry);
        });
      });
    });
    return usage;
  });

  resolveEvidence(ref: EvidenceRef): {
    title: string;
    edition: string;
    excerpt: string;
    revision: number;
    deprecated: boolean;
    stale: boolean;
    missing: boolean;
    followsLive: boolean;
  } {
    const entry = this.workspace().evidenceLedger.find((item) => item.id === ref.entryId);
    if (!entry) {
      return { ...ref.snapshot, deprecated: false, stale: false, missing: true, followsLive: false };
    }
    if (!ref.confirmed) {
      return {
        title: entry.title,
        edition: entry.edition,
        excerpt: entry.excerpt,
        revision: entry.revision,
        deprecated: entry.status === 'deprecated',
        stale: false,
        missing: false,
        followsLive: true,
      };
    }
    return {
      ...ref.snapshot,
      deprecated: entry.status === 'deprecated',
      stale: entry.revision > ref.snapshot.revision,
      missing: false,
      followsLive: false,
    };
  }

  selectVersion(id: string): void {
    this.workspace.update((workspace) => ({ ...workspace, activeVersionId: id }));
  }

  selectCell(line: number, position: number): void {
    this.selectedLine.set(line);
    this.selectedPosition.set(position);
  }

  setTemplate(id: string): void {
    this.commit((workspace) => {
      workspace.templateId = id;
    });
  }

  updateText(text: string): void {
    this.commit((workspace) => {
      const version = this.versionIn(workspace);
      version.text = text;
    });
  }

  updateTitle(title: string): void {
    this.commit((workspace) => {
      workspace.title = title;
    });
  }

  updateVersionSource(source: string): void {
    this.commit((workspace) => {
      this.versionIn(workspace).source = source;
    });
  }

  setMark(patch: Partial<CharacterMark>): void {
    this.commit((workspace) => {
      const version = this.versionIn(workspace);
      const id = key(this.selectedLine(), this.selectedPosition());
      version.marks[id] = { ...defaultMark(), ...version.marks[id], ...patch };
    });
  }

  cycleTone(): void {
    const cell = this.selectedCell();
    const next: Record<Tone, MarkTone | '?'> = { '?': '平', '平': '仄', '仄': '中', '中': '?' };
    this.setMark({ tone: next[cell?.actual ?? '?'] });
  }

  togglePause(): void {
    const cell = this.selectedCell();
    this.setMark({ pauseAfter: !(cell?.mark.pauseAfter ?? false) });
  }

  cycleRhyme(): void {
    const cell = this.selectedCell();
    const current = cell?.mark.rhyme ?? '';
    const next = current === '' ? 'A' : current === 'A' ? 'B' : current === 'B' ? 'C' : '';
    this.setMark({ rhyme: next });
  }

  addAntithesis(): void {
    const line = this.selectedLine();
    const other = line === 0 ? 1 : line - 1;
    this.commit((workspace) => {
      const version = this.versionIn(workspace);
      if (version.antithesisPairs.some((pair) => pair.leftLine === line && pair.rightLine === other)) return;
      version.antithesisPairs.push({ id: uid('pair'), leftLine: Math.min(line, other), rightLine: Math.max(line, other), note: '结构相对，词性相应。' });
    });
  }

  removeAntithesis(id: string): void {
    this.commit((workspace) => {
      const version = this.versionIn(workspace);
      version.antithesisPairs = version.antithesisPairs.filter((pair) => pair.id !== id);
    });
  }

  updateAntithesis(id: string, note: string): void {
    this.commit((workspace) => {
      const pair = this.versionIn(workspace).antithesisPairs.find((item) => item.id === id);
      if (pair) pair.note = note;
    });
  }

  addEvidenceEntry(input: { title: string; edition: string; excerpt: string }): void {
    const now = new Date().toISOString();
    this.commit((workspace) => {
      workspace.evidenceLedger.push({
        id: uid('evidence'),
        title: input.title.trim(),
        edition: input.edition.trim(),
        excerpt: input.excerpt.trim(),
        status: 'active',
        revision: 1,
        createdAt: now,
        updatedAt: now,
      });
    });
    this.toast.set('已登记依据条目');
  }

  updateEvidenceEntry(id: string, patch: { title?: string; edition?: string; excerpt?: string }): void {
    this.commit((workspace) => {
      const entry = workspace.evidenceLedger.find((item) => item.id === id);
      if (!entry) return;
      if (patch.title !== undefined) entry.title = patch.title.trim();
      if (patch.edition !== undefined) entry.edition = patch.edition.trim();
      if (patch.excerpt !== undefined) entry.excerpt = patch.excerpt.trim();
      entry.revision += 1;
      entry.updatedAt = new Date().toISOString();
    });
    this.toast.set('条目已改版，已确认引用仍以各自快照为准');
  }

  toggleEvidenceStatus(id: string): void {
    this.commit((workspace) => {
      const entry = workspace.evidenceLedger.find((item) => item.id === id);
      if (!entry) return;
      entry.status = entry.status === 'active' ? 'deprecated' : 'active';
      entry.updatedAt = new Date().toISOString();
    });
  }

  citeEvidence(entryId: string): void {
    const entry = this.workspace().evidenceLedger.find((item) => item.id === entryId);
    if (!entry) return;
    if (entry.status === 'deprecated') {
      this.toast.set('该条目已停用，不能再新引用');
      return;
    }
    const cell = this.selectedCell();
    if (!cell) return;
    if ((cell.mark.evidenceRefs ?? []).some((ref) => ref.entryId === entryId)) {
      this.toast.set('此字格已引用该条目');
      return;
    }
    this.commit((workspace) => {
      const version = this.versionIn(workspace);
      const id = key(this.selectedLine(), this.selectedPosition());
      const mark = { ...defaultMark(), ...version.marks[id] };
      mark.evidenceRefs = [...(mark.evidenceRefs ?? []), { entryId, confirmed: false, snapshot: snapshotOf(entry), citedAt: new Date().toISOString() }];
      version.marks[id] = mark;
    });
  }

  confirmEvidence(entryId: string): void {
    const entry = this.workspace().evidenceLedger.find((item) => item.id === entryId);
    if (!entry) return;
    this.commit((workspace) => {
      const version = this.versionIn(workspace);
      const id = key(this.selectedLine(), this.selectedPosition());
      const mark = version.marks[id];
      const ref = mark?.evidenceRefs?.find((item) => item.entryId === entryId);
      if (!ref || ref.confirmed) return;
      ref.confirmed = true;
      ref.snapshot = snapshotOf(entry);
    });
    this.toast.set('已确认引用，此后以快照为准');
  }

  removeEvidence(entryId: string): void {
    this.commit((workspace) => {
      const version = this.versionIn(workspace);
      const id = key(this.selectedLine(), this.selectedPosition());
      const mark = version.marks[id];
      if (!mark?.evidenceRefs) return;
      mark.evidenceRefs = mark.evidenceRefs.filter((ref) => ref.entryId !== entryId);
    });
  }

  snapshot(): void {
    const active = clone(this.activeVersion());
    active.id = uid('version');
    active.name = `校勘稿 ${this.workspace().versions.length}`;
    active.createdAt = new Date().toISOString();
    this.commit((workspace) => {
      workspace.versions.unshift(active);
      workspace.activeVersionId = active.id;
    });
    this.toast.set('已建立独立校勘稿');
  }

  duplicateActiveAsBaseline(): void {
    this.baselineVersionId.set(this.activeVersion().id);
  }

  nextDifference(): void {
    const values = this.differences();
    if (!values.length) return;
    const current = values.findIndex((index) => index >= this.currentDiffIndex());
    this.currentDiffIndex.set(values[(current + 1) % values.length]);
  }

  previousDifference(): void {
    const values = this.differences();
    if (!values.length) return;
    const reverse = [...values].reverse();
    const current = reverse.findIndex((index) => index <= this.currentDiffIndex());
    this.currentDiffIndex.set(reverse[(current + 1) % reverse.length]);
  }

  undo(): void {
    const previous = this.undoStack.pop();
    if (!previous) return;
    this.redoStack.push(clone(this.workspace()));
    this.workspace.set(previous);
    this.undoCount.set(this.undoStack.length);
    this.redoCount.set(this.redoStack.length);
    this.persist();
  }

  redo(): void {
    const next = this.redoStack.pop();
    if (!next) return;
    this.undoStack.push(clone(this.workspace()));
    this.workspace.set(next);
    this.undoCount.set(this.undoStack.length);
    this.redoCount.set(this.redoStack.length);
    this.persist();
  }

  exportProofreadCopy(): string {
    const active = this.activeVersion();
    const lines = this.analysis().map((line) => {
      const tags = line.cells.map((cell) => `${cell.char}${cell.actual === '?' ? '□' : `(${cell.actual})`}`).join(' ');
      return `第 ${line.index + 1} 句：${tags}`;
    });
    const notes = this.issues().map((issue) => `[${issue.level.toUpperCase()}] ${issue.title}：${issue.detail}`);
    const ledger = this.workspace().evidenceLedger;
    const basisLines: string[] = [];
    this.analysis().forEach((line) => {
      line.cells.forEach((cell) => {
        const refs = cell.mark.evidenceRefs ?? [];
        if (!cell.mark.basis && !refs.length) return;
        basisLines.push(`### 第 ${line.index + 1} 句第 ${cell.position + 1} 字「${cell.char}」`);
        if (cell.mark.basis) basisLines.push(`- 手写依据：${cell.mark.basis}`);
        refs.forEach((ref) => {
          const entry = ledger.find((item) => item.id === ref.entryId);
          const current = entry
            ? `${entry.title}｜${entry.edition}｜第 ${entry.revision} 版｜${entry.status === 'deprecated' ? '已停用' : '在用'}`
            : '台账条目已不存在';
          basisLines.push(`- 当前关联：${current}`);
          basisLines.push(`- 引用时快照：${ref.snapshot.title}｜${ref.snapshot.edition}｜第 ${ref.snapshot.revision} 版｜${ref.confirmed ? '已确认' : '未确认'}｜摘录：${ref.snapshot.excerpt}`);
        });
      });
    });
    if (!basisLines.length) basisLines.push('（暂无逐字依据记录）');
    const ledgerLines = ledger.length
      ? ledger.map((entry) => `- ${entry.title}｜${entry.edition}｜第 ${entry.revision} 版｜${entry.status === 'deprecated' ? '已停用' : '在用'}｜摘录：${entry.excerpt}`)
      : ['（台账为空）'];
    return [
      `# ${this.workspace().title} · 格律校对稿`, '',
      `底本：${active.name}`, `出处：${active.source}`, '',
      '## 字音标注', ...lines, '',
      '## 逐字依据', ...basisLines, '',
      '## 依据台账', ...ledgerLines, '',
      '## 检查记录', ...notes,
    ].join('\n');
  }

  downloadProofreadCopy(): void {
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(new Blob([this.exportProofreadCopy()], { type: 'text/markdown;charset=utf-8' }));
    anchor.download = `${this.workspace().title}-格律校对稿.md`;
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  }

  selectedCell(): AnalysisCell | undefined {
    return this.analysis()[this.selectedLine()]?.cells[this.selectedPosition()];
  }

  private commit(mutator: (workspace: PoemWorkspace) => void): void {
    this.undoStack.push(clone(this.workspace()));
    if (this.undoStack.length > 80) this.undoStack.shift();
    this.redoStack = [];
    const next = clone(this.workspace());
    mutator(next);
    next.updatedAt = new Date().toISOString();
    this.workspace.set(next);
    this.undoCount.set(this.undoStack.length);
    this.redoCount.set(0);
    this.persist();
  }

  private versionIn(workspace: PoemWorkspace): PoemVersion {
    const version = workspace.versions.find((item) => item.id === workspace.activeVersionId) ?? workspace.versions[0];
    return version;
  }

  private persist(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.workspace()));
  }

  private isAcceptableVariant(template: MeterTemplate, line: number, position: number): boolean {
    if (template.lineLength === 5) return position === 0 || position === 2;
    return position === 0 || position === 2 || position === 4;
  }
}
