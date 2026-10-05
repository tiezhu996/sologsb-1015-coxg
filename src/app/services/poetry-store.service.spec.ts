import { TestBed } from '@angular/core/testing';
import { PoetryStoreService } from './poetry-store.service';

const STORAGE_KEY = 'sologsb-1015-poetry-workspace-v1';

describe('PoetryStoreService 依据台账', () => {
  let store: PoetryStoreService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    store = TestBed.inject(PoetryStoreService);
  });

  function addEntry(): string {
    store.addEvidenceEntry({ title: '《广韵》', edition: '上平四支', excerpt: '支枝肢栀…' });
    return store.workspace().evidenceLedger.at(-1)!.id;
  }

  it('登记称谓、版本卷页和摘录', () => {
    const id = addEntry();
    const entry = store.workspace().evidenceLedger.find((item) => item.id === id)!;
    expect(entry.title).toBe('《广韵》');
    expect(entry.edition).toBe('上平四支');
    expect(entry.excerpt).toBe('支枝肢栀…');
    expect(entry.revision).toBe(1);
    expect(entry.status).toBe('active');
  });

  it('字格从台账引用，未确认的新引用跟随当前版本', () => {
    const id = addEntry();
    store.selectCell(0, 0);
    store.citeEvidence(id);
    store.updateEvidenceEntry(id, { edition: '上平五微' });
    const ref = store.activeVersion().marks['0:0'].evidenceRefs![0];
    const resolved = store.resolveEvidence(ref);
    expect(resolved.edition).toBe('上平五微');
    expect(resolved.followsLive).toBeTrue();
  });

  it('已确认的引用以引用时快照为准，条目改版不影响', () => {
    const id = addEntry();
    store.selectCell(0, 0);
    store.citeEvidence(id);
    store.confirmEvidence(id);
    store.updateEvidenceEntry(id, { edition: '上平五微' });
    const ref = store.activeVersion().marks['0:0'].evidenceRefs![0];
    const resolved = store.resolveEvidence(ref);
    expect(resolved.edition).toBe('上平四支');
    expect(resolved.stale).toBeTrue();
    expect(resolved.followsLive).toBeFalse();
  });

  it('条目停用后已有引用仍可查，且不能再新引用', () => {
    const id = addEntry();
    store.selectCell(0, 0);
    store.citeEvidence(id);
    store.toggleEvidenceStatus(id);
    const ref = store.activeVersion().marks['0:0'].evidenceRefs![0];
    expect(store.resolveEvidence(ref).deprecated).toBeTrue();
    store.selectCell(0, 1);
    store.citeEvidence(id);
    expect(store.activeVersion().marks['0:1']?.evidenceRefs?.length ?? 0).toBe(0);
  });

  it('引用台账时已有手写依据保留原文', () => {
    store.selectCell(0, 0);
    store.setMark({ basis: '手抄旧稿原文' });
    const id = addEntry();
    store.citeEvidence(id);
    expect(store.activeVersion().marks['0:0'].basis).toBe('手抄旧稿原文');
  });

  it('导出同时写当前关联和引用时快照', () => {
    const id = addEntry();
    store.selectCell(0, 0);
    store.citeEvidence(id);
    store.confirmEvidence(id);
    store.updateEvidenceEntry(id, { edition: '上平五微' });
    const output = store.exportProofreadCopy();
    expect(output).toContain('当前关联：《广韵》｜上平五微｜第 2 版');
    expect(output).toContain('引用时快照：《广韵》｜上平四支｜第 1 版');
  });

  it('兼容没有台账字段的旧存档，手写依据原样保留', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      title: '旧稿',
      author: '旧人',
      templateId: 'wuyan-zeqi',
      activeVersionId: 'v1',
      updatedAt: '',
      versions: [{
        id: 'v1',
        name: '旧版本',
        source: '',
        createdAt: '',
        text: '春眠不觉晓，',
        marks: { '0:0': { tone: '平', rhyme: '', pauseAfter: false, basis: '旧手写依据', note: '' } },
        antithesisPairs: [],
      }],
    }));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const reloaded = TestBed.inject(PoetryStoreService);
    expect(reloaded.workspace().evidenceLedger).toEqual([]);
    expect(reloaded.activeVersion().marks['0:0'].basis).toBe('旧手写依据');
    expect(reloaded.activeVersion().marks['0:0'].evidenceRefs).toEqual([]);
  });
});
