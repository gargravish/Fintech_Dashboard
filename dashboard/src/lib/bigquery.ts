import { BigQuery } from '@google-cloud/bigquery';

// Configure BQ Client
// Ensure GOOGLE_APPLICATION_CREDENTIALS is set in .env or environment
export const bigquery = new BigQuery({
  projectId: process.env.NEXT_PUBLIC_GCP_PROJECT_ID || 'raves-altostrat',
  location: 'us-central1',
});

export const DATASET_ID = 'aml_demo_ds';
