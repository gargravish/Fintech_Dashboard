import os
import sys
import requests
from google.auth import default
from google.auth.transport.requests import AuthorizedSession
from dotenv import load_dotenv

load_dotenv()

PROJECT_ID = os.getenv("GCP_PROJECT_ID")
LOCATION = os.getenv("GCP_LOCATION", "us-central1")
DATASET_ID = os.getenv("BQ_DATASET", "aml_demo_ds")
STORE_NAME = "aml_online_store"
VIEW_NAME = "user_intraday_view"
TABLE_ID = "user_intraday_live"

if not PROJECT_ID:
    print("Error: GCP_PROJECT_ID must be set")
    sys.exit(1)

BASE_URL = f"https://{LOCATION}-aiplatform.googleapis.com/v1"

def create_intraday_view():
    credentials, _ = default()
    session = AuthorizedSession(credentials)

    store_url = f"{BASE_URL}/projects/{PROJECT_ID}/locations/{LOCATION}/featureOnlineStores/{STORE_NAME}"
    create_view_url = f"{store_url}/featureViews?feature_view_id={VIEW_NAME}"
    bq_uri = f"bq://{PROJECT_ID}.{DATASET_ID}.{TABLE_ID}"

    body = {
         "big_query_source": {
             "uri": bq_uri,
              "entity_id_columns": ["user_id"]
         },
         "sync_config": {
             "cron": "0 2 * * *" 
         }
    }

    print(f"Creating FeatureView '{VIEW_NAME}' pointing to {bq_uri}...")
    res = session.post(create_view_url, json=body)
    print(f"Status: {res.status_code}")
    if res.status_code in [200, 201, 202]:
        print(f"FeatureView '{VIEW_NAME}' creation triggered.")
    else:
        print(f"Error: {res.text}")

if __name__ == "__main__":
    create_intraday_view()
