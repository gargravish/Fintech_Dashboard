#!/usr/bin/env python3
"""
============================================================
Checkpoint 8: Vertex AI Feature Store (V2) Setup
============================================================
Provisions a FeatureOnlineStore (Bigtable) and a FeatureView
pointing to the BigQuery baseline table.

Usage:
    python execution/08_vertex_fs_setup.py
============================================================
"""

import os
import sys
import argparse
from google.cloud import aiplatform
from dotenv import load_dotenv

# We use the preview SDK for Feature Store V2 resource creation
try:
    from vertexai.resources.preview import feature_store
except ImportError:
    print("Error: vertexai.resources.preview not found. Update to latest google-cloud-aiplatform.")
    sys.exit(1)

# ── Configuration ────────────────────────────────────────────
load_dotenv()

PROJECT_ID = os.getenv("GCP_PROJECT_ID")
LOCATION = os.getenv("GCP_LOCATION", "us-central1")
DATASET_ID = os.getenv("BQ_DATASET", "aml_demo_ds")
TABLE_ID = "user_baseline_14d"

# Specific names for Feature Store resources
STORE_NAME = "aml_online_store"
VIEW_NAME = "user_baseline_14d_view"

if not PROJECT_ID:
    print("Error: GCP_PROJECT_ID must be set in .env")
    sys.exit(1)

def setup_feature_store():
    print(f"Initializing aiplatform in {LOCATION} for project {PROJECT_ID}...")
    aiplatform.init(project=PROJECT_ID, location=LOCATION)

    # 1. Create FeatureOnlineStore (Bigtable)
    # Allows directWrite for intraday updates
    print(f"Creating/Retrieving FeatureOnlineStore: {STORE_NAME}...")
    try:
        # Check if exists
        fos = feature_store.FeatureOnlineStore(STORE_NAME)
        print(f"FeatureOnlineStore {STORE_NAME} already exists.")
    except Exception:
        print(f"Creating FeatureOnlineStore {STORE_NAME} (Bigtable node)...")
        try:
            # create_bigtable_store is part of the preview resources
            fos = feature_store.FeatureOnlineStore.create_bigtable_store(
                STORE_NAME
            )
            print("FeatureOnlineStore creation triggered. Waiting to complete...")
            # creation is usually async or wait or completes synchronous in preview?
            # documentation says returns a resource. 
            print(f"FeatureOnlineStore {STORE_NAME} created/triggered.")
        except Exception as e:
            print(f"Failed to create online store: {e}")
            print("\nHint: Check if AI Platform Admin permissions are set.")
            sys.exit(1)

    # 2. Create FeatureView from BigQuery
    bq_uri = f"bq://{PROJECT_ID}.{DATASET_ID}.{TABLE_ID}"
    print(f"Creating FeatureView {VIEW_NAME} pointing to {bq_uri}...")
    
    try:
        fv = fos.create_feature_view(
            name=VIEW_NAME,
            source=feature_store.utils.FeatureViewBigQuerySource(
                uri=bq_uri,
                entity_id_columns=["user_id"]
            ),
            # sync_config can be cron or continuous
            # Continuous requires Bigtable, but we want manual Sync for demo, or daily sync
            # cron: "0 1 * * *" (daily at 1AM) or continuous: True
            # PRD: "Trigger the initial FeatureViewSync" -> implies manual/trigger sync
        )
        print(f"FeatureView {VIEW_NAME} created successfully.")
    except Exception as e:
         print(f"Failed to create FeatureView or already exists: {e}")
         # If already exists we might want to update or get it
         try:
             fv = fos.get_feature_view(VIEW_NAME)
             print(f"Retrieved existing FeatureView {VIEW_NAME}.")
         except Exception:
             print("Could not retrieve FeatureView.")
             sys.exit(1)

    # 3. Trigger Initial Sync
    print("Triggering manual sync for FeatureView...")
    try:
        fv_sync = fv.sync()
        print("Sync triggered. Status will update in console.")
        # sync() returns operation or sync status object
        # print(fv_sync)
    except Exception as e:
        print(f"Sync trigger failed: {e}")

if __name__ == "__main__":
    setup_feature_store()
