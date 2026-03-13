from google.cloud import bigquery
import os
from dotenv import load_dotenv

load_dotenv()

PROJECT_ID = os.getenv("GCP_PROJECT_ID") # User specified
DATASET_ID = os.getenv("BQ_DATASET", "aml_demo_ds")
client = bigquery.Client(project=PROJECT_ID)

def check_table_description():
    print("--- Checking 'raw_transactions' description ---")
    query = f"""
        SELECT option_value
        FROM `{PROJECT_ID}.{DATASET_ID}.INFORMATION_SCHEMA.TABLE_OPTIONS`
        WHERE table_name = 'raw_transactions'
          AND option_name = 'description'
    """
    results = list(client.query(query).result())
    if not results:
        print("❌ Description MISSING for 'raw_transactions'. Feature Ideation will fail (empty input).")
        return False
    print(f"✅ Description found: {results[0].option_value}")
    return True

def test_recommendation_parsing():
    print("\n--- Testing Gemini Output Parsing ---")
    # Using a simplified query to check what Gemini returns
    query = f"""
        SELECT
            ml_generate_text_llm_result,
            JSON_VALUE(ml_generate_text_llm_result, '$.candidates[0].content.parts[0].text') as json_parsed
        FROM
            ML.GENERATE_TEXT(
                MODEL `{PROJECT_ID}.{DATASET_ID}.gemini_model`,
                (SELECT 'Explain high frequency trading in 1 sentence.' as prompt),
                STRUCT(100 AS max_output_tokens, TRUE AS flatten_json_output)
            )
    """
    try:
        results = list(client.query(query).result())
        for row in results:
            print(f"RAW Output type: {type(row.ml_generate_text_llm_result)}")
            print(f"RAW Output content: {row.ml_generate_text_llm_result[:100]}...")
            print(f"JSON Parsed content: {row.json_parsed}")
            
            if row.ml_generate_text_llm_result and not row.json_parsed:
                print("Diagnostic: Raw output exists but JSON parsing returned NULL. This confirms we should use RAW output.")
            elif row.json_parsed:
                print("Diagnostic: JSON parsing worked. This implies output IS JSON.")
    except Exception as e:
        print(f"Error testing Gemini: {e}")

if __name__ == "__main__":
    desc_exists = check_table_description()
    test_recommendation_parsing()
