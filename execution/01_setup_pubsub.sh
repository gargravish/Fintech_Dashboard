#!/bin/bash
# ============================================================
# Checkpoint 1: Setup Google Cloud Pub/Sub Topic & BigQuery Subscription
# ============================================================
# Prerequisites:
#   - gcloud CLI installed and authenticated
#   - APIs enabled: pubsub.googleapis.com
#
# Usage:
#   bash execution/01_setup_pubsub.sh
# ============================================================

set -euo pipefail

# Load environment variables
source .env

echo "============================================================"
echo " AML Demo: Pub/Sub Setup"
echo "============================================================"

# ── Step 1: Enable APIs ──────────────────────────────────────
echo ""
echo ">> Step 1: Enabling Pub/Sub API..."
gcloud services enable pubsub.googleapis.com \
    --project="${GCP_PROJECT_ID}"

# ── Step 2: Create Pub/Sub Topic ─────────────────────────────
echo ""
echo ">> Step 2: Creating Pub/Sub topic '${PUBSUB_TOPIC_ID}'..."

if ! gcloud pubsub topics describe "${PUBSUB_TOPIC_ID}" --project="${GCP_PROJECT_ID}" &>/dev/null; then
    gcloud pubsub topics create "${PUBSUB_TOPIC_ID}" \
        --project="${GCP_PROJECT_ID}"
    echo "   Topic created."
else
    echo "   Topic already exists."
fi

# ── Step 3: Grant Permissions (Service Account) ──────────────
echo ""
echo ">> Step 3: specific permission for bigquery..."
# The Pub/Sub service account needs permission to write to BigQuery
PROJECT_NUMBER=$(gcloud projects describe "${GCP_PROJECT_ID}" --format="value(projectNumber)")
PUBSUB_SA="service-${PROJECT_NUMBER}@gcp-sa-pubsub.iam.gserviceaccount.com"

echo "   Granting BigQuery Data Editor to ${PUBSUB_SA}..."
# This might fail if the binding already exists, but we'll try it.
# Ideally we should check first, but adding binding is idempotent-ish (it just says updated).
gcloud projects add-iam-policy-binding "${GCP_PROJECT_ID}" \
    --member="serviceAccount:${PUBSUB_SA}" \
    --role="roles/bigquery.dataEditor" \
    --condition=None \
    --quiet || echo "   Could not verify/add IAM binding. Ensure Pub/Sub SA has BigQuery Data Editor."


# ── Step 3.5: Create BigQuery Dataset/Table ──────────────────
echo ""
echo ">> Step 3.5: ensuring BigQuery resources exist..."

# Create dataset and table via Python (bq CLI might be broken)
python execution/setup_bq.py

# ── Step 4: Create BigQuery Subscription ─────────────────────
echo ""
echo ">> Step 4: Creating BigQuery Subscription '${PUBSUB_SUBSCRIPTION_ID}'..."

# We use --bigquery-use-table-schema to map JSON fields to BQ columns
if ! gcloud pubsub subscriptions describe "${PUBSUB_SUBSCRIPTION_ID}" --project="${GCP_PROJECT_ID}" &>/dev/null; then
    gcloud pubsub subscriptions create "${PUBSUB_SUBSCRIPTION_ID}" \
        --topic="${PUBSUB_TOPIC_ID}" \
        --project="${GCP_PROJECT_ID}" \
        --bigquery-table="${GCP_PROJECT_ID}:${BQ_DATASET}.raw_transactions" \
        --use-table-schema
    echo "   Subscription created."
else
    echo "   Subscription already exists."
fi

echo ""
echo "============================================================"
echo " ✅ Pub/Sub setup complete!"
echo "============================================================"
