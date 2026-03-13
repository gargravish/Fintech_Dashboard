from google.cloud import bigquery
import os
from dotenv import load_dotenv

load_dotenv()

PROJECT_ID = os.getenv("GCP_PROJECT_ID")
DATASET_ID = os.getenv("BQ_DATASET", "aml_demo_ds")
client = bigquery.Client(project=PROJECT_ID)

tables = ["user_features_15m", "user_features_30m", "user_features_60m"]

for table_name in tables:
    query = f"""
        SELECT *
        FROM `{PROJECT_ID}.{DATASET_ID}.{table_name}`
        ORDER BY last_updated DESC
        LIMIT 5
    """
    print(f"--- Checking {table_name} ---")
    try:
        query_job = client.query(query)
        results = list(query_job.result())
        print(f"Found {len(results)} rows.")
        if results:
            print(dict(results[0]))
    except Exception as e:
        print(f"Error checking {table_name}: {e}")
