from google.cloud import bigquery
import os
import time

PROJECT_ID = "raves-altostrat"
DATASET_ID = "aml_demo_ds"
client = bigquery.Client(project=PROJECT_ID)

def run_sql_file(file_path):
    print(f"\n--- Executing {file_path} ---", flush=True)
    with open(file_path, 'r') as f:
        sql = f.read()
    
    # Replace placeholders
    sql = sql.replace("your_project", PROJECT_ID)
    sql = sql.replace("aml_demo_ds", DATASET_ID)
    
    # Run query
    try:
        query_job = client.query(sql)
        query_job.result() # Wait for completion
        print("✅ Query completed successfully.")
    except Exception as e:
        print(f"❌ Query failed: {e}")
        return False
    return True

def diagnose_recommendations():
    print("\n--- Diagnosing Recommendations ---")
    table_id = f"{PROJECT_ID}.{DATASET_ID}.user_recommendations"
    
    # Check for NULLs
    query = f"SELECT count(*) as total, countif(recommendation is null) as null_count FROM `{table_id}`"
    rows = list(client.query(query).result())
    total, nulls = rows[0].total, rows[0].null_count
    print(f"Total Rows: {total}, Null Recommendations: {nulls}")
    
    if nulls > 0:
        print("⚠️ Found NULL recommendations. CARRYING OUT INVESTIGATION...")
        # Check the status of the NULL rows from the table itself
        status_query = f"SELECT status, safety_attributes FROM `{table_id}` WHERE recommendation IS NULL LIMIT 1"
        status_rows = list(client.query(status_query).result())
        if status_rows:
            print(f"NULL Row Status: {status_rows[0].status}")
            print(f"NULL Row Safety: {status_rows[0].safety_attributes}")

def diagnose_ideation():
    print("\n--- Diagnosing Feature Ideation ---")
    table_id = f"{PROJECT_ID}.{DATASET_ID}.feature_ideation"
    
    query = f"SELECT * FROM `{table_id}` LIMIT 1"
    rows = list(client.query(query).result())
    if not rows:
        print("⚠️ Feature Ideation table is EMPTY.")
        # Check description again
        desc_query = f"""
            SELECT option_value
            FROM `{PROJECT_ID}.{DATASET_ID}.INFORMATION_SCHEMA.TABLE_OPTIONS`
            WHERE table_name = 'raw_transactions' AND option_name = 'description'
        """
        desc_rows = list(client.query(desc_query).result())
        if not desc_rows:
             print("❌ CRITICAL: 'raw_transactions' table description is MISSING. This is why ideation is empty.")
        else:
             print(f"✅ 'raw_transactions' description exists: {desc_rows[0].option_value}")
    else:
        print("✅ Feature Ideation has data:")
        print(rows[0])

if __name__ == "__main__":
    # 1. Run Recommendations
    if run_sql_file("execution/04_recommendations.sql"):
        diagnose_recommendations()
    
    # 2. Run Ideation
    if run_sql_file("execution/04_feature_ideation.sql"):
        diagnose_ideation()
