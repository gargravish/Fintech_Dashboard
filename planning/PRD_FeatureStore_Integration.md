# **Product Requirements Document (PRD): Real-Time AML Feature Engineering with Vertex AI Feature Store**

## **1\. Executive Summary**

**Project Goal**: Enhance the existing Anti-Money Laundering (AML) real-time demo to support large-scale sliding window aggregations (specifically, a 15-day moving average) evaluated at millisecond latency.

**Context**: The current architecture successfully calculates short-term sliding windows (15m, 30m, 60m) using Cloud Dataflow and stores them in BigQuery. However, computing a continuous 15-day sliding window on a per-transaction basis using purely stream processing (Dataflow) requires massive state management, and BigQuery Continuous Queries do not currently support complex windowing functions.

**Proposed Solution**: A hybrid Lambda architecture utilizing **Vertex AI Feature Store**.

1. **Batch (14-Day History)**: BigQuery calculates a 14-day baseline up to midnight and syncs it daily to Vertex AI Feature Store.  
2. **Streaming (Intraday)**: Dataflow calculates intraday totals (midnight to now) and updates the Feature Store in real-time via the directWrite API.  
3. **Inference (Evaluation)**: An inference microservice evaluates incoming transactions in milliseconds by fetching the aggregated feature state (14-day \+ intraday) from the Feature Store.

## **2\. Updated Architecture Flow**

graph TD  
    A\[Python Producer\<br/\>01\_pubsub\_producer.py\] \--\>|Txns| B\[Cloud Pub/Sub\]  
      
    %% Historical / Batch Path  
    B \--\>|BigQuery Subscription| C\[(BigQuery\<br/\>raw\_transactions)\]  
    C \--\>|Nightly Scheduled SQL| D\[(BigQuery\<br/\>14-day\_baseline)\]  
    D \--\>|Daily Batch Sync| E{Vertex AI\<br/\>Feature Store}  
      
    %% Streaming / Intraday Path  
    B \--\>|Stream| F\[Dataflow Intraday\<br/\>Pipeline\]  
    F \--\>|REST/gRPC: directWrite| E  
      
    %% Evaluation Path  
    B \--\>|Incoming Txn| G\[Evaluation API /\<br/\>ML Microservice\]  
    E \--\>|FetchFeatureValues\<br/\>(\< 10ms)| G  
    G \--\>|Merge Batch+Intraday\<br/\>& Score| H\[UI Dashboard\<br/\>Alerts\]  
      
    style A fill:\#4285F4,color:\#fff  
    style B fill:\#EA4335,color:\#fff  
    style C fill:\#34A853,color:\#fff  
    style D fill:\#34A853,color:\#fff  
    style E fill:\#9334E6,color:\#fff  
    style F fill:\#FF6D00,color:\#fff  
    style G fill:\#FBBC04,color:\#000  
    style H fill:\#4285F4,color:\#fff

### **The Three Paths**

1. **The Batch Path (14-Day Baseline)**: A scheduled BigQuery job (08\_batch\_baseline.sql) runs nightly at 00:01 AM. It calculates the transaction count, total spend, and average spend for the last 14 days for every user. This table is mapped as a FeatureView in Vertex AI, and a daily sync pushes this data into the high-speed online serving layer.  
2. **The Streaming Path (Intraday Updates)**: A new Dataflow pipeline (09\_dataflow\_directwrite.py) consumes the Pub/Sub stream, keeping a running tally of transactions from midnight to the current moment. It immediately pushes these updates to the Feature Store using the directWrite API.  
3. **The Inference Path (Millisecond Evaluation)**: An incoming transaction triggers the Evaluation Service (10\_inference\_api.py). This service calls FetchFeatureValues, instantly retrieving the pre-computed 14-day baseline and the real-time intraday totals. It merges them (Total 14d \+ Total Intraday) / (Count 14d \+ Count Intraday) to evaluate the exact 15-day average in \< 10 milliseconds.

## **3\. Scope of Changes to Existing Codebase**

### **3.1 Synthetic Data Generation**

**Current State:** 01\_pubsub\_producer.py generates live data.

**New Requirement:** To demonstrate a 15-day average, we need 15 days of historical data.

**Action:** \* Create execution/01b\_historical\_data\_gen.py. This script will generate 14 days of synthetic transactions and write them directly to the BigQuery raw\_transactions table using the BQ Storage Write API. This ensures the batch pipeline has data to process immediately during the demo.

### **3.2 Schema Evolution**

**Current State:** 02\_bq\_table\_setup.sql creates raw\_transactions, user\_features\_\*, and AI tables.

**New Requirement:** A table to hold the nightly batch features.

**Action:** \* Append the following to 02\_bq\_table\_setup.sql:

