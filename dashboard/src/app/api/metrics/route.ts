import { NextResponse } from 'next/server';
import { bigquery, DATASET_ID } from '@/lib/bigquery';

export const dynamic = 'force-dynamic'; // Disable caching

export async function GET() {
  try {
    // We want to get the LATEST stats for all users (or a specific user).
    // For individual user simulation, we might filter by user_id if provided.
    // For now, let's aggregate 'global' velocity to show activity in the system.
    
    // Aggregating max/sum across all users is expensive for real-time.
    // Instead, let's fetch the "Top 5 Most Active Users" in the last 15m.
    
    const query = `
      WITH recent_activity AS (
        SELECT 
          user_id, 
          tx_count, 
          total_spend, 
          max_amount,
          '15m' as duration
        FROM \`${bigquery.projectId}.${DATASET_ID}.user_features_15m\`
        ORDER BY last_updated DESC
        LIMIT 5
      )
      SELECT * FROM recent_activity
    `;

    // Also get global count attempt? (Optional)
    // Actually, let's just return the top active users for the dashboard table.
    
    const [rows] = await bigquery.query({ query, location: 'us-central1' });
    
    return NextResponse.json({ 
      data: rows,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('BigQuery Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
