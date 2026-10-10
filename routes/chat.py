from flask import Blueprint, render_template, request, jsonify
import logging

from services.llm_service import generate_response
from services.rag_service import retrieve_course_context


chat_bp = Blueprint("chat", __name__)


@chat_bp.route("/chat")
def chat():
    return render_template("chat/index.html")


@chat_bp.route("/api/chat", methods=["POST"])
def api_chat():
    try:
        # =====================================
        # 1. RECEVOIR LA REQUÊTE
        # =====================================
        data = request.get_json(silent=True) or {}

        message = data.get("message", "").strip()
        course_id = data.get("course_id")

        print("\n" + "=" * 60, flush=True)
        print("🔥 API CHAT APPELÉE", flush=True)
        print(f"❓ Question : {message}", flush=True)
        print(f"📚 Course ID reçu : {course_id}", flush=True)
        print("=" * 60, flush=True)

        if not message:
            return jsonify({
                "error": "Message vide"
            }), 400

        # =====================================
        # 2. RÉCUPÉRER LE CONTEXTE DU COURS
        # =====================================
        context = ""

        if course_id:
            print("\n🔎 Début de la recherche RAG...", flush=True)

            context = retrieve_course_context(
                question=message,
                course_id=course_id
            )

            print("\n" + "-" * 60, flush=True)
            print("📦 CONTEXTE RÉCUPÉRÉ DEPUIS CHROMADB", flush=True)
            print(f"📏 Longueur : {len(context)} caractères", flush=True)
            print("-" * 60, flush=True)
            print(context, flush=True)
            print("-" * 60, flush=True)
            print("✅ Recherche RAG terminée", flush=True)

        else:
            print(
                "⚠️ Aucun course_id reçu : le RAG n'est pas exécuté.",
                flush=True
            )

        # =====================================
        # 3. GÉNÉRER LA RÉPONSE AVEC GROQ
        # =====================================
        print("\n🤖 Envoi de la question à Groq...", flush=True)

        response = generate_response(
            message=message,
            context=context
        )

        print("✅ Réponse de Groq reçue", flush=True)
        print("=" * 60 + "\n", flush=True)

        # =====================================
        # 4. RETOURNER LA RÉPONSE AU FRONTEND
        # =====================================
        return jsonify({
            "response": response
        })

    except Exception:
        logging.exception("❌ Erreur API CHAT")

        return jsonify({
            "error": "Une erreur est survenue pendant le traitement de votre question."
        }), 500