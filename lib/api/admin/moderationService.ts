import type { ApiResponse } from '@/lib/types';
import type { ModerationReport, FlaggedContent } from '@/lib/types';
import * as q from './moderationQuery';

export async function getFlaggedContent(
  page = 1,
  per_page = 20,
): Promise<ApiResponse<FlaggedContent[]>> {
  try {
    const data = await q.fetchFlaggedContent(page, per_page);
    return { success: true, data };
  } catch (error) {
    console.error('[moderationService.getFlaggedContent]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch flagged content',
      },
    };
  }
}

export async function getReports(
  page = 1,
  per_page = 20,
): Promise<ApiResponse<ModerationReport[]>> {
  try {
    const data = await q.fetchReports(page, per_page);
    return { success: true, data };
  } catch (error) {
    console.error('[moderationService.getReports]', error);
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch reports' },
    };
  }
}

export async function createReport(
  input: Partial<ModerationReport>,
): Promise<ApiResponse<ModerationReport | null>> {
  try {
    const data = await q.createReport(input);
    if (!data)
      return {
        success: false,
        error: { code: 'CONFLICT', message: 'Unable to create report' },
      };
    return { success: true, data };
  } catch (error) {
    console.error('[moderationService.createReport]', error);
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create report' },
    };
  }
}

export async function actionOnReport(
  id: string,
  status: string,
  comment?: string,
): Promise<ApiResponse<null>> {
  try {
    const ok = await q.updateReportStatus(id, status, comment);
    if (!ok)
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Report not found or update failed',
        },
      };
    return { success: true };
  } catch (error) {
    console.error('[moderationService.actionOnReport]', error);
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update report' },
    };
  }
}

export async function suspend(
  target_type: string,
  target_id: string,
  reason?: string,
  until?: string,
): Promise<ApiResponse<null>> {
  try {
    const ok = await q.suspendEntity(target_type, target_id, reason, until);
    if (!ok)
      return {
        success: false,
        error: { code: 'CONFLICT', message: 'Failed to suspend entity' },
      };
    return { success: true };
  } catch (error) {
    console.error('[moderationService.suspend]', error);
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to suspend entity' },
    };
  }
}

export async function warn(
  target_type: string,
  target_id: string,
  message: string,
): Promise<ApiResponse<null>> {
  try {
    const ok = await q.warnEntity(target_type, target_id, message);
    if (!ok)
      return {
        success: false,
        error: { code: 'CONFLICT', message: 'Failed to send warning' },
      };
    return { success: true };
  } catch (error) {
    console.error('[moderationService.warn]', error);
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to send warning' },
    };
  }
}
