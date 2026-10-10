
from groq import Groq
from config import Config

client = Groq(
    api_key=Config.GROQ_API_KEY
)


def generate_response(message, context=""):
    if context:
        prompt = f"""
Tu es un assistant pédagogique.
Réponds à la question en utilisant prioritairement
les informations du cours ci-dessous.

Si le cours ne contient pas la réponse, indique-le clairement.
N'invente pas d'informations et distingue les explications
supplémentaires du contenu du cours.

CONTEXTE DU COURS :
{context}

QUESTION :
{message}
"""
    else:
        prompt = message

    response = client.chat.completions.create(
        model="openai/gpt-oss-120b",
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ]
    )

    return response.choices[0].message.content