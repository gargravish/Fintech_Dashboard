#!/usr/bin/env python3
"""
============================================================
Checkpoint 10: Real-Time Inference Microservice (FastAPI)
============================================================
Fetches aggregated feature state (14-day + intraday) from
Vertex AI Feature Store and evaluates transaction risk.

Usage:
    uvicorn execution.10_inference_api:app --reload --port 8080
============================================================
"""

import os
import logging
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import google.auth
from google.auth.transport.requests import AuthorizedSession
from dotenv import load_dotenv

# ── Configuration ────────────────────────────────────────────
load_dotenv()

PROJECT_ID = os.getenv("GCP_PROJECT_ID")
LOCATION = os.getenv("GCP_LOCATION", "us-central1")
STORE_NAME = "aml_online_store"
VIEW_NAME_1 = "user_baseline_14d_view"
VIEW_NAME_2 = "user_intraday_view"

# ── FastAPI App ──────────────────────────────────────────────
app = FastAPI(title="AML Real-Time Inference Service")

# ── Helper for Feature Store REST ──────────────────────────────
class FeatureStoreClient:
    def __init__(self):
        # AuthorizedSession handles OAuth token refresh automatically
        credentials, _ = google.auth.default()
        self.session = AuthorizedSession(credentials)

    def fetch_features(self, user_id: str, view_name: str):
        url = (
            f"https://{LOCATION}-aiplatform.googleapis.com/v1/"
            f"projects/{PROJECT_ID}/locations/{LOCATION}/"
            f"featureOnlineStores/{STORE_NAME}/featureViews/{view_name}:fetchFeatureValues"
        )
        payload = {
            "data_key": { "key": user_id }
        }
        try:
            # logging.debug(f"Fetching from {url}")
            response = self.session.post(url, json=payload)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logging.warning(f"Failed to fetch features from {view_name} for {user_id}: {e}")
            return {} # Return empty on failure to blend gracefully

fs_client = FeatureStoreClient()

# ── Request/Response Models ──────────────────────────────────
class Transaction(BaseModel):
    user_id: str
    amount: float
    merchant: str = "Unknown"

class InferenceResult(BaseModel):
    user_id: str
    amount: float
    current_15_day_avg: float
    is_alert: bool
    reason: str = ""
    feature_source: str = "Vertex AI Feature Store"
    stats: dict

# ── Endpoints ────────────────────────────────────────────────
@app.post("/predict", response_model=InferenceResult)
async def predict_transaction(txn: Transaction):
    user_id = txn.user_id
    amount = txn.amount

    # 1. Fetch Features from Vertex AI (Both views)
    feat_1 = fs_client.fetch_features(user_id, VIEW_NAME_1)
    feat_2 = fs_client.fetch_features(user_id, VIEW_NAME_2)
    
    # 2. Parse Features into a single stats map
    stats = {
        'baseline_tx_count': 0,
        'baseline_total_spend': 0.0,
        'intraday_tx_count': 0,
        'intraday_total_spend': 0.0
    }

    def parse_and_accumulate(feature_data):
        try:
            if 'keyValues' in feature_data and 'features' in feature_data['keyValues']:
                features = feature_data['keyValues']['features']
                for f in features:
                    name = f.get('name')
                    value_obj = f.get('value', {})
                    
                    val = 0
                    if 'int64Value' in value_obj:
                        val = int(value_obj['int64Value'])
                    elif 'doubleValue' in value_obj:
                        val = float(value_obj['doubleValue'])
                    
                    if name in stats:
                        stats[name] = val
        except Exception as e:
            logging.warning(f"Parsing Warning: {e}")

    parse_and_accumulate(feat_1)
    parse_and_accumulate(feat_2)

    # 3. Combine Hybrid Features
    batch_spend = stats['baseline_total_spend'] or 0.0
    batch_count = stats['baseline_tx_count'] or 0
    intraday_spend = stats['intraday_total_spend'] or 0.0
    intraday_count = stats['intraday_tx_count'] or 0

    total_spend = batch_spend + intraday_spend + amount
    total_count = batch_count + intraday_count + 1

    current_15d_avg = total_spend / total_count if total_count > 0 else 0.0

    # 4. Evaluate Alert Logic
    # Condition 1: Amount > 2 * 15-day average
    # Condition 2: Amount > 500 (avoid noise for small users)
    is_alert = False
    reason = ""

    if current_15d_avg > 0 and amount > 2 * current_15d_avg and amount > 500:
         is_alert = True
         reason = f"Unusual spend: Amount (${amount:.2f}) is > 2x the 15-day moving average (${current_15d_avg:.2f})"

    # 5. Return Result
    return InferenceResult(
        user_id=user_id,
        amount=amount,
        current_15_day_avg=current_15d_avg,
        is_alert=is_alert,
        reason=reason,
        stats={
            **stats,
            'combined_total_spend': total_spend - amount, # Excluding current
            'combined_total_count': total_count - 1
        }
    )

@app.get("/health")
def health():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    logging.basicConfig(level=logging.INFO)
    uvicorn.run("execution.10_inference_api:app", host="0.0.0.0", port=8080)
