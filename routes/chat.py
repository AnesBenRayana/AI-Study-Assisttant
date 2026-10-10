from flask import Blueprint, render_template, request, jsonify
import logging

from services.llm_service import generate_response
from services.rag_service import retrieve_course_context
from services.vector_service import delete_course


chat_bp = Blueprint("chat", __name__)


@chat_bp.route("/chat")
def chat():
    return render_template("chat/index.html")


# =====================================
# API CHAT
# =====================================

@chat_bp.route("/api/chat", methods=["POST"])
def api_chat():
    try:
        data = request.get_json(silent=True) or {}

        message = data.get("message", "").strip()
        course_id = data.get("course_id")

        # 1. Vérifier le message
        if not message:
            return jsonify({
                "error": "Veuillez saisir une demande."
            }), 400

        # 2. Exiger un PDF
        if not course_id:
            return jsonify({
                "error": (
                    "📄 Aucun document n'a été importé. "
                    "Veuillez importer un PDF pour commencer."
                )
            }), 400

        # 3. Récupérer le contexte du cours
        context = retrieve_course_context(
            question=message,
            course_id=course_id
        )

        # 4. Ne pas répondre sans contenu exploitable
        if not context or not context.strip():
            return jsonify({
                "error": (
                    "Aucun contenu exploitable n'a été trouvé "
                    "pour ce cours. Veuillez importer un PDF valide."
                )
            }), 400

        # 5. Générer la réponse avec Groq
        response = generate_response(
            message=message,
            context=context
        )

        return jsonify({
            "response": response
        }), 200

    except Exception:
        logging.exception("Erreur API CHAT")

        return jsonify({
            "error": (
                "Une erreur est survenue pendant le traitement "
                "de votre demande."
            )
        }), 500


# =====================================
# TERMINER LA SESSION ET SUPPRIMER LE COURS
# =====================================

@chat_bp.route("/api/chat/end-session", methods=["POST"])
def end_chat_session():
    try:
        data = request.get_json(silent=True) or request.form

        course_id = data.get("course_id")

        if course_id:
            delete_course(course_id)

            logging.info(
                "Données ChromaDB supprimées pour le cours %s",
                course_id
            )

        return jsonify({
            "message": "Session terminée."
        }), 200

    except Exception:
        logging.exception(
            "Erreur lors de la suppression des données du cours."
        )

        return jsonify({
            "error": "Impossible de nettoyer les données de la session."
        }), 500