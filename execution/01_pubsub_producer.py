#!/usr/bin/env python3
"""
============================================================
Checkpoint 1: Synthetic Transaction Producer → Pub/Sub
============================================================
Generates realistic financial transactions and streams them
to a Google Cloud Pub/Sub topic.

Usage:
    python execution/01_pubsub_producer.py

Requires:
    - .env file with PUBSUB_TOPIC_ID and GCP_PROJECT_ID
    - pip install google-cloud-pubsub python-dotenv faker
============================================================
"""

import json
import time
import random
import signal
import sys
import logging
from datetime import datetime, timezone
from google.cloud import pubsub_v1
from dotenv import load_dotenv
from faker import Faker
import os

# ── Configuration ────────────────────────────────────────────
load_dotenv()

PROJECT_ID = os.getenv("GCP_PROJECT_ID")
TOPIC_ID = os.getenv("PUBSUB_TOPIC_ID", "aml-demo")
MESSAGES_PER_SECOND = float(os.getenv("MESSAGES_PER_SECOND", "2"))

if not PROJECT_ID or not TOPIC_ID:
    print("Error: GCP_PROJECT_ID and PUBSUB_TOPIC_ID must be set in .env")
    sys.exit(1)

TOPIC_PATH = f"projects/{PROJECT_ID}/topics/{TOPIC_ID}"

# ── Logging ──────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# ── Realistic Data Pools ─────────────────────────────────────
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

# AML-relevant: some users will have suspicious patterns
NORMAL_USER_IDS = [f"user_{i}" for i in range(1, 90)]

# AML Scenario Scopes
SUSPICIOUS_USER_IDS = [f"user_{i}" for i in range(90, 95)]  # High Amount / Velocity Spikes
STRUCTURING_USER_IDS = [f"user_{i}" for i in range(95, 98)] # Near threshold amounts (£9,000 - £10,000)
SMURFING_USER_IDS = [f"user_{i}" for i in range(98, 101)]    # Rapid consecutive small amounts

# ── Transaction Generator ────────────────────────────────────

def generate_transaction():
    """Generate a single synthetic financial transaction."""
    rand = random.random()
    
    # 1. High-Value Anomalies (10% chance)
    if rand < 0.10:
        user_id = random.choice(SUSPICIOUS_USER_IDS)
        amount = round(random.uniform(500.0, 15000.0), 2)
        
    # 2. Structuring Scenario (5% chance)
    # Evasion attempts around £10k reporting limit: 9000 <= amount < 10000
    elif rand < 0.15:
        user_id = random.choice(STRUCTURING_USER_IDS)
        amount = round(random.uniform(9000.0, 9999.0), 2)
        
    # 3. Smurfing / Micro-deposits Scenario (5% chance)
    # Rapid low amounts going into target account
    elif rand < 0.20:
        user_id = random.choice(SMURFING_USER_IDS)
        amount = round(random.uniform(1.0, 10.0), 2)
        
    # 4. Normal Users (80% chance)
    else:
        user_id = random.choice(NORMAL_USER_IDS)
        amount = round(random.uniform(1.0, 500.0), 2)

    return {
        "transaction_id": f"txn_{int(time.time() * 1000)}_{random.randint(1000, 9999)}",
        "user_id": user_id,
        "amount": amount,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "merchant": random.choice(MERCHANTS),
        "category": random.choice(CATEGORIES),
        "currency": "GBP",
        "country": random.choice(["GB", "US", "DE", "FR", "SG", "AE"]),
    }


# ── Main Producer Loop ───────────────────────────────────────

def main():
    """Connect to Pub/Sub and stream synthetic transactions."""
    logger.info(f"Connecting to Pub/Sub: {TOPIC_PATH}")
    
    publisher = pubsub_v1.PublisherClient()
    
    # Verify connectivity/existence implicitly by publishing
    # (Checking strictly would require another API call, skipping for simplicity)

    # Graceful shutdown
    running = True

    def signal_handler(sig, frame):
        nonlocal running
        logger.info("Shutdown signal received. Stopping...")
        running = False

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    sent_count = 0
    logger.info(f"Starting stream at ~{MESSAGES_PER_SECOND} msgs/sec. Press Ctrl+C to stop.")

    try:
        while running:
            tx = generate_transaction()
            data = json.dumps(tx).encode("utf-8")
            
            # Publish asynchronous
            future = publisher.publish(TOPIC_PATH, data)
            # We can optionally wait for result: future.result()
            # For high throughput, we usually don't wait for every message, 
            # but for this demo, let's keep it simple.
            
            sent_count += 1

            if sent_count % 10 == 0:
                logger.info(f"Sent {sent_count} transactions | Latest: {tx['transaction_id']} "
                            f"user={tx['user_id']} amount={tx['amount']} {tx['currency']}")

            # Randomized sleep to simulate realistic load
            time.sleep(1.0 / MESSAGES_PER_SECOND + random.uniform(-0.1, 0.1))

    except Exception as e:
        logger.error(f"Producer error: {e}")
    finally:
        logger.info(f"Producer stopped. Total sent: {sent_count}")


if __name__ == "__main__":
    main()
