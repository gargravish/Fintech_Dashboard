#!/usr/bin/env python3
"""
============================================================
REST-based Vertex AI Feature Store (V2) Setup
============================================================
Provisions a FeatureOnlineStore (Bigtable) and a FeatureView
using direct REST API calls. Bypasses preview SDK version limits.

Usage:
    python execution/08_vertex_fs_setup_rest.py
============================================================
"""

import os
import sys
import json
import time
from google.auth import default
from google.auth.transport.requests import AuthorizedSession
from dotenv import load_dotenv

# ── Configuration ────────────────────────────────────────────
load_dotenv()

PROJECT_ID = os.getenv("GCP_PROJECT_ID")
# Feature Store REST requires a location/region (e.g. us-central1)
LOCATION = os.getenv("GCP_LOCATION", "us-central1")
DATASET_ID = os.getenv("BQ_DATASET", "aml_demo_ds")
TABLE_ID = "user_baseline_14d"

STORE_NAME = "aml_online_store"
VIEW_NAME = "user_baseline_14d_view"

if not PROJECT_ID:
    print("Error: GCP_PROJECT_ID must be set in .env")
    sys.exit(1)

# Base URL for Vertex AI
BASE_URL = f"https://{LOCATION}-aiplatform.googleapis.com/v1"

def get_session():
    credentials, _ = default()
    return AuthorizedSession(credentials)

def check_resource_exists(session, url):
    """Returns True if GET returns 200, False if 404."""
    response = session.get(url)
    if response.status_code == 200:
        return True
    elif response.status_code == 404:
        return False
    else:
        print(f"Warning: Unexpected status {response.status_code} checking {url}")
        print(response.text)
        return False

def setup_feature_store():
    session = get_session()
    
    # 1. Create FeatureOnlineStore (Bigtable)
    store_url = f"{BASE_URL}/projects/{PROJECT_ID}/locations/{LOCATION}/featureOnlineStores/{STORE_NAME}"
    create_store_url = f"{BASE_URL}/projects/{PROJECT_ID}/locations/{LOCATION}/featureOnlineStores?feature_online_store_id={STORE_NAME}"
    
    print(f"Checking if FeatureOnlineStore '{STORE_NAME}' exists...")
    if check_resource_exists(session, store_url):
        print(f"FeatureOnlineStore '{STORE_NAME}' already exists.")
    else:
        print(f"Creating FeatureOnlineStore '{STORE_NAME}' (Bigtable)...")
        body = {
            "bigtable": {
                "auto_scaling": {
                    "min_node_count": 1,
                    "max_node_count": 3,
                    "cpu_utilization_target": 50
                }
            }
        }
        response = session.post(create_store_url, json=body)
        if response.status_code in [200, 201, 202]:
            print("FeatureOnlineStore creation triggered.")
            # Creation is async. Let's wait a bit for it to be ready
            # Usually creates LRO, but for demo, we can just poll or proceeding to view creation 
            # as view creation will fail if store isn't there, and we can retry view creation.
            print(f"Response: {response.json().get('name')}")
            print("Waiting for creation operation to complete is advised. Let's check status in a loop...")
            # Ideally poll operation, but let's see if we can just wait 30 seconds for Bigtable node setup
            # wait 30 seconds to be safe
            time.sleep(30)
        else:
            print(f"Error creating online store: {response.status_code}")
            print(response.text)
            sys.exit(1)

    # 2. Create FeatureView from BigQuery
    view_url = f"{store_url}/featureViews/{VIEW_NAME}"
    create_view_url = f"{store_url}/featureViews?feature_view_id={VIEW_NAME}"
    bq_uri = f"bq://{PROJECT_ID}.{DATASET_ID}.{TABLE_ID}"
    
    print(f"Checking if FeatureView '{VIEW_NAME}' exists...")
    if check_resource_exists(session, view_url):
         print(f"FeatureView '{VIEW_NAME}' already exists.")
    else:
        print(f"Creating FeatureView '{VIEW_NAME}' pointing to {bq_uri}...")
        body = {
             "big_query_source": {
                 "uri": bq_uri,
                 "entity_id_columns": ["user_id"]
             },
             # scheduled sync
             "sync_config": {
                 "cron": "0 1 * * *" # Daily at 1AM
             }
        }
        
        # Retry loop for view creation as store might still be provisioning
        for attempt in range(3):
            print(f"Attempt {attempt+1} to create FeatureView...")
            response = session.post(create_view_url, json=body)
            if response.status_code in [200, 201, 202]:
                print(f"FeatureView '{VIEW_NAME}' creation triggered.")
                break
            else:
                print(f"Warning: Failed to create view (Store might still be creating): {response.status_code}")
                # print(response.text)
                if attempt < 2:
                     print("Retrying in 20 seconds...")
                     time.sleep(20)
                else:
                     print("Failed multiple times. Exiting.")
                     sys.exit(1)

    # 3. Trigger Initial Sync
    print("Triggering manual sync for FeatureView...")
    sync_url = f"{view_url}:sync"
    response = session.post(sync_url, json={})
    if response.status_code in [200, 201, 202]:
         print("Sync triggered successfully.")
         print(response.json())
    else:
         print(f"Failed to trigger sync: {response.status_code}")
         print(response.text)

if __name__ == "__main__":
    setup_feature_store()
