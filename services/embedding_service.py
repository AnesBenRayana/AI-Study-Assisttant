import requests
from config import Config


JINA_API_URL = "https://api.jina.ai/v1/embeddings"
JINA_MODEL = "jina-embeddings-v5-text-small"


def _generate_embeddings(texts, task):
    if not texts:
        return []

    if not Config.JINA_API_KEY:
        raise ValueError("JINA_API_KEY est absente du fichier .env.")

    response = requests.post(
        JINA_API_URL,
        headers={
            "Authorization": f"Bearer {Config.JINA_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "model": JINA_MODEL,
            "input": texts,
            "task": task,
        },
        timeout=60,
    )

    response.raise_for_status()

    data = response.json()["data"]
    data.sort(key=lambda item: item["index"])

    return [item["embedding"] for item in data]


def embed_chunks(chunks):
    return _generate_embeddings(chunks, "retrieval.passage")


def embed_query(question):
    embeddings = _generate_embeddings(
        [question],
        "retrieval.query",
    )
    return embeddings[0]