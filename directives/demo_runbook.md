# AML Real-Time Demo — Live Demo Runbook

## Pre-Demo Checklist
- [ ] `.env` populated with correct GCP project values
- [ ] Kafka cluster running and topic `transactions` created
- [ ] BigQuery tables created (run `02_bq_table_setup.sql`)
- [ ] Kafka → BQ connector active and data flowing
- [ ] Continuous Query running (from `03_continuous_query.sql`)
- [ ] BQ ↔ Vertex AI connection established
- [ ] Gemini remote model created
- [ ] Dataplex lake/zone configured

---

## Demo Flow (30 minutes)

### Act 1: Data Ingestion (5 min)
**Story:** "Let's start by looking at how real-time transaction data flows from source systems into BigQuery."

1. **Show the Python producer** — open `execution/01_kafka_producer.py`
   - Highlight: realistic AML patterns (suspicious users 95-100)
   - Highlight: configurable rate, diverse merchants/countries
   
2. **Start the producer** (if not already running):
   ```bash
   python execution/01_kafka_producer.py
   ```

3. **Show data landing in BigQuery**:
   ```sql
   SELECT * FROM `PROJECT.aml_demo_ds.raw_transactions`
   ORDER BY timestamp DESC LIMIT 10;
   ```

4. **Talking Point:** "This data arrives in BigQuery within seconds via the Managed Kafka BigQuery Sink Connector — zero code, fully managed."

---

### Act 2: Real-Time Feature Engineering (10 min)
**Story:** "Now let's see how BigQuery computes AML-relevant features in real-time using Continuous Queries."

1. **Show the continuous query** — open `execution/03_continuous_query.sql`
   - Highlight: sliding window, no batch jobs, always fresh

2. **Query the features table**:
   ```sql
   SELECT user_id, tx_count_1h, total_spend_1h,
          distinct_countries_1h, max_amount_1h
   FROM `PROJECT.aml_demo_ds.user_features`
   ORDER BY total_spend_1h DESC LIMIT 10;
   ```

3. **Show suspicious users**:
   ```sql
   SELECT * FROM `PROJECT.aml_demo_ds.user_features`
   WHERE distinct_countries_1h > 2
      OR total_spend_1h > 5000
   ORDER BY total_spend_1h DESC;
   ```

4. **Talking Point:** "These features update in real-time — no Spark jobs, no Dataflow pipelines. Just SQL running continuously in BigQuery."

---

### Act 3: GenAI-Powered Insights (10 min)
**Story:** "With features computed, we use Gemini directly in BigQuery to generate intelligent recommendations."

1. **Show the remote model** — run `execution/04_remote_model.sql` (or show it's already created)

2. **Run recommendations** — copy `execution/04_recommendations.sql` into BQ Console
   - Wait for results

3. **Show results**:
   ```sql
   SELECT user_id, recommendation
   FROM `PROJECT.aml_demo_ds.user_recommendations`
   LIMIT 5;
   ```

4. **Run feature ideation** — copy `execution/04_feature_ideation.sql`
   - Show how Gemini suggests new AML features

5. **Show Dataplex-grounded query** — copy `execution/05_dataplex_metadata.sql`
   - Highlight: AI uses actual schema metadata, not hallucinated column names

6. **Talking Point:** "Gemini doesn't just generate text — it's grounded in your actual data schema via Dataplex, so the suggestions are specific and actionable."

---

### Act 4: Conversational Analytics (5 min)
**Story:** "Finally, let's show how business users can interact with this data using natural language."

1. **Open BigQuery Studio** → click Gemini icon (✦)

2. **Ask natural language questions:**
   - "Who are the top spenders in the last hour?"
   - "Show me users with transactions in multiple countries"
   - "Which users look suspicious?"
   - "Summarize spending by category"

3. **Talking Point:** "The conversational agent understands the table schemas — enriched by Dataplex — and generates accurate SQL. No code required for business users."

---

### Wrap-Up
- **Dataform:** "All of this SQL can be operationalized as a scheduled Dataform workflow — see the `dataform/` directory."
- **Key Takeaway:** "End-to-end real-time AML platform — from Kafka to AI recommendations — using only Google Managed services. No infrastructure to maintain."
