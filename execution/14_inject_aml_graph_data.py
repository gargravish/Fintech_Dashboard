import os
from google.cloud import bigquery
from datetime import datetime, timedelta
import uuid

# Configuration parameters
PROJECT_ID = "raves-altostrat"
DATASET_ID = "aml_demo_ds"

def main():
    print(f"🔗 Connecting to BigQuery Dataset: {PROJECT_ID}.{DATASET_ID}")
    client = bigquery.Client(project=PROJECT_ID)
    
    # 1. Show available tables
    print("\n🔍 === Available Tables in Dataset ===")
    try:
        tables = list(client.list_tables(DATASET_ID))
        for table in tables:
            print(f"   - {table.table_id}")
    except Exception as e:
        print(f"Error fetching tables: {e}")
        return

    # 2. Inject synthetic transactions
    print("\n⚙️  Injecting Synthetic AML Topologies into `raw_transactions`...")
    now = datetime.utcnow()

    # Unique identifiers for synthetic hops
    tx1, tx2, tx3 = str(uuid.uuid4()), str(uuid.uuid4()), str(uuid.uuid4())
    tx4, tx5, tx6 = str(uuid.uuid4()), str(uuid.uuid4()), str(uuid.uuid4())
    tx7 = str(uuid.uuid4())

    insert_raw_tx_query = f"""
    INSERT INTO `{PROJECT_ID}.{DATASET_ID}.raw_transactions` 
    (transaction_id, user_id, amount, timestamp, merchant, category, currency, country)
    VALUES
      -- Pattern 1: Multi-Hop Layering
      ('{tx1}', 'Layer_Alice', 6000.0, TIMESTAMP('{now.strftime('%Y-%m-%d %H:%M:%S')}'), 'Layer_Bob', 'P2P_Transfer', 'USD', 'US'),
      ('{tx2}', 'Layer_Bob', 5900.0, TIMESTAMP('{(now + timedelta(minutes=5)).strftime('%Y-%m-%d %H:%M:%S')}'), 'Layer_Charlie', 'P2P_Transfer', 'USD', 'US'),
      ('{tx3}', 'Layer_Charlie', 5800.0, TIMESTAMP('{(now + timedelta(minutes=10)).strftime('%Y-%m-%d %H:%M:%S')}'), 'Layer_Dave', 'P2P_Transfer', 'USD', 'US'),

      -- Pattern 2: Circular Transfer
      ('{tx4}', 'Circ_Eve', 2500.0, TIMESTAMP('{now.strftime('%Y-%m-%d %H:%M:%S')}'), 'Circ_Frank', 'P2P_Transfer', 'USD', 'US'),
      ('{tx5}', 'Circ_Frank', 2400.0, TIMESTAMP('{(now + timedelta(minutes=2)).strftime('%Y-%m-%d %H:%M:%S')}'), 'Circ_Grace', 'P2P_Transfer', 'USD', 'US'),
      ('{tx6}', 'Circ_Grace', 2300.0, TIMESTAMP('{(now + timedelta(minutes=4)).strftime('%Y-%m-%d %H:%M:%S')}'), 'Circ_Eve', 'P2P_Transfer', 'USD', 'US'),

      -- Pattern 4: Entity Fusion (retail to shell)
      ('{tx7}', 'Innocent_Retail', 15000.0, TIMESTAMP('{now.strftime('%Y-%m-%d %H:%M:%S')}'), 'Shady_Shell_Corp', 'Investment', 'USD', 'US')
    """

    try:
        job = client.query(insert_raw_tx_query)
        job.result()
        print("✅ Successfully injected synthetic raw transactions.")
    except Exception as e:
        print(f"❌ Error inserting raw transactions: {e}")
        return

    # 3. Refresh Graph Base Tables and KYC Tables
    print("\n⚙️  Transforming `raw_transactions` into Graph Nodes & Edges...")
    
    refresh_graph_tables_query = f"""
    -- 1. Refresh Account Nodes
    CREATE OR REPLACE TABLE `{PROJECT_ID}.{DATASET_ID}.account_nodes` AS
    SELECT DISTINCT user_id AS account_id, 'Retail' AS account_type 
    FROM `{PROJECT_ID}.{DATASET_ID}.raw_transactions`
    UNION DISTINCT
    SELECT DISTINCT merchant AS account_id, 'Merchant/Account' AS account_type 
    FROM `{PROJECT_ID}.{DATASET_ID}.raw_transactions`;

    -- 2. Refresh Transaction Edges
    CREATE OR REPLACE TABLE `{PROJECT_ID}.{DATASET_ID}.edges_transactions` AS
    SELECT 
        user_id AS source_account, 
        merchant AS target_account, 
        amount, 
        timestamp, 
        transaction_id,
        currency,
        country
    FROM `{PROJECT_ID}.{DATASET_ID}.raw_transactions`;

    -- 3. Replace KYC entity nodes with explicit 'High Risk' UBO
    CREATE OR REPLACE TABLE `{PROJECT_ID}.{DATASET_ID}.kyc_entity_nodes` AS
    SELECT 'Shell_Corp_1' AS entity_id, 'Company' AS entity_type, 'Monitor' AS risk_level
    UNION ALL
    SELECT 'Jane_Doe' AS entity_id, 'Person' AS entity_type, 'Low Risk' AS risk_level
    UNION ALL
    SELECT 'Cartel_Boss' AS entity_id, 'Person' AS entity_type, 'High Risk' AS risk_level
    UNION ALL
    SELECT 'Shady_Shell_Corp' AS entity_id, 'Company' AS entity_type, 'High Risk' AS risk_level;

    -- 4. Replace Edge KYC Ownership
    CREATE OR REPLACE TABLE `{PROJECT_ID}.{DATASET_ID}.edges_kyc_ownership` AS
    SELECT 'Jane_Doe' AS owner_entity, 'Shell_Corp_1' AS owned_account, 'UBO_extracted_from_PDF' AS source_doc
    UNION ALL
    SELECT 'Cartel_Boss' AS owner_entity, 'Shady_Shell_Corp' AS owned_account, 'DocAI_Parsed_SAR' AS source_doc;
    
    -- 5. Always seamlessly recreate Property Graph to enforce binding rules and schema changes
    CREATE OR REPLACE PROPERTY GRAPH `{PROJECT_ID}.{DATASET_ID}.aml_knowledge_graph`
      NODE TABLES (
        `{PROJECT_ID}.{DATASET_ID}.account_nodes` AS Account 
          KEY (account_id) LABEL Account,
          
        `{PROJECT_ID}.{DATASET_ID}.kyc_entity_nodes` AS Entity 
          KEY (entity_id) LABEL Entity
      )
      EDGE TABLES (
        `{PROJECT_ID}.{DATASET_ID}.edges_transactions` AS Transacted
          KEY (transaction_id)
          SOURCE KEY (source_account) REFERENCES Account(account_id)
          DESTINATION KEY (target_account) REFERENCES Account(account_id)
          LABEL TRANSACTED,
          
        `{PROJECT_ID}.{DATASET_ID}.edges_kyc_ownership` AS Owns
          KEY (owner_entity, owned_account)
          SOURCE KEY (owner_entity) REFERENCES Entity(entity_id)
          DESTINATION KEY (owned_account) REFERENCES Account(account_id)
          LABEL OWNS
      );
    """

    try:
        job = client.query(refresh_graph_tables_query)
        job.result()
        print("✅ Graph node/edge resolution and compilation successful.")
    except Exception as e:
        print(f"❌ Error refreshing graph elements: {e}")
        return

    print("\n🚀 All Synthetic data created. Graph is populated!")
    print("👉 You can now execute the 4 queries in `13_bq_graph_queries.sql` in BigQuery Console.")

if __name__ == "__main__":
    main()
