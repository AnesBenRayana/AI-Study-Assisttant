from services.pdf_service import extract_text_from_pdf
from services.chunking_service import split_text

from services.embedding_service import (
    embed_chunks,
    embed_query,
)

from services.vector_service import (
    store_chunks,
    search_chunks,
)


def index_course_pdf(pdf_path, course_id):
    """
    Traite un PDF et stocke ses chunks dans ChromaDB.
    """

    # 1. Extraire le texte du PDF
    text = extract_text_from_pdf(pdf_path)

    # 2. Découper le texte en chunks
    chunks = split_text(text)

    if not chunks:
        raise ValueError(
            "Le PDF ne contient aucun texte exploitable."
        )

    # 3. Générer les embeddings avec Jina
    embeddings = embed_chunks(chunks)

    # 4. Enregistrer les chunks dans ChromaDB
    count = store_chunks(
        chunks=chunks,
        embeddings=embeddings,
        course_id=course_id,
    )

    # 5. Retourner le nombre de chunks enregistrés
    return count


def retrieve_course_context(question, course_id):
    # 1. Transformer la question en embedding
    query_embedding = embed_query(question)

    # 2. Rechercher les chunks pertinents dans ChromaDB
    chunks = search_chunks(
        query_embedding=query_embedding,
        course_id=course_id,
        n_results=4,
    )

    # 3. Afficher les résultats dans le terminal
    print("\n" + "=" * 60)
    print("🔎 RAG - RECHERCHE DANS CHROMADB")
    print("=" * 60)
    print(f"❓ Question : {question}")
    print(f"📚 Course ID : {course_id}")
    print(f"📦 Nombre de chunks récupérés : {len(chunks)}")

    for i, chunk in enumerate(chunks, start=1):
        print(f"\n--- CHUNK {i} ---")
        print(chunk)

    print("\n" + "=" * 60)
    print("✅ FIN DE LA RECHERCHE RAG")
    print("=" * 60 + "\n")

    # 4. Combiner les chunks pour Groq
    return "\n\n".join(chunks)