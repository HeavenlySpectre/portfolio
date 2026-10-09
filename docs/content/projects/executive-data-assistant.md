---
title: Executive Data Assistant
slug: executive-data-assistant
order: 2
category: AI Engineering · Text-to-SQL
year: "2025–2026"  # src: experience.md (PT PAL Indonesia internship, Dec 2025 to Feb 2026)
visibility: NDA, architecture shown, code private
summary: A Telegram assistant that turns business questions in Bahasa Indonesia into read-only SQL and returns the results.
metrics:
  - value: "100%"
    label: Query execution success on hard-level test cases
stack: [Python, FastAPI, ClickHouse, Local LLM runtime, Telegram Bot API, SQL, YAML]
links: []
seo_description: Text-to-SQL Telegram assistant built at PT PAL Indonesia. Bahasa Indonesia questions become validated read-only SQL on ClickHouse.
---
<!-- src for metrics, stack, category, visibility: projects.md -->

## Problem
Managers wanted business numbers without asking an analyst or writing SQL. They asked in Bahasa Indonesia from a chat app. <!-- src: projects.md overview, TelegramSQL dump README features -->

## How it works
A question first passes an input guardrail. A local SQL-specialised language model writes the query, and validators check that it is read-only and uses known columns. If a check or the database fails, the error goes back to the model for up to three attempts. Fixed commands run pre-written queries, and long results are sent as a CSV file. <!-- src: TelegramSQL dump README, ai_query.py, guardrail.py, column_validator.py, router.py -->

### Pipeline
- question | Question | A user sends a message in Telegram. <!-- src: TelegramSQL dump README user workflow -->
- route | Router | Fixed commands go to scripted queries and free text goes to the AI handler. <!-- src: README user workflow, commands.yaml -->
- guard | Input guardrail | Destructive requests are blocked before the model sees them. <!-- src: guardrail.py -->
- generate | SQL generation | A local SQL model writes the query. <!-- src: ai_query.py, README -->
- validate | Validation | Checks that the SQL is read-only and uses known columns. <!-- src: guardrail.py, column_validator.py -->
- run | Execution | The query runs on ClickHouse with a read-only user. <!-- src: README security section -->
- format | Formatter | Small results become a table and results over 15 rows become a CSV. <!-- src: README features, router.py -->
- reply | Bot reply | The answer returns to the chat. <!-- src: README -->
- question -> route
- route -> guard
- route -> run
- guard -> generate
- generate -> validate
- validate -> run
- validate -> generate
- run -> generate
- run -> format
- format -> reply

## Key decisions
- Four safety layers: input guardrail, SQL keyword validator, column validator and a read-only database user. The model never gets write access. <!-- src: README security section -->
- Retry with the error message, at most three times, with a slightly higher temperature each time. <!-- src: ai_query.py -->
- Pre-written commands for common reports, so frequent questions do not depend on the model. <!-- src: README features, commands.yaml -->

## Results
- 100% query execution success on hard-level test cases. <!-- src: projects.md -->
- A case counts as passed when the generated SQL runs without error after the retries. The two test suites hold 5 and 3 hard-level questions. <!-- src: TelegramSQL tests/final_test.py (HARD_TESTS 5), tests/first_layer_test.py (HARD_TESTS 3), run_single_test pass rule. Result logs are not committed -->
