import { BigQuery } from '@google-cloud/bigquery';

// Configure BQ Client
// Ensure GOOGLE_APPLICATION_CREDENTIALS is set in .env or environment
import { BigQuery } from '@google-cloud/bigquery';

const projectId = process.env.NEXT_PUBLIC_GCP_PROJECT_ID;
const datasetId = process.env.NEXT_PUBLIC_BQ_DATASET || 'aml_demo_ds';

if (!projectId) {
  console.warn("WARNING: NEXT_PUBLIC_GCP_PROJECT_ID is not set. BigQuery client might fail.");
}

export const bigquery = new BigQuery({
  projectId: projectId,
  location: 'us-central1',
});

export const DATASET_ID = datasetId;
