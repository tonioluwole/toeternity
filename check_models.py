from google import genai
from dotenv import load_dotenv

# Load your API key from the .env file
load_dotenv()

client = genai.Client()

print("Fetching available models...\n")
try:
    for model in client.models.list():
        # We only want models that support text/content generation
        print(model.name)
except Exception as e:
    print(f"Error fetching models: {e}")