from google.cloud import bigquery
import os
from dotenv import load_dotenv

load_dotenv()

PROJECT_ID = os.getenv("GCP_PROJECT_ID")
DATASET_ID = os.getenv("BQ_DATASET", "aml_demo_ds")
TABLE_ID = "raw_transactions"

client = bigquery.Client(project=PROJECT_ID)
table_ref = f"{PROJECT_ID}.{DATASET_ID}.{TABLE_ID}"

try:
    table = client.get_table(table_ref)
    print(f"Table: {table_ref}")
    for schema_field in table.schema:
        print(f"{schema_field.name}: {schema_field.field_type}")
except Exception as e:
    print(f"Error getting table: {e}")
