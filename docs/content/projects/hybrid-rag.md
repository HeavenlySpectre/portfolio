---
title: Hybrid RAG Knowledge Assistant
slug: hybrid-rag
order: 1
category: AI Engineering · RAG
year: "2025–2026"  # src: experience.md (PT PAL Indonesia internship, Dec 2025 to Feb 2026)
visibility: NDA, architecture shown, code private
summary: An internal assistant that answers questions from company documents with hybrid retrieval, reranking and a local language model.
metrics:
  - value: "86.67%"
    label: Context Recall
  - value: "78.89%"
    label: Context Precision
stack: [Python, FastAPI, Next.js, PostgreSQL, Vector retrieval, BM25, Reranking, Local LLM inference]
links: []
seo_description: Hybrid RAG assistant built at PT PAL Indonesia. Vector and BM25 retrieval, rank fusion, reranking and a local LLM. 86.67% context recall.
---
<!-- src for metrics, stack, category, visibility: projects.md -->

## Problem
Staff at PT PAL Indonesia needed a faster way to find answers inside long internal PDF documents. Answers had to cite their sources and run on local models. <!-- src: RAG dump README (system answers questions about internal documents at PT PAL Indonesia, answer returns source documents), projects.md (locally managed inference) -->

## How it works
Uploaded PDFs are extracted, including tables, split into chunks that follow the document structure and indexed twice, once as embeddings and once as keywords. At query time both indexes return candidates, which are merged with Reciprocal Rank Fusion and reranked by a cross-encoder. The top chunks go to a local language model with the question, and the answer comes back with its source documents. <!-- src: RAG dump README ingestion and RAG pipeline sections, Magang-PAL backend/app/worker.py -->

Evaluated with RAGAS (LLM-as-a-judge). <!-- src: task instruction -->

### Pipeline
- upload | PDF upload | An admin uploads a document in the dashboard. <!-- src: RAG dump README, Admin-Dashboard upload page -->
- extract | Extraction | Text and tables are pulled from the PDF. <!-- src: RAG dump README ingestion step 1 -->
- chunk | Chunking | The split depends on document type. Regulations are cut by chapter and article, other structured files by section and the rest where topic similarity drops. Pieces over 4000 characters are cut again into 2000 characters with 200 overlap. <!-- src: Magang-PAL backend/app/worker.py (strategy chosen per document type), hierarchical_chunker.py, section_chunker.py, pdf_processor.py, app/core/config.py (MAX_CHUNK_SIZE 4000, SUB_CHUNK_SIZE 2000, CHUNK_OVERLAP 200). The README figure of 800/200 is stale and not used at runtime -->
- embed | Embedding index | Chunks are embedded with an Indonesian e5 model into a vector store. <!-- src: RAG dump README step 3A -->
- bm25 | Keyword index | The same chunks are tokenized for BM25. <!-- src: RAG dump README step 3B -->
- query | User question | A question arrives from the chat interface. <!-- src: RAG dump README pipeline step 1 -->
- fuse | Rank fusion | Top 10 vector and top 10 BM25 candidates are merged with RRF. <!-- src: RAG dump backend config (RETRIEVAL_N_TOP=10, RRF), README -->
- rerank | Reranking | A cross-encoder reranker keeps the top 5 chunks. <!-- src: RAG dump README (BGE reranker, 5 chunks), backend config -->
- generate | Generation | A local language model writes the answer from the chunks. <!-- src: RAG dump README step 5 (SeaLLMs-v3) -->
- answer | Answer with sources | The reply lists the source documents. <!-- src: RAG dump README step 5 -->
- upload -> extract
- extract -> chunk
- chunk -> embed
- chunk -> bm25
- query -> fuse
- embed -> fuse
- bm25 -> fuse
- fuse -> rerank
- rerank -> generate
- generate -> answer

## Key decisions
- Hybrid retrieval, vector plus BM25. Semantic and exact keyword search miss different things, so the two are fused. <!-- src: RAG dump README (hybrid architecture combines semantic and keyword search) -->
- A reranking step after fusion to raise the relevance of the final chunks. <!-- src: RAG dump README tech stack table -->
- A small local model, SeaLLMs-v3 1.5B, tuned for Bahasa Indonesia. <!-- src: RAG dump README tech stack table -->
- Table cleanup before generation, so rows from PDF tables do not confuse the model. <!-- src: RAG dump retrieval_service.py comments, technique only -->
- The reranker runs on CPU, so the GPU memory stays free for the language model. <!-- src: Magang-PAL backend/app/services/bge_reranker.py docstring, README (6GB consumer GPU target) -->

## Results
- 86.67% Context Recall and 78.89% Context Precision. <!-- src: projects.md -->
- Evaluated with RAGAS (LLM-as-a-judge). <!-- src: task instruction -->
- The evaluation set has 15 questions. <!-- src: Magang-PAL backend/testing_script/evaluation/golden_dataset.json (15 entries), run_ragas_eval.py -->
