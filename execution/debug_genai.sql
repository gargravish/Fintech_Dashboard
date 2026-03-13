-- ============================================================
-- DEBUG SCRIPT: Diagnose GenAI NULL Results
-- ============================================================

-- 1. Check if raw_transactions has a description (used for Feature Ideation)
SELECT table_name, option_name, option_value
FROM `raves-altostrat.aml_demo_ds.INFORMATION_SCHEMA.TABLE_OPTIONS`
WHERE table_name = 'raw_transactions'
  AND option_name = 'description';

-- 2. Check Raw JSON Output from Gemini (for Recommendations)
-- This usually reveals if the model is blocking response or if structure is different.
SELECT
    user_id,
    ml_generate_text_llm_result, -- RAW JSON
    JSON_VALUE(ml_generate_text_llm_result, '$.candidates[0].content.parts[0].text') AS parsed_text
FROM
    ML.GENERATE_TEXT(
        MODEL `raves-altostrat.aml_demo_ds.gemini_model`,
        (
            SELECT 'user_123' as user_id, 'Provide a financial tip.' as prompt
        ),
        STRUCT(
            100 AS max_output_tokens,
            0.5 AS temperature,
            TRUE AS flatten_json_output
        )
    );
