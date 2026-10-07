from flask import Blueprint, render_template


chat_bp = Blueprint("chat", __name__)


@chat_bp.route("/chat")
def chat():
    return render_template("chat/index.html")