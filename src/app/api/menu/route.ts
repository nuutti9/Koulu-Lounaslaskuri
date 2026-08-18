import { NextRequest, NextResponse } from 'next/server';
import { getMenuForSchool } from '../../../lib/menu';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const schoolId = searchParams.get('school');

  if (!schoolId) {
    return NextResponse.json({ error: 'Missing school parameter' }, { status: 400 });
  }

  try {
    const data = await getMenuForSchool(schoolId);
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600'
      }
    });
  } catch (error: any) {
    console.error('API Error:', error);
    if (error.message === 'School not found') {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to fetch menu data' }, { status: 500 });
  }
}
