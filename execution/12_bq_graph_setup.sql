-- ============================================================
-- Checkpoint 12: BigQuery Graph Setup for AML
-- ============================================================
-- This script transforms the tabular real-time structured data 
-- and simulated unstructured entity extractions into a topological 
-- Knowledge Graph using BigQuery Graph (GQL).
--
-- Prerequisites:
--   1. Replace `${GCP_PROJECT_ID}` with your GCP project ID
--   2. Replace `${BQ_DATASET}` with your dataset name
-- ============================================================

-- ── 1. Create Node Table(s) ──────────────────────────────────
-- Unify senders (user_id) and receivers (merchant) into a single 
-- "Account" node table for topological routing.

CREATE OR REPLACE TABLE `${GCP_PROJECT_ID}.${BQ_DATASET}.account_nodes` AS
SELECT DISTINCT user_id AS account_id, 'Retail' AS account_type 
FROM `${GCP_PROJECT_ID}.${BQ_DATASET}.raw_transactions`
UNION DISTINCT
SELECT DISTINCT merchant AS account_id, 'Merchant/P2P' AS account_type 
FROM `${GCP_PROJECT_ID}.${BQ_DATASET}.raw_transactions`;

-- (Optional) Example: Simulated Unstructured KYC Entity Nodes extracted via Gemini
CREATE OR REPLACE TABLE `${GCP_PROJECT_ID}.${BQ_DATASET}.kyc_entity_nodes` AS
SELECT 'Shell_Corp_1' AS entity_id, 'Company' AS entity_type, 'High Risk' AS risk_level
UNION ALL
SELECT 'Jane_Doe_UBO' AS entity_id, 'Person' AS entity_type, 'Monitor' AS risk_level;

-- ── 2. Create Edge Table(s) ──────────────────────────────────
-- Map the relational transactions to active edges.
CREATE OR REPLACE TABLE `${GCP_PROJECT_ID}.${BQ_DATASET}.edges_transactions` AS
SELECT 
    user_id AS source_account, 
    merchant AS target_account, 
    amount, 
    timestamp, 
    transaction_id,
    currency,
    country
FROM `${GCP_PROJECT_ID}.${BQ_DATASET}.raw_transactions`;

-- (Optional) Example: Simulated Unstructured Ownership Edges extracted via Gemini
CREATE OR REPLACE TABLE `${GCP_PROJECT_ID}.${BQ_DATASET}.edges_kyc_ownership` AS
SELECT 'Jane_Doe_UBO' AS owner_entity, 'Shell_Corp_1' AS owned_account, 'UBO_extracted_from_PDF' AS source_doc;


-- ── 3. Create the Property Graph ──────────────────────────────
-- Bind the logical tables together natively in BigQuery.
CREATE OR REPLACE PROPERTY GRAPH `${GCP_PROJECT_ID}.${BQ_DATASET}.aml_knowledge_graph`
  NODE TABLES (
    `${GCP_PROJECT_ID}.${BQ_DATASET}.account_nodes` AS Account 
      KEY (account_id) LABEL Account,
      
    `${GCP_PROJECT_ID}.${BQ_DATASET}.kyc_entity_nodes` AS Entity 
      KEY (entity_id) LABEL Entity
  )
  EDGE TABLES (
    `${GCP_PROJECT_ID}.${BQ_DATASET}.edges_transactions` AS Transacted
      KEY (transaction_id)
      SOURCE KEY (source_account) REFERENCES Account(account_id)
      DESTINATION KEY (target_account) REFERENCES Account(account_id)
      LABEL TRANSACTED,
      
    `${GCP_PROJECT_ID}.${BQ_DATASET}.edges_kyc_ownership` AS Owns
      KEY (owner_entity, owned_account)
      SOURCE KEY (owner_entity) REFERENCES Entity(entity_id)
      DESTINATION KEY (owned_account) REFERENCES Account(account_id)
      LABEL OWNS
  );

-- The graph is now live. Proceed to 13_bq_graph_queries.sql to analyze topological AML vectors.
