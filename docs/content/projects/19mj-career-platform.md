---
title: 19MJ AI Career Development & Hiring Platform
slug: 19mj-career-platform
order: 5
category: AI Engineering · Full-Stack Application
year: "2026"  # src: repo README timeline 30 Mar to 7 Jun 2026, commits 2026-04-07 to 2026-06-25
visibility: Public team project
summary: An AI career and hiring platform for candidates and companies, built as a capstone project.
metrics:
  - value: "9"
    label: AI service files I added (8 backend, 1 speech-to-text)
stack: [React.js, Vite, Node.js, Express.js, PostgreSQL, FastAPI, Faster-Whisper, Google AI Studio, OpenRouter]
links:
  - label: Repository
    url: https://github.com/nessorrowz/19MJ
contribution: I built the AI layer as Backend / AI Engineer. I wrote the LLM gateway with provider fallback, the CV review, career planner, interview session and screening evaluation services, the local speech-to-text service, and the AI caching and budget services. I also added Swagger docs for the AI endpoints and the forgot-password flow with email PIN.
seo_description: 19MJ, an AI career development and hiring platform. Capstone team project with CV review, AI interviews and candidate screening.
---
<!-- src for stack, links, category, visibility: projects.md. Team size and roles: repo README (5 members). Commits: GitHub API, 10 of 81 by HeavenlySpectre -->

## Problem
Candidates and companies use separate tools for CV review, career planning, interviews and hiring. 19MJ puts them in one system. <!-- src: projects.md overview -->

## How it works
A React frontend talks to a Node and Express backend with PostgreSQL. The backend runs the AI features: CV review, career roadmap, interview sessions and candidate screening. Text requests go through an LLM gateway that tries Google AI Studio models first and falls back to OpenRouter. Interview audio is sent to a separate Python service that transcribes it locally with Faster-Whisper. <!-- src: projects.md, BE README, llmGateway.js, AI README -->

### Pipeline
- user | Candidate or company | Uses the React app. <!-- src: projects.md -->
- api | Express backend | Auth, profiles, jobs and AI endpoints. <!-- src: repo README, BE structure -->
- cv | CV review and career planner | Prompts built from candidate data. <!-- src: BE/src/ai services in commit 5bb9986 -->
- audio | Interview audio | Recorded answers are uploaded. <!-- src: commit 5bb9986, interviewUpload middleware -->
- stt | Speech-to-text | A Python FastAPI service runs Faster-Whisper. <!-- src: AI README -->
- gateway | LLM gateway | Google AI Studio models first, then OpenRouter. <!-- src: llmGateway.js -->
- eval | Evaluation | Interview and candidate screening results are scored. <!-- src: commit 5bb9986 services -->
- cache | Cache and budget | AI results are cached and usage is limited. <!-- src: commit 3d24dc6 aiCacheService, aiBudgetService -->
- db | PostgreSQL | Results are stored. <!-- src: projects.md -->
- user -> api
- api -> cv
- api -> audio
- audio -> stt
- stt -> eval
- cv -> gateway
- eval -> gateway
- gateway -> cache
- cache -> db

## Key decisions
- A single gateway with an ordered list of providers, so a failed or rate-limited model falls through to the next one. <!-- src: llmGateway.js -->
- Speech-to-text runs locally in its own service, with GPU use when available and CPU as a fallback. <!-- src: AI README -->
- Audio paths are restricted to the interview media folder. <!-- src: AI README -->
- Model output is parsed as strict JSON and validated before it is stored, so only well-formed results reach the database. <!-- src: 19MJ learn.md section 12, BE/src/ai/services/aiOutputService.js, validators/aiResultValidators.js. The repo gives no reason for ordering Google AI Studio before OpenRouter -->

## Results
- The documented setup runs locally with a smoke-test guide. No public deployment is listed. <!-- src: 19MJ README (Deployment: TBD), BE/docs/ai-smoke-tests.md, learn.md local deployment diagram. No user, latency or accuracy numbers exist in the repo -->
