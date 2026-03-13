import { NextResponse } from 'next/server';
import { bigquery, DATASET_ID } from '@/lib/bigquery';
import { GoogleAuth } from 'google-auth-library';

export const dynamic = 'force-dynamic';

const LOCATION = 'us-central1';
const STORE_NAME = 'aml_online_store';
const VIEW_NAME_1 = 'user_baseline_14d_view';
const VIEW_NAME_2 = 'user_intraday_view';

async function fetchFeatureStoreData(userId: string, viewName: string, token: string, projectId: string) {
  const url = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${LOCATION}/featureOnlineStores/${STORE_NAME}/featureViews/${viewName}:fetchFeatureValues`;
  
  const payload = {
    data_key: { key: userId }
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`Vertex FS Error for ${userId}:`, errorText);
      return null;
    }

    return await res.json();
  } catch (error) {
    console.error(`Fetch Error for Vertex FS ${userId}:`, error);
    return null;
  }
}

export async function GET() {
  try {
    // 1. Get Top 5 active users from 15m window to have a starting point
    const query = `
      SELECT user_id 
      FROM \`${bigquery.projectId}.${DATASET_ID}.user_features_15m\`
      GROUP BY user_id
      ORDER BY MAX(last_updated) DESC
      LIMIT 5
    `;
    const [rows] = await bigquery.query({ query, location: 'us-central1' });
    const userIds = rows.map((r: any) => r.user_id);

    if (userIds.length === 0) {
       return NextResponse.json({ data: [] });
    }

    // 2. Get Google Auth token
    const auth = new GoogleAuth({
      scopes: 'https://www.googleapis.com/auth/cloud-platform'
    });
    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    const token = tokenResponse.token;

    if (!token) {
        throw new Error("Failed to obtain OAuth token");
    }

    // 3. Fetch from Feature Store for each user in parallel
    const enrichedData = await Promise.all(userIds.map(async (userId: string) => {
        const fsData1 = await fetchFeatureStoreData(userId, VIEW_NAME_1, token, bigquery.projectId);
        const fsData2 = await fetchFeatureStoreData(userId, VIEW_NAME_2, token, bigquery.projectId);
        
        let stats = {
            baseline_tx_count: 0,
            baseline_total_spend: 0,
            intraday_tx_count: 0,
            intraday_total_spend: 0
        };

        const parseData = (fsData: any) => {
            if (fsData && fsData.keyValues && fsData.keyValues.features) {
                const features = fsData.keyValues.features;
                features.forEach((f: any) => {
                    const name = f.name;
                    const valObj = f.value || {};
                    let val = 0;
                    if ('int64Value' in valObj) val = parseInt(valObj.int64Value);
                    else if ('doubleValue' in valObj) val = valObj.doubleValue;

                    if (name in stats) {
                         (stats as any)[name] = val;
                    }
                });
            }
        };

        parseData(fsData1);
        parseData(fsData2);

        return {
            user_id: userId,
            ...stats
        };
    }));

    return NextResponse.json({ 
      data: enrichedData,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('API Vertex FS Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
