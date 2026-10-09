export interface ToolItem { name: string; icon?: string } // icon = simple-icons slug, none = neutral glyph
export interface ToolGroup { dir: string; lang: boolean; items: ToolItem[] }

const t = (name: string, icon?: string): ToolItem => (icon ? { name, icon } : { name });

export const toolkit: ToolGroup[] = [
  { dir: 'languages', lang: true, items: [t('Python', 'python'), t('SQL'), t('TypeScript', 'typescript'), t('JavaScript', 'javascript'), t('HTML / CSS', 'html5'), t('C / C++', 'cplusplus'), t('Bash', 'gnubash')] },
  { dir: 'expertise', lang: false, items: ['Retrieval-Augmented Generation', 'Large Language Models', 'Agentic AI', 'LLM Evaluation', 'Machine Learning', 'MLOps', 'Data Engineering', 'Natural Language Processing', 'Computer Vision', 'Deep Learning', 'Generative AI', 'LLM Fine-tuning'].map((n) => t(n)) },
  { dir: 'ai-frameworks', lang: false, items: [t('Pandas', 'pandas'), t('NumPy', 'numpy'), t('PyTorch', 'pytorch'), t('Scikit-learn', 'scikitlearn'), t('Hugging Face Transformers', 'huggingface'), t('Hugging Face Hub', 'huggingface'), t('LangChain', 'langchain'), t('LangGraph'), t('LangSmith'), t('LlamaIndex'), t('Model Context Protocol (MCP)'), t('OpenAI API', 'openai'), t('Gemini API', 'googlegemini'), t('Ollama', 'ollama'), t('vLLM'), t('LM Studio'), t('RAGAS'), t('Unsloth')] },
  { dir: 'backend', lang: false, items: [t('FastAPI', 'fastapi'), t('Node.js', 'nodedotjs'), t('Express.js', 'express'), t('REST APIs'), t('Telegram Bot API', 'telegram'), t('Celery', 'celery'), t('Redis', 'redis'), t('Prefect', 'prefect'), t('Uvicorn'), t('HTTPX'), t('Feedparser'), t('Trafilatura')] },
  { dir: 'frontend', lang: false, items: [t('Next.js', 'nextdotjs'), t('React.js', 'react'), t('Tailwind CSS', 'tailwindcss'), t('Vite', 'vite'), t('Streamlit', 'streamlit'), t('Gradio')] },
  { dir: 'data', lang: false, items: [t('PostgreSQL', 'postgresql'), t('MongoDB', 'mongodb'), t('MariaDB', 'mariadb'), t('ClickHouse', 'clickhouse'), t('MySQL', 'mysql'), t('Apache Kafka', 'apachekafka'), t('Apache Spark', 'apachespark'), t('PySpark', 'apachespark'), t('Apache Airflow', 'apacheairflow'), t('Apache Hadoop', 'apachehadoop'), t('BigQuery', 'googlebigquery'), t('MinIO', 'minio')] },
  { dir: 'vector-db', lang: false, items: [t('pgvector'), t('Chroma'), t('FAISS'), t('Pinecone')] },
  { dir: 'infra', lang: false, items: [t('Docker', 'docker'), t('Git', 'git'), t('GitHub Actions', 'githubactions'), t('Kubernetes', 'kubernetes'), t('Linux / WSL', 'linux'), t('MLflow', 'mlflow'), t('YAML', 'yaml')] },
  { dir: 'cloud', lang: false, items: [t('Google Cloud Platform', 'googlecloud'), t('Amazon Web Services', 'amazonwebservices'), t('DigitalOcean', 'digitalocean'), t('Vercel', 'vercel'), t('Netlify', 'netlify')] },
];
