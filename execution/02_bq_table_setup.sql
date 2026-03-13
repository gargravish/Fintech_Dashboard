-- ============================================================
-- Checkpoint 2: BigQuery Table Setup (DDL)
-- ============================================================
-- Copy-paste this into BigQuery Console to create all tables.
--
-- Prerequisites:
--   1. Create dataset first (or uncomment the CREATE SCHEMA below)
--   2. Replace `raves-altostrat` with your GCP project ID
--   3. Replace `aml_demo_ds` with your dataset name
-- ============================================================

-- ── Create Dataset (run once) ────────────────────────────────
-- CREATE SCHEMA IF NOT EXISTS `raves-altostrat.aml_demo_ds`
-- OPTIONS (
--     location = 'us',
--     description = 'AML Real-Time Feature Engineering & AI Demo'
-- );

-- ── 1. Raw Transactions Table ────────────────────────────────
CREATE TABLE IF NOT EXISTS `raves-altostrat.aml_demo_ds.raw_transactions` (
    transaction_id STRING NOT NULL,
    user_id        STRING NOT NULL,
    amount         FLOAT64,
    timestamp      TIMESTAMP,
    merchant       STRING,
    category       STRING,
    currency       STRING,
    country        STRING
)
OPTIONS (
    description = 'Raw financial transactions ingested from Pub/Sub in real-time.'
);


-- ── 2. User Features Tables (Real-Time Aggregates) ──────────
-- Populated by the Dataflow pipeline in Checkpoint 3.
-- Sliding-window aggregates supporting AML detection.

-- 15 Minute Aggregates
CREATE TABLE IF NOT EXISTS `raves-altostrat.aml_demo_ds.user_features_15m` (
    user_id              STRING NOT NULL,
    tx_count             INT64,
    total_spend          FLOAT64,
    avg_amount           FLOAT64,
    distinct_merchants   INT64,
    distinct_countries   INT64,
    max_amount           FLOAT64,
    near_threshold_count INT64,
    last_updated         TIMESTAMP
);

-- 30 Minute Aggregates
CREATE TABLE IF NOT EXISTS `raves-altostrat.aml_demo_ds.user_features_30m` (
    user_id              STRING NOT NULL,
    tx_count             INT64,
    total_spend          FLOAT64,
    avg_amount           FLOAT64,
    distinct_merchants   INT64,
    distinct_countries   INT64,
    max_amount           FLOAT64,
    near_threshold_count INT64,
    last_updated         TIMESTAMP
);

-- 60 Minute Aggregates
CREATE TABLE IF NOT EXISTS `raves-altostrat.aml_demo_ds.user_features_60m` (
    user_id              STRING NOT NULL,
    tx_count             INT64,
    total_spend          FLOAT64,
    avg_amount           FLOAT64,
    distinct_merchants   INT64,
    distinct_countries   INT64,
    max_amount           FLOAT64,
    near_threshold_count INT64,
    last_updated         TIMESTAMP
);


-- ── 3. High-Risk Continuous Queries Landing Alert Table ──────
-- Populated by Continuous Queries in Checkpoint 6.
CREATE TABLE IF NOT EXISTS `raves-altostrat.aml_demo_ds.aml_alerts` (
    transaction_id STRING NOT NULL,
    user_id        STRING NOT NULL,
    alert_type     STRING,
    amount         FLOAT64,
    timestamp      TIMESTAMP
)
OPTIONS (
    description = 'Stateless alerts generated via BigQuery Continuous Queries running per-row scans.'
);


-- ── 4. User Recommendations Table (GenAI output) ────────────
CREATE TABLE IF NOT EXISTS `raves-altostrat.aml_demo_ds.user_recommendations` (
    user_id        STRING,
    recommendation STRING,
    status STRING,
    safety_attributes STRING,
    generated_at   TIMESTAMP
);


-- ── 5. Feature Ideation Table (GenAI output) ────────────────
CREATE TABLE IF NOT EXISTS `raves-altostrat.aml_demo_ds.feature_ideation` (
    source_table      STRING,
    new_feature_ideas STRING,
    generated_at      TIMESTAMP
);


-- ── 6. User 14-Day Baseline Table ──────────────────────────
-- Holds nightly aggregates synced to Vertex AI Feature Store.
CREATE TABLE IF NOT EXISTS `raves-altostrat.aml_demo_ds.user_baseline_14d` (  
    user_id              STRING NOT NULL,  
    baseline_tx_count    INT64,  
    baseline_total_spend FLOAT64,  
    intraday_tx_count    INT64,  
    intraday_total_spend FLOAT64,  
    feature_timestamp    TIMESTAMP -- Required for Vertex FS  
)
OPTIONS (
    description = 'Nightly 14-day aggregates synced to Vertex AI Feature Store for millisecond lookups.'
);
