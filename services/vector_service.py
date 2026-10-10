import chromadb


client = chromadb.PersistentClient(path="./chroma_data")

collection = client.get_or_create_collection(
    name="study_courses",
    metadata={"hnsw:space": "cosine"},
)


def store_chunks(chunks, embeddings, course_id):
    if len(chunks) != len(embeddings):
        raise ValueError(
            "Le nombre de morceaux doit correspondre au nombre de vecteurs."
        )

    if not chunks:
        raise ValueError("Aucun morceau à enregistrer.")

    ids = [
        f"{course_id}_{i}"
        for i in range(len(chunks))
    ]

    collection.upsert(
        ids=ids,
        documents=chunks,
        embeddings=embeddings,
        metadatas=[
            {"course_id": course_id, "chunk_index": i}
            for i in range(len(chunks))
        ],
    )

    return len(chunks)


def search_chunks(query_embedding, course_id, n_results=4):
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=n_results,
        where={"course_id": course_id},
    )

    return results["documents"][0]