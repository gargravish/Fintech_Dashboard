#!/bin/bash
# ============================================================
# Checkpoint 4: Setup BigQuery ↔ Vertex AI External Connection
# ============================================================
# Creates a Cloud Resource connection that allows BQML to call
# Vertex AI / Gemini models via ML.GENERATE_TEXT.
#
# Usage:
#   bash execution/04_setup_bq_connection.sh
# ============================================================

set -euo pipefail

# Load environment variables
source .env

echo "============================================================"
echo " AML Demo: BigQuery ↔ Vertex AI Connection Setup"
echo "============================================================"

# ── Step 1: Enable APIs ──────────────────────────────────────
echo ""
echo ">> Step 1: Enabling required APIs..."
gcloud services enable \
    bigqueryconnection.googleapis.com \
    aiplatform.googleapis.com \
    --project="${GCP_PROJECT_ID}"

# ── Step 2: Create Cloud Resource Connection ─────────────────
echo ""
echo ">> Step 2: Creating BigQuery external connection '${BQ_CONNECTION_ID}'..."

bq mk \
    --connection \
    --location="${GCP_LOCATION}" \
    --project_id="${GCP_PROJECT_ID}" \
    --connection_type=CLOUD_RESOURCE \
    "${BQ_CONNECTION_ID}" \
    2>/dev/null || echo "   Connection may already exist, continuing..."

# ── Step 3: Get the service account from the connection ──────
echo ""
echo ">> Step 3: Retrieving connection service account..."

SERVICE_ACCOUNT=$(bq show \
    --connection \
    --location="${GCP_LOCATION}" \
    --project_id="${GCP_PROJECT_ID}" \
    "${BQ_CONNECTION_ID}" \
    --format=json | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(data.get('cloudResource', {}).get('serviceAccountId', 'NOT_FOUND'))
")

echo "   Service Account: ${SERVICE_ACCOUNT}"

# ── Step 4: Grant Vertex AI User role to the service account ─
echo ""
echo ">> Step 4: Granting Vertex AI User role..."

gcloud projects add-iam-policy-binding "${GCP_PROJECT_ID}" \
    --member="serviceAccount:${SERVICE_ACCOUNT}" \
    --role="roles/aiplatform.user" \
    --condition=None \
    --quiet

echo "   ✅ Vertex AI User role granted to ${SERVICE_ACCOUNT}"

# ── Step 5: Verify connection ────────────────────────────────
echo ""
echo ">> Step 5: Verifying connection..."
bq show \
    --connection \
    --location="${GCP_LOCATION}" \
    --project_id="${GCP_PROJECT_ID}" \
    "${BQ_CONNECTION_ID}"

echo ""
echo "============================================================"
echo " ✅ BigQuery ↔ Vertex AI connection ready!"
echo " Connection path: projects/${GCP_PROJECT_ID}/locations/${GCP_LOCATION}/connections/${BQ_CONNECTION_ID}"
echo " You can now run 04_remote_model.sql in BigQuery Console."
echo "============================================================"
