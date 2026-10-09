from groq import Groq
from config import Config

client = Groq(
    api_key=Config.GROQ_API_KEY
)


def generate_response(message):

    response = client.chat.completions.create(
        model="openai/gpt-oss-120b",
        messages=[
            {
                "role": "user",
                "content": message
            }
        ]
    )

    return response.choices[0].message.content