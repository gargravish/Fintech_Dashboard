from google.cloud import bigquery
from google.api_core.exceptions import NotFound
import os
from dotenv import load_dotenv

load_dotenv()

PROJECT_ID = os.getenv("GCP_PROJECT_ID")
DATASET_ID = os.getenv("BQ_DATASET", "aml_demo_ds")

client = bigquery.Client(project=PROJECT_ID)

def create_resources():
    # 1. Create Dataset
    dataset_ref = f"{PROJECT_ID}.{DATASET_ID}"
    try:
        client.get_dataset(dataset_ref)
        print(f"Dataset {dataset_ref} already exists.")
    except NotFound:
        print(f"Creating dataset {dataset_ref}...")
        dataset = bigquery.Dataset(dataset_ref)
        dataset.location = "us"
        client.create_dataset(dataset)
        print("Dataset created.")

    # 2. Create Table
    table_ref = f"{dataset_ref}.raw_transactions"
    schema = [
        bigquery.SchemaField("transaction_id", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("user_id", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("amount", "FLOAT", mode="NULLABLE"),
        bigquery.SchemaField("timestamp", "TIMESTAMP", mode="NULLABLE"),
        bigquery.SchemaField("merchant", "STRING", mode="NULLABLE"),
        bigquery.SchemaField("category", "STRING", mode="NULLABLE"),
        bigquery.SchemaField("currency", "STRING", mode="NULLABLE"),
        bigquery.SchemaField("country", "STRING", mode="NULLABLE"),
    ]

    try:
        client.get_table(table_ref)
        print(f"Table {table_ref} already exists.")
    except NotFound:
        print(f"Creating table {table_ref}...")
        table = bigquery.Table(table_ref, schema=schema)
        client.create_table(table)
        print("Table created.")

if __name__ == "__main__":
    create_resources()
