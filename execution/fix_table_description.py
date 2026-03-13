from google.cloud import bigquery
import os
from dotenv import load_dotenv

load_dotenv()

PROJECT_ID = os.getenv("GCP_PROJECT_ID")
DATASET_ID = "aml_demo_ds"
client = bigquery.Client(project=PROJECT_ID)

def add_description():
    table_id = f"{PROJECT_ID}.{DATASET_ID}.raw_transactions"
    table = client.get_table(table_id)
    table.description = "Raw financial transactions ingested from Managed Kafka in real-time. Each row represents a single payment event."
    table = client.update_table(table, ["description"])
    print(f"Updated description for {table_id}: {table.description}")

if __name__ == "__main__":
    add_description()
