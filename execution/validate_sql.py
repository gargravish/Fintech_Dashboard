from google.cloud import bigquery
import os
from dotenv import load_dotenv

load_dotenv()

PROJECT_ID = os.getenv("GCP_PROJECT_ID")
client = bigquery.Client(project=PROJECT_ID)

# Read SQL from file
with open("execution/03_continuous_query.sql", "r") as f:
    sql = f.read()

# Replace variables if needed
sql = sql.replace("your_project", PROJECT_ID)
sql = sql.replace("aml_demo_ds", os.getenv("BQ_DATASET", "aml_demo_ds"))

# We need to ensure the target table schema allows NULLs for these columns (it should, as they are likely INTEGER/INT64)
# But dry run will tell us if there is a type mismatch (NULL is ambiguous, might need CAST(NULL as INT64))

job_config = bigquery.QueryJobConfig(dry_run=True, use_query_cache=False)

try:
    query_job = client.query(sql, job_config=job_config)
    print("This query will process {} bytes.".format(query_job.total_bytes_processed))
    print("SQL is valid.")
except Exception as e:
    print(f"SQL validation error: {e}")
