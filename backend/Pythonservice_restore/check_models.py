import google.generativeai as genai

# Configure API
genai.configure(api_key=GOOGLE_API_KEY)

print("\n=== AVAILABLE GEMINI MODELS ===\n")

# List all models
models = genai.list_models()

for m in models:
    if 'generateContent' in m.supported_generation_methods:
        print(f"Model Name: {m.name}")
        print(f"Display Name: {m.display_name}")
        print(f"Supported Methods: {m.supported_generation_methods}")
        print("---")
