-- ============================================================
-- Checkpoint 7: Conversational Agent on BigQuery
-- ============================================================
-- BigQuery Studio includes a built-in Conversational Analytics
-- Agent (Gemini in BigQuery). This file documents how to use it
-- with our AML demo tables.
--
-- NO SETUP SQL REQUIRED — the agent is built into BQ Studio.
-- Just open BigQuery Studio and start chatting!
--
-- Below are sample natural language queries you can ask the
-- Conversational Agent, plus the equivalent SQL it will generate.
-- ============================================================

-- ============================================================
-- STEP 1: Enable Gemini in BigQuery (one-time, via Console)
-- ============================================================
-- 1. Go to BigQuery Studio in the Google Cloud Console
-- 2. Click the "Gemini" icon (✦) in the toolbar
-- 3. Accept the terms if prompted
-- 4. The conversational agent is now ready
--
-- Ensure the Gemini for Google Cloud API is enabled:
--   gcloud services enable cloudaicompanion.googleapis.com \
--       --project=YOUR_PROJECT_ID


-- ============================================================
-- STEP 2: Sample Conversational Queries
-- ============================================================
-- Copy-paste these into the Gemini chat in BQ Studio.
-- The agent will generate and execute the SQL for you.

-- ── Query 1: "Who are the top spenders in the last hour?" ────
-- Expected generated SQL:
SELECT user_id, total_spend_1h, tx_count_1h
FROM `your_project.aml_demo_ds.user_features`
ORDER BY total_spend_1h DESC
LIMIT 10;

-- ── Query 2: "Show me users with transactions in multiple countries" ──
-- Expected generated SQL:
SELECT user_id, distinct_countries_1h, total_spend_1h, tx_count_1h
FROM `your_project.aml_demo_ds.user_features`
WHERE distinct_countries_1h > 1
ORDER BY distinct_countries_1h DESC;

-- ── Query 3: "What AML recommendations were generated?" ─────
-- Expected generated SQL:
SELECT user_id, recommendation, generated_at
FROM `your_project.aml_demo_ds.user_recommendations`
ORDER BY generated_at DESC
LIMIT 10;

-- ── Query 4: "Which users look suspicious?" ─────────────────
-- Expected generated SQL (agent should reason about thresholds):
SELECT
    user_id,
    tx_count_1h,
    total_spend_1h,
    distinct_countries_1h,
    CASE
        WHEN total_spend_1h > 5000 AND distinct_countries_1h > 2 THEN 'HIGH RISK'
        WHEN total_spend_1h > 2000 OR tx_count_1h > 20 THEN 'MEDIUM RISK'
        ELSE 'LOW RISK'
    END AS risk_level
FROM `your_project.aml_demo_ds.user_features`
QUALIFY ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY last_updated DESC) = 1
ORDER BY total_spend_1h DESC;

-- ── Query 5: "What new features were suggested by AI?" ──────
-- Expected generated SQL:
SELECT source_table, new_feature_ideas
FROM `your_project.aml_demo_ds.feature_ideation`
ORDER BY generated_at DESC
LIMIT 5;

-- ── Query 6: "Summarize the spending patterns by category" ──
-- Expected generated SQL:
SELECT
    category,
    COUNT(*) AS transaction_count,
    SUM(amount) AS total_amount,
    AVG(amount) AS avg_amount,
    COUNT(DISTINCT user_id) AS unique_users
FROM `your_project.aml_demo_ds.raw_transactions`
WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR)
GROUP BY category
ORDER BY total_amount DESC;


-- ============================================================
-- STEP 3: Advanced — Data Canvas (Optional)
-- ============================================================
-- BigQuery Data Canvas provides a visual, AI-powered interface
-- for exploring data. To use with this demo:
-- 1. Open BigQuery Studio → Data Canvas
-- 2. Drag in user_features and user_recommendations tables
-- 3. Ask natural language questions about the data
-- 4. The canvas will auto-generate visualizations
