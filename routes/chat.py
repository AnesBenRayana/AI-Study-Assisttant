from flask import Blueprint, render_template, request, jsonify

from services.llm_service import generate_response


chat_bp = Blueprint("chat", __name__)


@chat_bp.route("/chat")
def chat():

    return render_template("chat/index.html")


@chat_bp.route("/api/chat", methods=["POST"])
def api_chat():

    try:

        data = request.get_json()

        message = data.get("message", "").strip()

        if not message:

            return jsonify({
                "error": "Message vide"
            }), 400

        response = generate_response(message)

        return jsonify({
            "response": response
        })

    except Exception as e:

        print("ERREUR API CHAT :", e)

        return jsonify({
            "error": str(e)
        }), 500