
import os
import uuid
import tempfile
import logging

from flask import Blueprint, request, jsonify

from services.rag_service import index_course_pdf


courses_bp = Blueprint("courses", __name__)


@courses_bp.route("/api/courses", methods=["POST"])
def upload_course():
    temp_path = None

    try:
        # 1. Vérifier la présence du fichier
        if "file" not in request.files:
            return jsonify({
                "error": "Aucun fichier envoyé."
            }), 400

        file = request.files["file"]

        if not file.filename:
            return jsonify({
                "error": "Aucun fichier sélectionné."
            }), 400

        if not file.filename.lower().endswith(".pdf"):
            return jsonify({
                "error": "Seuls les fichiers PDF sont acceptés."
            }), 400

        # 2. Créer un identifiant pour le cours
        course_id = str(uuid.uuid4())

        # 3. Enregistrer temporairement le PDF
        with tempfile.NamedTemporaryFile(
            suffix=".pdf",
            delete=False,
        ) as temp_file:
            temp_path = temp_file.name
            file.save(temp_path)

        # 4. Déléguer le traitement au service RAG
        count = index_course_pdf(temp_path, course_id)

        # 5. Retourner le résultat au frontend
        return jsonify({
            "message": "Cours importé et indexé avec succès.",
            "course_id": course_id,
            "chunks_count": count,
        }), 201

    except Exception:
        logging.exception("Erreur lors de l'importation du cours.")

        return jsonify({
            "error": (
                "Impossible de traiter ce PDF. "
                "Vérifiez le fichier et réessayez."
            )
        }), 500

    finally:
        # 6. Supprimer le PDF temporaire
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)