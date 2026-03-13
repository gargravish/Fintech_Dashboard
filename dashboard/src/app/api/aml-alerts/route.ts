import { NextResponse } from 'next/server';
import { bigquery, DATASET_ID } from '@/lib/bigquery';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const query = `
      SELECT 
        transaction_id,
        user_id,
        alert_type,
        amount,
        timestamp
      FROM \`${bigquery.projectId}.${DATASET_ID}.aml_alerts\`
      ORDER BY timestamp DESC
      LIMIT 20
    `;
    
    const [rows] = await bigquery.query({ query, location: 'us-central1' });
    
    return NextResponse.json({ data: rows });
  } catch (error: any) {
    console.error('BigQuery Error (AML Alerts):', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
