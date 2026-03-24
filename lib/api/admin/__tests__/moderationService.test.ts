import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as q from '@/lib/api/admin/moderationQuery';
import * as svc from '@/lib/api/admin/moderationService';

vi.mock('@/lib/api/admin/moderationQuery');

describe('moderationService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getFlaggedContent returns data on success', async () => {
    const sample = [
      { id: 'f1', target_type: 'product', target_id: 'p1', reason: 'spam' },
    ];
    vi.mocked(q.fetchFlaggedContent).mockResolvedValueOnce(
      sample as unknown as Awaited<ReturnType<typeof q.fetchFlaggedContent>>,
    );

    const res = await svc.getFlaggedContent(1, 10);
    expect(res.success).toBe(true);
    expect(res.data).toEqual(sample);
  });

  it('getFlaggedContent returns error when query throws', async () => {
    vi.mocked(q.fetchFlaggedContent).mockRejectedValueOnce(new Error('db'));
    const res = await svc.getFlaggedContent();
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('INTERNAL_ERROR');
  });

  it('getReports returns data on success', async () => {
    const sample = [
      { id: 'r1', reporter_id: 'u1', target_type: 'product', status: 'open' },
    ];
    vi.mocked(q.fetchReports).mockResolvedValueOnce(
      sample as unknown as Awaited<ReturnType<typeof q.fetchReports>>,
    );
    const res = await svc.getReports(1, 5);
    expect(res.success).toBe(true);
    expect(res.data).toEqual(sample);
  });

  it('createReport returns created report', async () => {
    const created = { id: 'r2', reporter_id: 'u2' } as unknown as Awaited<
      ReturnType<typeof q.createReport>
    >;
    vi.mocked(q.createReport).mockResolvedValueOnce(created);
    const res = await svc.createReport({ reporter_id: 'u2' });
    expect(res.success).toBe(true);
    expect(res.data).toEqual(created);
  });

  it('createReport returns conflict when null', async () => {
    vi.mocked(q.createReport).mockResolvedValueOnce(null);
    const res = await svc.createReport({});
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('CONFLICT');
  });

  it('actionOnReport returns success when update ok', async () => {
    vi.mocked(q.updateReportStatus).mockResolvedValueOnce(true);
    const res = await svc.actionOnReport('r1', 'closed', 'ok');
    expect(res.success).toBe(true);
  });

  it('actionOnReport returns not_found when update fails', async () => {
    vi.mocked(q.updateReportStatus).mockResolvedValueOnce(false);
    const res = await svc.actionOnReport('r1', 'closed');
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('NOT_FOUND');
  });

  it('suspend returns success when ok', async () => {
    vi.mocked(q.suspendEntity).mockResolvedValueOnce(true);
    const res = await svc.suspend('user', 'u1', 'reason', '2026-12-31');
    expect(res.success).toBe(true);
  });

  it('suspend returns conflict when fails', async () => {
    vi.mocked(q.suspendEntity).mockResolvedValueOnce(false);
    const res = await svc.suspend('user', 'u1');
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('CONFLICT');
  });

  it('warn returns success when ok', async () => {
    vi.mocked(q.warnEntity).mockResolvedValueOnce(true);
    const res = await svc.warn('user', 'u1', 'please stop');
    expect(res.success).toBe(true);
  });

  it('warn returns conflict when fails', async () => {
    vi.mocked(q.warnEntity).mockResolvedValueOnce(false);
    const res = await svc.warn('user', 'u1', 'msg');
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('CONFLICT');
  });
});
