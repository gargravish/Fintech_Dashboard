#!/usr/bin/env python3
"""
============================================================
Historical Data Generator for Vertex AI Feature Store Demo
============================================================
Generates 14 days of synthetic transactions and writes them
directly to BigQuery raw_transactions.

Usage:
    python execution/01b_historical_data_gen.py
============================================================
"""

import json
import time
import random
import logging
from datetime import datetime, timedelta, timezone
from google.cloud import bigquery
from dotenv import load_dotenv
from faker import Faker
import os

# ── Configuration ────────────────────────────────────────────
load_dotenv()

PROJECT_ID = os.getenv("GCP_PROJECT_ID")
DATASET_ID = os.getenv("BQ_DATASET", "aml_demo_ds")
TABLE_ID = "raw_transactions"

if not PROJECT_ID:
    print("Error: GCP_PROJECT_ID must be set in .env")
    exit(1)

# ── Logging ──────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# ── Data Pools (Match 01_pubsub_producer.py) ──────────────────
fake = Faker()

MERCHANTS = [
    "Amazon", "Starbucks", "Walmart", "Shell", "Apple",
    "Netflix", "Uber", "Costco", "Target", "Whole Foods",
    "DoorDash", "Zara", "H&M", "Best Buy", "Home Depot",
]

CATEGORIES = [
    "Retail", "Food", "Grocery", "Fuel", "Electronics",
    "Entertainment", "Transport", "Fashion", "Home Improvement",
]

NORMAL_USER_IDS = [f"user_{i}" for i in range(1, 90)]
SUSPICIOUS_USER_IDS = [f"user_{i}" for i in range(90, 95)]
STRUCTURING_USER_IDS = [f"user_{i}" for i in range(95, 98)]
SMURFING_USER_IDS = [f"user_{i}" for i in range(98, 101)]

def generate_transaction(tx_timestamp):
    """Generate a single synthetic transaction with a specific timestamp."""
    rand = random.random()
    
    if rand < 0.10:
        user_id = random.choice(SUSPICIOUS_USER_IDS)
        amount = round(random.uniform(500.0, 15000.0), 2)
    elif rand < 0.15:
        user_id = random.choice(STRUCTURING_USER_IDS)
        amount = round(random.uniform(9000.0, 9999.0), 2)
    elif rand < 0.20:
        user_id = random.choice(SMURFING_USER_IDS)
        amount = round(random.uniform(1.0, 10.0), 2)
    else:
        user_id = random.choice(NORMAL_USER_IDS)
        amount = round(random.uniform(1.0, 500.0), 2)

    return {
        "transaction_id": f"txn_hist_{int(tx_timestamp.timestamp() * 1000)}_{random.randint(1000, 9999)}",
        "user_id": user_id,
        "amount": amount,
        "timestamp": tx_timestamp.isoformat(),
        "merchant": random.choice(MERCHANTS),
        "category": random.choice(CATEGORIES),
        "currency": "GBP",
        "country": random.choice(["GB", "US", "DE", "FR", "SG", "AE"]),
    }

def main():
    client = bigquery.Client(project=PROJECT_ID)
    table_ref = f"{PROJECT_ID}.{DATASET_ID}.{TABLE_ID}"

    logger.info(f"Generating 14 days of historical data for {table_ref}...")

    transactions = []
    end_time = datetime.now(timezone.utc)
    start_time = end_time - timedelta(days=14)

    # Approximate volume: 1000 transactions per day for 14 days = 14,000 rows
    # Safe to load in a single batch
    current_time = start_time
    total_txns = 0
    
    logger.info("Faking transactions...")
    while current_time < end_time:
        # Generate 1-5 transactions per hour interval on average
        num_txns = random.randint(30, 60) # per hour approximately 
        # or just daily volume
        logger.info(f"Processing day: {current_time.strftime('%Y-%m-%d')}")
        
        for _ in range(1000): # 1000 txns per day
            # Spread them throughout the day
            offset_seconds = random.randint(0, 86400)
            tx_time = current_time + timedelta(seconds=offset_seconds)
            if tx_time < end_time:
                tx = generate_transaction(tx_time)
                transactions.append(tx)
                total_txns += 1
                
        current_time += timedelta(days=1)

    logger.info(f"Generated {total_txns} transactions. Loading to BigQuery...")

    job_config = bigquery.LoadJobConfig(
        write_disposition="WRITE_APPEND",
        source_format=bigquery.SourceFormat.NEWLINE_DELIMITED_JSON,
    )

    try:
        # load_table_from_json expects an iterable of dicts
        job = client.load_table_from_json(
            transactions,
            table_ref,
            job_config=job_config
        )
        job.result()  # Wait for the job to complete
        logger.info(f"Successfully loaded {total_txns} rows into {table_ref}.")
    except Exception as e:
        logger.error(f"Error loading to BigQuery: {e}")

if __name__ == "__main__":
    main()
