import datetime
import os
from dotenv import load_dotenv
import argparse
import json
import logging
import time
import apache_beam as beam
from apache_beam.options.pipeline_options import PipelineOptions, StandardOptions, GoogleCloudOptions
from apache_beam.transforms.window import SlidingWindows
from apache_beam.io.gcp.internal.clients import bigquery
from apache_beam import DoFn, ParDo, PTransform, WindowInto
from apache_beam.transforms.combiners import Count, Mean

class AudioStatsCombineFn(beam.CombineFn):
    def create_accumulator(self):
        # (count, sum, max, near_threshold_count)
        return (0, 0.0, float('-inf'), 0)
    
    def add_input(self, accumulator, element):
        (count, sum_val, max_val, near_threshold_count) = accumulator
        amount = element
        is_near_threshold = 1 if 9000 <= amount < 10000 else 0
        return (count + 1, sum_val + amount, max(max_val, amount), near_threshold_count + is_near_threshold)
    
    def merge_accumulators(self, accumulators):
        total_count = 0
        total_sum = 0.0
        total_max = float('-inf')
        total_near_threshold = 0
        for (c, s, m, nt) in accumulators:
            total_count += c
            total_sum += s
            total_max = max(total_max, m)
            total_near_threshold += nt
        return (total_count, total_sum, total_max, total_near_threshold)
    
    def extract_output(self, accumulator):
        (count, sum_val, max_val, near_threshold_count) = accumulator
        avg_val = sum_val / count if count > 0 else 0
        return {
            'tx_count': count,
            'total_spend': sum_val,
            'avg_amount': avg_val,
            'max_amount': max_val if max_val != float('-inf') else 0,
            'near_threshold_count': near_threshold_count
        }

def format_bq(element):
    user_id, stats = element
    row = {
        'user_id': user_id,
        'last_updated': datetime.datetime.now(datetime.timezone.utc).isoformat(), # This is processing time of emission
        **stats
    }
    # Add Distinct counts as NULL (not supported easily in simple CombineFn without HLL)
    row['distinct_merchants'] = None
    row['distinct_countries'] = None
    return row

load_dotenv()

# Define input/output
INPUT_TOPIC = "projects/your-project-id/topics/aml-demo"
OUTPUT_TABLE = "your-project-id:your_dataset.user_features"

class ParseTransaction(DoFn):
    def process(self, element):
        try:
            # Pub/Sub message data is bytes
            decoded = element.decode('utf-8')
            row = json.loads(decoded)
            # Ensure timestamp is present or use current time?
            # Dataflow usually handles event time from Pub/Sub metadata if published with it.
            # If not, we might need to add it. For now, assume processing time or attached timestamp.
            # Ideally, producer should inject timestamp.
            yield row
        except Exception as e:
            logging.error(f"Failed to parse JSON: {e}")

class ExtractUserAndAmount(DoFn):
    def process(self, element):
        yield (element['user_id'], element['amount'])



def run(argv=None):
    parser = argparse.ArgumentParser()
    parser.add_argument('--input_topic', default=os.getenv("PUBSUB_TOPIC_ID", INPUT_TOPIC))
    parser.add_argument('--output_table', default=f"{os.getenv('GCP_PROJECT_ID')}:{os.getenv('BQ_DATASET')}.user_features")
    parser.add_argument('--project', default=os.getenv("GCP_PROJECT_ID"))
    parser.add_argument('--region', default=os.getenv("GCP_REGION"))
    known_args, pipeline_args = parser.parse_known_args(argv)

    input_topic = known_args.input_topic
    if not input_topic.startswith("projects/"):
        input_topic = f"projects/{known_args.project}/topics/{input_topic}"

    pipeline_args.extend([
        f'--project={known_args.project}',
        f'--region={known_args.region}',
        '--runner=DirectRunner' # Default to DirectRunner for now, or DataflowRunner if requested
    ])

    options = PipelineOptions(pipeline_args)
    options.view_as(StandardOptions).streaming = True
    google_cloud_options = options.view_as(GoogleCloudOptions)
    google_cloud_options.project = known_args.project
    google_cloud_options.region = known_args.region
    # google_cloud_options.temp_location = f"gs://{os.getenv('GCP_PROJECT_ID')}-dataflow/temp" # Uncomment for DataflowRunner

    with beam.Pipeline(options=options) as p:
        # Read from Pub/Sub
        transactions = (
            p 
            | "ReadFromPubSub" >> beam.io.ReadFromPubSub(topic=input_topic)
            | "ParseJSON" >> ParDo(ParseTransaction())
        )

        # Define windows: (duration_minutes, table_suffix)
        windows_config = [
            (15, "15m"),
            (30, "30m"),
            (60, "60m")
        ]

        # Shared Schema
        # Note: We are using the same schema for all tables
        schema_str = 'user_id:STRING, tx_count:INTEGER, total_spend:FLOAT, avg_amount:FLOAT, distinct_merchants:INTEGER, distinct_countries:INTEGER, max_amount:FLOAT, near_threshold_count:INTEGER, last_updated:TIMESTAMP'

        for duration_mins, suffix in windows_config:
            duration_sec = duration_mins * 60
            table_name = f"{known_args.project}:{os.getenv('BQ_DATASET')}.user_features_{suffix}"
            
            # Branch for this window
            (
                transactions
                | f"WindowIntoSliding{suffix}" >> WindowInto(SlidingWindows(size=duration_sec, period=60))
                | f"ExtractUserAmount{suffix}" >> ParDo(ExtractUserAndAmount())
                | f"CombineUserStats{suffix}" >> beam.CombinePerKey(AudioStatsCombineFn())
                | f"FormatBQ{suffix}" >> beam.Map(format_bq)
                | f"WriteToBQ{suffix}" >> beam.io.WriteToBigQuery(
                    table_name,
                    schema=schema_str,
                    create_disposition=beam.io.BigQueryDisposition.CREATE_IF_NEEDED,
                    write_disposition=beam.io.BigQueryDisposition.WRITE_APPEND
                )
            )

if __name__ == '__main__':
    logging.getLogger().setLevel(logging.INFO)
    run()
