from google.cloud import bigquery
import os
from dotenv import load_dotenv

load_dotenv()

PROJECT_ID = os.getenv("GCP_PROJECT_ID")
DATASET_ID = os.getenv("BQ_DATASET", "aml_demo_ds")
client = bigquery.Client(project=PROJECT_ID)

query = f"""
    SELECT *
    FROM `{PROJECT_ID}.{DATASET_ID}.user_features`
    ORDER BY last_updated DESC
    LIMIT 10
"""

try:
    query_job = client.query(query)
    results = list(query_job.result())
    print(f"Found {len(results)} rows.")
    for row in results:
        print(dict(row))
except Exception as e:
    print(f"Error querying BigQuery: {e}")
