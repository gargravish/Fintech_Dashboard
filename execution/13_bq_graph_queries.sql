-- ============================================================
-- Checkpoint 13: BigQuery GQL Queries for AML Detection
-- ============================================================
-- Run these GQL (Graph Query Language) queries natively in BigQuery
-- to detect topological anomalies such as layering, circular movement, 
-- or smurfing.
--
-- Note: BigQuery Property Graphs require explicit GQL syntax starting 
-- with GRAPH `dataset.graph` MATCH.
-- ============================================================

-- ── 1. Detect Multi-Hop Layering (3 Hops) ────────────────────
-- Identifies funds moving rapidly across multiple accounts to obscure origins.
-- Useful for catching "Layering" phases in ML.

GRAPH `${GCP_PROJECT_ID}.${BQ_DATASET}.aml_knowledge_graph`
MATCH (a:Account)-[t1:TRANSACTED]->(b:Account)-[t2:TRANSACTED]->(c:Account)-[t3:TRANSACTED]->(d:Account)
WHERE t1.amount > 5000 
  -- Ensure chronological flow to validate real layering
  AND t1.timestamp < t2.timestamp 
  AND t2.timestamp < t3.timestamp
RETURN 
  TO_JSON(a) AS Account_A, 
  TO_JSON(t1) AS Hop_1, 
  TO_JSON(b) AS Account_B, 
  TO_JSON(t2) AS Hop_2, 
  TO_JSON(c) AS Account_C,
  TO_JSON(t3) AS Hop_3,
  TO_JSON(d) AS Account_D;

-- ── 2. Detect Circular Asset Transfers ───────────────────────
-- Identifies funds looping back to the originating owner through an intermediary.
-- e.g. Node A -> B -> C -> A

GRAPH `${GCP_PROJECT_ID}.${BQ_DATASET}.aml_knowledge_graph`
MATCH (a:Account)-[t1:TRANSACTED]->(b:Account)-[t2:TRANSACTED]->(c:Account)-[t3:TRANSACTED]->(a:Account)
WHERE t1.timestamp < t2.timestamp AND t2.timestamp < t3.timestamp
RETURN 
  a.account_id AS Originating_Account, 
  b.account_id AS Intermediary_1, 
  c.account_id AS Intermediary_2, 
  t1.amount AS Init_Amount, 
  t3.amount AS Return_Amount;

-- ── 3. Detect Smurfing into a High-Risk Sink ───────────────
-- Identifies structural clustering where multiple retail accounts
-- funnel just-below-threshold amounts into a single target account.

GRAPH `${GCP_PROJECT_ID}.${BQ_DATASET}.aml_knowledge_graph`
MATCH (sender:Account)-[tx:TRANSACTED]->(target:Account)
WHERE tx.amount > 9000 AND tx.amount < 10000 -- Typical USA 10k CTR evasion
RETURN 
  target.account_id AS Target_Account, 
  COUNT(tx.transaction_id) AS Structuring_Deposit_Count,
  SUM(tx.amount) AS Total_Structured_Amount
-- GQL requires chaining statements for filtering aggregated results.
GROUP BY target.account_id
NEXT
FILTER WHERE Structuring_Deposit_Count > 3
RETURN 
  Target_Account, 
  Structuring_Deposit_Count, 
  Total_Structured_Amount
ORDER BY Total_Structured_Amount DESC;

-- ── 4. Unstructured Data Fusion (UBO Risk Flag) ───────────────
-- Utilizes the KYC edges extracted by Gemini/DocAI to find retail 
-- transactions hitting accounts secretly owned by high-risk entities.

GRAPH `${GCP_PROJECT_ID}.${BQ_DATASET}.aml_knowledge_graph`
MATCH (retail:Account)-[tx:TRANSACTED]->(shell:Account)<-[own:OWNS]-(ubo:Entity {risk_level: 'High Risk'})
RETURN 
  retail.account_id AS Sender,
  tx.amount AS Transfer_Amount,
  shell.account_id AS Receiving_Shell_Account,
  ubo.entity_id AS Hidden_Beneficiary;
