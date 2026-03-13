CREATE OR REPLACE TABLE `${GCP_PROJECT_ID}.${BQ_DATASET}.user_intraday_live` (
    user_id STRING,
    intraday_tx_count INT64,
    intraday_total_spend FLOAT64,
    feature_timestamp TIMESTAMP
);
