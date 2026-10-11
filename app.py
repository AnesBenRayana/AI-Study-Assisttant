from flask import Flask
from routes.auth import auth_bp
from routes.chat import chat_bp
from routes.courses import courses_bp



app = Flask(__name__)

app.register_blueprint(auth_bp)
app.register_blueprint(chat_bp)
app.register_blueprint(courses_bp)

from flask import redirect, url_for

@app.route("/")
def home():
    return redirect(url_for("auth.login"))


if __name__ == "__main__":
    app.run(debug=True)