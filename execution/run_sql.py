#!/usr/bin/env python3
import os
import sys
from google.cloud import bigquery
from dotenv import load_dotenv

load_dotenv()

PROJECT_ID = os.getenv("GCP_PROJECT_ID")

if len(sys.argv) < 2:
    print("Usage: python run_sql.py <sql_file>")
    sys.exit(1)

sql_file = sys.argv[1]

if not os.path.exists(sql_file):
    print(f"File not found: {sql_file}")
    sys.exit(1)

with open(sql_file, 'r') as f:
    query = f.read()

print(f"Executing {sql_file} in project {PROJECT_ID}...")
client = bigquery.Client(project=PROJECT_ID)

try:
    # client.query can run multiple statements separated by ';'
    job = client.query(query)
    job.result() # Wait for job to finish
    print("Execution successful.")
except Exception as e:
    print(f"Error executing query: {e}")
    sys.exit(1)
