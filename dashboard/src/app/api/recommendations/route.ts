import { NextResponse } from 'next/server';
import { bigquery, DATASET_ID } from '@/lib/bigquery';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const query = `
      SELECT 
        user_id,
        recommendation,
        status,
        safety_attributes,
        generated_at
      FROM \`${bigquery.projectId}.${DATASET_ID}.user_recommendations\`
      WHERE recommendation IS NOT NULL
      ORDER BY generated_at DESC
      LIMIT 20
    `;
    
    const [rows] = await bigquery.query({ query, location: 'us-central1' });
    
    return NextResponse.json({ data: rows });
  } catch (error: any) {
    console.error('BigQuery Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
