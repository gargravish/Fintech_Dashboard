-- ============================================================
-- Checkpoint 8: 14-Day Batch Baseline Calculation
-- ============================================================
-- Calculates transaction aggregates for the last 14 days.
-- Runs nightly to populate user_baseline_14d for Vertex AI FS.
--
-- Prerequisites:
--   Replace `${GCP_PROJECT_ID}` and `aml_demo` with actual values if needed,
--   or use dynamic variables in execution script.
-- ============================================================

-- Clear existing data if re-running for the same day (or let Vertex pick latest)
-- For the demo, we append to maintain history.

INSERT INTO `${GCP_PROJECT_ID}.${BQ_DATASET}.user_baseline_14d` (
    user_id,
    baseline_tx_count,
    baseline_total_spend,
    intraday_tx_count,
    intraday_total_spend,
    feature_timestamp
)
SELECT
    user_id,
    COUNT(*) as baseline_tx_count,
    SUM(amount) as baseline_total_spend,
    0 as intraday_tx_count,
    0.0 as intraday_total_spend,
    CURRENT_TIMESTAMP() as feature_timestamp
FROM
    `${GCP_PROJECT_ID}.${BQ_DATASET}.raw_transactions`
WHERE
    timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 14 DAY)
GROUP BY
    user_id;