CREATE TABLE IF NOT EXISTS \`PROJECT.aml\_demo\_ds.user\_baseline\_14d\` (  
    user\_id STRING NOT NULL,  
    baseline\_tx\_count INT64,  
    baseline\_total\_spend FLOAT64,  
    feature\_timestamp TIMESTAMP \-- Required for Vertex FS  
);

### **3.3 Vertex AI Feature Store Configuration**

**New Requirement:** Infrastructure for the Feature Store.

**Action:** \* Create execution/08\_vertex\_fs\_setup.sh. This script will:

1. Create a FeatureOnlineStore (type: OPTIMIZED).  
2. Create a FeatureView pointing to the BigQuery user\_baseline\_14d table.  
3. Trigger the initial FeatureViewSync.

### **3.4 Dataflow directWrite Pipeline**

**Current State:** 03\_dataflow\_pipeline.py writes to BQ.

**New Requirement:** A pipeline to calculate intraday totals and push to Vertex AI.

**Action:** \* Create execution/09\_dataflow\_directwrite.py.

* **Logic:** Use Apache Beam stateful processing or global windows with triggers to maintain a daily running sum (resetting at midnight).  
* **Integration:** Use the Google Cloud AI Platform Python SDK (FeatureOnlineStoreAdminServiceClient) to call write\_feature\_values directly to the FeatureView for the specific user\_id.

### **3.5 Real-Time Inference Microservice**

**New Requirement:** A component that proves the millisecond latency to the customer.

**Action:**

* Create execution/10\_inference\_api.py (FastAPI).  
* **Logic:** Receives a transaction. Calls FetchFeatureValues via the Vertex AI SDK.  
* **Math:** Current\_15D\_Avg \= (Batch\_Spend \+ Intraday\_Spend \+ Current\_Txn\_Amount) / (Batch\_Count \+ Intraday\_Count \+ 1\)  
* **Flagging:** If Current\_Txn\_Amount \> (Current\_15D\_Avg \* 3\) \-\> Flag as Anomaly.

## **4\. UI / Dashboard Integration**

The existing Next.js dashboard will be updated to include a **"Millisecond Feature Evaluation"** panel.

1. **Transaction Feed:** As synthetic transactions stream in, the UI will intercept a sample of them.  
2. **Latency Counter:** The UI will display a live timer (e.g., 8ms, 12ms) showing how fast the FetchFeatureValues call returned the 15-day profile.  
3. **Data Breakdown:** The UI will visually split the calculation for the customer to prove the architecture:  
   * 🗄️ **Batch (14-Day):** £12,450 (from Vertex FS Batch)  
   * ⚡ **Intraday (Today):** £430 (from Vertex FS DirectWrite)  
   * 🧮 **Calculated 15-Day Avg:** £858/day  
   * 🚨 **Decision:** Approved / Flagged.

## **5\. Implementation Runbook (Step-by-Step for Demo)**

To ensure a smooth live demo for the customer, the runbook will be updated with the following sequence:

1. **Prep (Pre-Demo):** \* Run 01b\_historical\_data\_gen.py to seed 14 days of data.  
   * Run the nightly BQ query to populate user\_baseline\_14d.  
   * Run 08\_vertex\_fs\_setup.sh to sync the baseline to the Feature Store.  
2. **Act 1: Start the Stream:** Start 01\_pubsub\_producer.py. Data flows into Pub/Sub.  
3. **Act 2: Intraday Updates:** Start 09\_dataflow\_directwrite.py. Show the code where directWrite pushes intraday sums to Vertex FS without hitting BigQuery.  
4. **Act 3: The Millisecond Lookup:** Open the UI Dashboard or run 10\_inference\_api.py in the terminal. Send a spike transaction (e.g., £5000) for a user whose 15-day average is usually £50.  
5. **Talking Point (Crucial):** *“Notice the latency. We didn't query a massive BigQuery table over 15 days, nor did we maintain 15 days of state in Dataflow memory. We simply fetched the pre-aggregated 14-day batch and the real-time intraday sum from Vertex AI's memory-optimized Feature Store in under 10 milliseconds, making the exact 15-day average instantly available for scoring.”*

## **6\. Required IAM Permissions & Setup**

* roles/aiplatform.admin or roles/aiplatform.featurestoreAdmin for the setup script.  
* roles/aiplatform.user for the Dataflow Service Account to call directWrite.  
* roles/bigquery.dataViewer for Vertex AI to read the batch baseline table.

## **7\. Success Criteria**

* \[ \] 14-day historical backfill populates correctly.  
* \[ \] Vertex AI Feature Store Syncs BQ table successfully.  
* \[ \] Dataflow pipeline successfully utilizes write\_feature\_values REST/gRPC API.  
* \[ \] Evaluation script retrieves features in \< 20ms consistently.  
* \[ \] The combined 15-day logic correctly flags the synthetic anomalies generated by 01\_pubsub\_producer.py.