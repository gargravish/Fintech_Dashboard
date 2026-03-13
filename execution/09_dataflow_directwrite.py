#!/usr/bin/env python3
"""
============================================================
Checkpoint 9: Dataflow Intraday updates → Vertex AI FS
============================================================
Consumes Pub/Sub stream, calculates intraday running totals
(Midnight to Now), and pushes direct writes to Feature Store.

Usage:
    python execution/09_dataflow_directwrite.py
============================================================
"""

import datetime
import os
import json
import logging
import argparse
import requests
import google.auth
import google.auth.transport.requests
import apache_beam as beam
from apache_beam.options.pipeline_options import PipelineOptions, StandardOptions, GoogleCloudOptions
from apache_beam.transforms.window import FixedWindows
from apache_beam import DoFn, ParDo, WindowInto
from apache_beam.transforms.trigger import AfterProcessingTime, AfterWatermark, AccumulationMode
from dotenv import load_dotenv

# ── Configuration ────────────────────────────────────────────
load_dotenv()

PROJECT_ID = os.getenv("GCP_PROJECT_ID")
LOCATION = os.getenv("GCP_LOCATION", "us-central1")
STORE_NAME = "aml_online_store"
VIEW_NAME = "user_intraday_view"
INPUT_TOPIC = os.getenv("PUBSUB_TOPIC_ID", "aml-demo")

# ── CombineFn for intraday totals ─────────────────────────────
class IntradayCombineFn(beam.CombineFn):
    def create_accumulator(self):
        # (count, sum)
        return (0, 0.0)
    
    def add_input(self, accumulator, element):
        (count, sum_val) = accumulator
        amount = element
        return (count + 1, sum_val + amount)
    
    def merge_accumulators(self, accumulators):
        total_count = 0
        total_sum = 0.0
        for (c, s) in accumulators:
            total_count += c
            total_sum += s
        return (total_count, total_sum)
    
    def extract_output(self, accumulator):
        (count, sum_val) = accumulator
        return {
            'intraday_tx_count': count,
            'intraday_total_spend': sum_val
        }

# ── Custom DoFn for directWrite ──────────────────────────────
class DirectWriteToFeatureStore(DoFn):
    def __init__(self, project_id, location, store_name, view_name):
        self.project_id = project_id
        self.location = location
        self.store_name = store_name
        self.view_name = view_name
        self.headers = None
        self.endpoint = None

    def setup(self):
        """Prepares endpoint and Auth Token once per worker."""
        # Get Auth Token
        credentials, _ = google.auth.default()
        auth_request = google.auth.transport.requests.Request()
        credentials.refresh(auth_request)
        
        self.headers = {
            "Authorization": f"Bearer {credentials.token}",
            "Content-Type": "application/json; charset=utf-8"
        }
        
        # REST Endpoint URL (v1beta1 is required for directWrite)
        self.endpoint = (
            f"https://{self.location}-aiplatform.googleapis.com/v1beta1/"
            f"projects/{self.project_id}/locations/{self.location}/"
            f"featureOnlineStores/{self.store_name}/featureViews/{self.view_name}:directWrite"
        )
        # logging.info(f"Initialized directWrite to {self.endpoint}")

    def process(self, element):
        """Processes aggregate and sends to Feature Store."""
        user_id, stats = element
        # stats is dict from CombineFn: {'intraday_tx_count': X, 'intraday_total_spend': Y}
        
        # Prepare Request Body
        payload = [
            {
                "feature_view": (
                    f"projects/{self.project_id}/locations/{self.location}/"
                    f"featureOnlineStores/{self.store_name}/featureViews/{self.view_name}"
                ),
                "data_key_and_feature_values": {
                    "data_key": { "key": user_id },
                    "features": [
                        {
                            "name": "intraday_tx_count",
                            "value_and_timestamp": {
                                "value": { "int64_value": str(stats['intraday_tx_count']) } # String for large ints usually, or number? Json body schema requires type specific key
                            }
                        },
                        {
                            "name": "intraday_total_spend",
                            "value_and_timestamp": {
                                "value": { "double_value": stats['intraday_total_spend'] }
                            }
                        }
                    ]
                }
            }
        ]

        try:
            # logging.info(f"Sending directWrite for user {user_id}: {stats}")
            response = requests.post(self.endpoint, headers=self.headers, json=payload)
            response.raise_for_status()
            # logging.info(f"directWrite successful for {user_id}")
        except Exception as e:
            logging.error(f"Failed directWrite for {user_id}: {e} | Response: {getattr(response, 'text', 'No response text')}")

# ── Pipeline Execution ───────────────────────────────────────

class ParseTransaction(DoFn):
    def process(self, element):
        try:
            row = json.loads(element.decode('utf-8'))
            yield row
        except Exception as e:
            logging.error(f"JSON Parse Error: {e}")

class ExtractUserAndAmount(DoFn):
    def process(self, element):
        yield (element['user_id'], element['amount'])

def run(argv=None):
    parser = argparse.ArgumentParser()
    parser.add_argument('--input_topic', default=INPUT_TOPIC)
    parser.add_argument('--project', default=PROJECT_ID)
    parser.add_argument('--location', default=LOCATION)
    known_args, pipeline_args = parser.parse_known_args(argv)

    input_topic = known_args.input_topic
    if not input_topic.startswith("projects/"):
        input_topic = f"projects/{known_args.project}/topics/{input_topic}"

    pipeline_args.extend([
        f'--project={known_args.project}',
        '--runner=DirectRunner'
    ])

    options = PipelineOptions(pipeline_args)
    options.view_as(StandardOptions).streaming = True
    google_cloud_options = options.view_as(GoogleCloudOptions)
    google_cloud_options.project = known_args.project

    with beam.Pipeline(options=options) as p:
        (
            p 
            | "ReadFromPubSub" >> beam.io.ReadFromPubSub(topic=input_topic)
            | "ParseJSON" >> ParDo(ParseTransaction())
            # FixedWindow of 1 day = Intraday totals aligned to UTC midnight
            # Trigger every 5 seconds of processing time to send updates back to Vertex AI
            | "WindowIntraday" >> WindowInto(
                FixedWindows(size=86400), # 1 Day in seconds
                trigger=AfterWatermark(early=AfterProcessingTime(5)),
                accumulation_mode=AccumulationMode.ACCUMULATING
            )
            | "ExtractUserAmount" >> ParDo(ExtractUserAndAmount())
            | "CombineAggregates" >> beam.CombinePerKey(IntradayCombineFn())
            | "DirectWrite" >> ParDo(DirectWriteToFeatureStore(
                project_id=known_args.project,
                location=known_args.location,
                store_name=STORE_NAME,
                view_name=VIEW_NAME
            ))
        )

if __name__ == '__main__':
    logging.getLogger().setLevel(logging.INFO)
    run()
