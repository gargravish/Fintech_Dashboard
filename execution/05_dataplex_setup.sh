#!/bin/bash
# ============================================================
# Checkpoint 5: Dataplex Universal Catalog Setup
# ============================================================
# Creates a Dataplex lake and zone, attaches the BigQuery
# dataset as an asset, and enriches table metadata for
# AI grounding.
#
# Usage:
#   bash execution/05_dataplex_setup.sh
# ============================================================

set -euo pipefail

# Load environment variables
source .env

echo "============================================================"
echo " AML Demo: Dataplex Universal Catalog Setup"
echo "============================================================"

# ── Step 1: Enable APIs ──────────────────────────────────────
echo ""
echo ">> Step 1: Enabling Dataplex API..."
gcloud services enable \
    dataplex.googleapis.com \
    --project="${GCP_PROJECT_ID}"

# ── Step 2: Create Dataplex Lake ─────────────────────────────
echo ""
echo ">> Step 2: Creating Dataplex lake '${DATAPLEX_LAKE_ID}'..."

gcloud dataplex lakes create "${DATAPLEX_LAKE_ID}" \
    --location="${GCP_REGION}" \
    --project="${GCP_PROJECT_ID}" \
    --display-name="AML Demo Data Lake" \
    --description="Data lake for AML real-time feature engineering and AI recommendations demo" \
    2>/dev/null || echo "   Lake may already exist, continuing..."

# ── Step 3: Create Dataplex Zone ─────────────────────────────
echo ""
echo ">> Step 3: Creating Dataplex zone '${DATAPLEX_ZONE_ID}'..."

gcloud dataplex zones create "${DATAPLEX_ZONE_ID}" \
    --lake="${DATAPLEX_LAKE_ID}" \
    --location="${GCP_REGION}" \
    --project="${GCP_PROJECT_ID}" \
    --type=CURATED \
    --resource-location-type=SINGLE_REGION \
    --display-name="AML Demo Zone" \
    --description="Curated zone for AML feature engineering tables" \
    --discovery-enabled \
    2>/dev/null || echo "   Zone may already exist, continuing..."

# ── Step 4: Attach BigQuery Dataset as Asset ─────────────────
echo ""
echo ">> Step 4: Attaching BigQuery dataset '${BQ_DATASET}' as Dataplex asset..."

gcloud dataplex assets create "${BQ_DATASET}-asset" \
    --lake="${DATAPLEX_LAKE_ID}" \
    --zone="${DATAPLEX_ZONE_ID}" \
    --location="${GCP_REGION}" \
    --project="${GCP_PROJECT_ID}" \
    --resource-type=BIGQUERY_DATASET \
    --resource-name="projects/${GCP_PROJECT_ID}/datasets/${BQ_DATASET}" \
    --display-name="AML Demo BQ Dataset" \
    --description="BigQuery dataset containing raw transactions, real-time features, and AI recommendations" \
    --discovery-enabled \
    2>/dev/null || echo "   Asset may already exist, continuing..."

# ── Step 5: Update table descriptions via BQ (Dataplex reads these) ─
echo ""
echo ">> Step 5: Enriching table metadata (descriptions)..."

bq update --description="Raw financial transactions ingested from Managed Kafka. Fields: transaction_id, user_id, amount, timestamp, merchant, category, currency, country. Used for AML monitoring and real-time feature engineering." \
    "${GCP_PROJECT_ID}:${BQ_DATASET}.raw_transactions" 2>/dev/null || true

bq update --description="Real-time user-level aggregated features computed via BigQuery Continuous Queries. Features: tx_count_1h, total_spend_1h, avg_amount_1h, distinct_merchants_1h, distinct_countries_1h, max_amount_1h. Used for AML risk scoring and fraud detection." \
    "${GCP_PROJECT_ID}:${BQ_DATASET}.user_features" 2>/dev/null || true

bq update --description="AI-generated personalized financial recommendations and risk assessments. Produced by Gemini via BQML ML.GENERATE_TEXT based on real-time spending patterns." \
    "${GCP_PROJECT_ID}:${BQ_DATASET}.user_recommendations" 2>/dev/null || true

bq update --description="Gemini-suggested new predictive features for AML and fraud detection. Generated using Dataplex-enriched table metadata as context." \
    "${GCP_PROJECT_ID}:${BQ_DATASET}.feature_ideation" 2>/dev/null || true

# ── Step 6: Verify ───────────────────────────────────────────
echo ""
echo ">> Step 6: Verifying Dataplex setup..."

echo "--- Lakes ---"
gcloud dataplex lakes list \
    --location="${GCP_REGION}" \
    --project="${GCP_PROJECT_ID}"

echo ""
echo "--- Assets ---"
gcloud dataplex assets list \
    --lake="${DATAPLEX_LAKE_ID}" \
    --zone="${DATAPLEX_ZONE_ID}" \
    --location="${GCP_REGION}" \
    --project="${GCP_PROJECT_ID}"

echo ""
echo "============================================================"
echo " ✅ Dataplex Universal Catalog configured!"
echo " Tables are now discoverable with enriched metadata."
echo " AI agents can use this metadata for grounded responses."
echo "============================================================"
