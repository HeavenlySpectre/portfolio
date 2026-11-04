---
title: TaskFlow DevSecOps Pipeline
slug: taskflow-devsecops
order: 4
category: DevSecOps · AI Failure Intelligence
year: "2026"  # src: repo created 2026-04-29, last commits 2026-06-27 (GitHub API)
visibility: Public team project
summary: A CI/CD pipeline for a Go API that explains failed builds using similar past failures and an LLM report.
metrics:
  - value: "15/15"
    label: Top-3 retrieval accuracy on controlled failure scenarios
stack: [Go, GitHub Actions, Docker, GHCR, govulncheck, gosec, Python, Gemini embeddings, Telegram]
links:
  - label: Repository
    url: https://github.com/Trenttzzz/taskflow-cicd-devops
contribution: I built the AI failure intelligence pipeline. It covers workflow changes, log cleaning, the embedding index, similar-failure retrieval, the report generator, the knowledge base and the controlled-failure evaluation. I then fixed log collection and report reliability. Earlier I added the security scan job, the project report, and the Kubernetes manifests with the deploy workflow and incident docs.
seo_description: TaskFlow DevSecOps project. A Go API pipeline on GitHub Actions that uses embedding retrieval and an LLM to explain failed builds.
---
<!-- src for stack, links, metrics, contribution: repo README taskflow, GitHub contributors API (22 of 63), Kevin's commits f973c38 41ba79a 3cccbef 73fe1e9 b3b4245 038d0d3 58a0f03 -->

## Problem
When a CI pipeline fails, developers get a long raw log. Similar failures also repeat. <!-- src: repo README taskflow, Final Project Summary table -->

## How it works
TaskFlow is a Go task API used as a DevSecOps case study. The pipeline runs tests, security scans, a Docker build, a push to GHCR and a smoke test. When a job fails, the failed logs are cleaned, the three most similar past failures are retrieved by embedding similarity, and an LLM writes a debugging report from that evidence. On success no AI call is made. <!-- src: repo README taskflow -->

### Pipeline
- push | Push or pull request | A change reaches main or develop. <!-- src: README, Workflow Terbaru -->
- ci | CI | Go matrix, vet, race tests, integration tests, coverage gate, build. <!-- src: README job table -->
- sec | Security | govulncheck and gosec, blocking on findings. <!-- src: README job table -->
- cd | CD | Build and push the image to GHCR, then smoke test. <!-- src: README job table -->
- stable | Stable tag | A successful image is tagged stable. <!-- src: README job table -->
- status | Failure check | Decides if any job failed. If not, no AI is called. <!-- src: README, failure_status.py description -->
- clean | Log cleaning | Failed logs are collected, cleaned and secrets masked. <!-- src: README script table -->
- retrieve | Similar failures | Top-3 matches from the knowledge base by cosine similarity. <!-- src: README script table -->
- report | AI report | An LLM writes a Markdown report from the evidence. <!-- src: README -->
- notify | Notify | A Telegram summary is sent. <!-- src: README job table -->
- push -> ci
- ci -> sec
- sec -> cd
- cd -> stable
- ci -> status
- sec -> status
- cd -> status
- stable -> status
- status -> clean
- clean -> retrieve
- retrieve -> report
- report -> notify
- status -> notify

## Key decisions
- The LLM is only an explanation layer. Root-cause candidates come from the cleaned log and the retrieved similar failures, which lowers the risk of invented causes. <!-- src: README, Model dan Alasan Desain -->
- AI runs only on failure, so successful runs cost nothing. <!-- src: README, Final Project Summary table -->
- A synthetic, validated knowledge base is used to start, because real failed logs were few. Entries are marked as synthetic. <!-- src: README, Knowledge Base -->
- The full cleaned log is the main retrieval query. The filtered suspicious lines only support the report. <!-- src: README, OOVD-Inspired Filtering -->

## Results
- Controlled evaluation of 15 failure scenarios: 15/15 Top-1 and 15/15 Top-3 with the full cleaned log. <!-- src: evaluations/generated/descriptive-metrics.md -->
- The filtered-lines variant scored 14/15 Top-1 and 15/15 Top-3. <!-- src: evaluations/generated/descriptive-metrics.md -->
- The knowledge base is synthetic and small (5 entries), so this measures a controlled setting. <!-- src: README, Knowledge Base -->
