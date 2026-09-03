import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/services/authService';
import { healthStoreRepository } from '@/lib/repositories/healthStoreRepository';
import { generateExportData } from '@/lib/storage';
import { toHttpError } from '@/lib/http';

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const format: 'json' | 'csv' = body?.format === 'csv' ? 'csv' : 'json';

    const store = await healthStoreRepository.load(session.userId, session.tenantId);
    if (!store) {
      return NextResponse.json(
        { success: false, error: 'No data found for account' },
        { status: 404 }
      );
    }

    const { content, filename, mimeType } = generateExportData(store, format);

    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    const e = toHttpError(err);
    return NextResponse.json({ success: false, error: e.message }, { status: e.status });
  }
}
