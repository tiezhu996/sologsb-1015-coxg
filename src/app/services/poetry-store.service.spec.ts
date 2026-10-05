import { TestBed } from '@angular/core/testing';
import { PoetryStoreService } from './poetry-store.service';

describe('PoetryStoreService 依据台账', () => {
  let store: PoetryStoreService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    store = TestBed.inject(PoetryStoreService);
  });

  function addEntry() {
    store.addEvidenceEntry({ title: '《广韵》', edition: '上平声 · 一东', excerpt: '东，春方也。' });
    return store.evidenceLedger()[0];
  }

  it('登记条目并建立未确认引用', () => {
    const entry = addEntry();
    expect(entry.revision).toBe(1);
    expect(entry.status).toBe('active');

    store.referenceEvidence(entry.id);
    const ref = store.selectedCell()!.mark.basisRef!;
    expect(ref.confirmed).toBeFalse();
    expect(ref.title).toBe('《广韵》');
    expect(ref.revision).toBe(1);
  });

  it('手写判断依据在引用后保留原文', () => {
    const entry = addEntry();
    store.setMark({ basis: '手抄旧稿原文' });
    store.referenceEvidence(entry.id);
    expect(store.selectedCell()!.mark.basis).toBe('手抄旧稿原文');
    store.removeEvidenceReference();
    expect(store.selectedCell()!.mark.basis).toBe('手抄旧稿原文');
    expect(store.selectedCell()!.mark.basisRef).toBeNull();
  });

  it('条目改版后未确认引用跟随当前版本，已确认引用保持快照', () => {
    const entry = addEntry();
    // 当前选中字格：未确认引用
    store.referenceEvidence(entry.id);
    // 另一个字格：确认引用
    store.selectCell(0, 1);
    store.referenceEvidence(entry.id);
    store.confirmEvidenceReference();

    store.updateEvidenceEntry(entry.id, { title: '《广韵》', edition: '上平声 · 二冬', excerpt: '冬，终也。' });

    store.selectCell(0, 2);
    const draft = store.selectedCell()!.mark.basisRef!;
    expect(draft.confirmed).toBeFalse();
    expect(draft.edition).toBe('上平声 · 二冬');
    expect(draft.revision).toBe(2);

    store.selectCell(0, 1);
    const locked = store.selectedCell()!.mark.basisRef!;
    expect(locked.confirmed).toBeTrue();
    expect(locked.edition).toBe('上平声 · 一东');
    expect(locked.revision).toBe(1);
  });

  it('停用条目后已有引用仍可查，且不能新增引用', () => {
    const entry = addEntry();
    store.referenceEvidence(entry.id);
    store.confirmEvidenceReference();

    store.toggleEvidenceStatus(entry.id);
    expect(store.evidenceEntry(entry.id)!.status).toBe('disabled');
    // 已有引用仍可解析
    const ref = store.selectedCell()!.mark.basisRef!;
    expect(ref.title).toBe('《广韵》');
    expect(store.evidenceEntry(ref.entryId)).toBeTruthy();

    // 停用后拒绝新增引用
    store.selectCell(1, 1);
    store.referenceEvidence(entry.id);
    expect(store.selectedCell()!.mark.basisRef ?? null).toBeNull();
  });

  it('导出同时写当前关联和当时快照', () => {
    const entry = addEntry();
    store.referenceEvidence(entry.id);
    store.confirmEvidenceReference();
    store.updateEvidenceEntry(entry.id, { title: '《广韵》', edition: '上平声 · 二冬', excerpt: '冬，终也。' });

    const output = store.exportProofreadCopy();
    expect(output).toContain('## 依据台账');
    expect(output).toContain('当前关联：《广韵》 · 上平声 · 二冬（第 2 版）');
    expect(output).toContain('当时快照：《广韵》 · 上平声 · 一东（第 1 版 · 已确认）');
  });
});
