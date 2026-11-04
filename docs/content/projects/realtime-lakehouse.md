---
title: Real-Time Big Data Lakehouse Platform
slug: realtime-lakehouse
order: 6
category: Data Engineering · ML Infrastructure
year: "2025"  # src: fp-bigdata-01 repo created 2025-06-13, commits 2025-06-18 to 2025-06-20
visibility: Public team project
summary: A containerized data platform from Kafka ingestion to medallion layers, model training, MLflow registry and an inference API.
metrics:
  - value: "3"
    label: Medallion layers (Bronze, Silver, Gold)
stack: [Apache Kafka, Apache Spark, PySpark, MinIO, MLflow, PostgreSQL, FastAPI, JupyterLab, Docker, Docker Compose]
links:
  - label: Repository
    url: https://github.com/Trenttzzz/fp-bigdata-01
contribution: Kevin built the pipeline end to end. He wrote the Spark streaming ETL job, the batch training engine, the MLflow service Dockerfile, a rewrite of the Docker Compose orchestration and a rewrite of the Kafka producer. He also wrote both pipeline notebooks and the README.
seo_description: A containerized real-time lakehouse with Kafka, Spark, MinIO and MLflow. Medallion layers, automated training and an inference API.
---
<!-- src for stack, links, category, visibility: projects.md. Contribution: Kevin's commit 6e86e7d in the repo, stats from GitHub API. Team size 3: fp-bigdata-01 contributors list (dzakyahnaf, athallabf, HeavenlySpectre) and git log. Course or goal is not stated in the repo -->

## Problem
Streaming events need to become clean data, trained models and predictions without manual steps in between. <!-- src: projects.md overview -->

## How it works
A Kafka producer streams review records into a Spark Structured Streaming job. The job writes Delta tables to MinIO in Bronze, Silver and Gold layers. A batch trainer reads the Silver table, labels each review positive when its rating is above 3, trains a Spark ML logistic regression on the text, logs it to MLflow and registers it. A FastAPI service serves predictions from the registry. Everything runs in Docker Compose. <!-- src: fp-bigdata-01 README, spark_etl_job.py, batch-trainer/batch_training_engine.py (label Score > 3, TF-IDF plus LogisticRegression), api/main.py. The README example of purchase prediction does not match the code -->

### Pipeline
- producer | Kafka producer | Streams review records into a Kafka topic. <!-- src: producer-scripts/ecommerce_producer.py -->
- kafka | Kafka | Holds the event stream. <!-- src: README -->
- etl | Spark streaming ETL | Parses events and writes each layer. <!-- src: spark_etl_job.py -->
- bronze | Bronze | Raw events as received. <!-- src: README, spark_etl_job.py -->
- silver | Silver | Short or empty reviews dropped and a keyword-based sentiment label added. <!-- src: spark_etl_job.py -->
- gold | Gold | A slim table of product, rating and sentiment. <!-- src: spark_etl_job.py (Gold selects five columns from Silver) -->
- trainer | Batch trainer | Trains on Silver and evaluates with AUC. It runs on startup, every 30 minutes and daily at 02:00. <!-- src: batch_training_engine.py, run_trainer.py -->
- mlflow | MLflow registry | Tracks runs and registers the model. <!-- src: batch_training_engine.py -->
- api | Model API | FastAPI serves predictions. <!-- src: README -->
- producer -> kafka
- kafka -> etl
- etl -> bronze
- etl -> silver
- silver -> gold
- silver -> trainer
- trainer -> mlflow
- mlflow -> api

## Key decisions
- Medallion layers on Delta tables in MinIO buckets, one bucket per layer. <!-- src: README architecture, spark_etl_job.py, docker-compose.yml (minio-setup creates bronze, silver and gold buckets) -->
- Automated batch training that waits for Silver data and skips training when there are fewer than 100 rows. <!-- src: batch_training_engine.py -->
- One Docker Compose file starts every service, including Jupyter, Spark, MinIO and MLflow. <!-- src: README -->

## Results
- A full path from event to prediction that runs from one command. <!-- src: README quick start -->
- An exploratory notebook trained a review helpfulness classifier on about 20,000 reviews. It scored 79.44% accuracy and 83.77% F1 on a 25% hold-out. <!-- src: fp-bigdata-01 notebooks/02-Train-Helpfulness-Model.ipynb.ipynb saved output, commit 6e86e7d. No AUC value or throughput is recorded in the repo -->
