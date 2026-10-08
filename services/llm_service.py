from google import genai
from config import Config


client = genai.Client(
    api_key=Config.GEMINI_API_KEY
)


def generate_response(message):

    response = client.models.generate_content(
        model="gemini-3.8-flash",
        contents=message
    )

    return response.text