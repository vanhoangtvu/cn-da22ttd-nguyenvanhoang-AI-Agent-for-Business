#!/usr/bin/env python3
"""
Test script to fetch and display Groq models from API
"""
import os
from dotenv import load_dotenv
from groq import Groq

# Load environment variables
load_dotenv()

def test_groq_models():
    """Fetch and display all available Groq models"""
    api_key = os.getenv('GROQ_API_KEY')
    
    if not api_key:
        print("❌ GROQ_API_KEY not found in environment")
        return
    
    print(f"✓ API Key loaded: {api_key[:20]}...")
    
    try:
        # Initialize Groq client
        client = Groq(api_key=api_key)
        print("✓ Groq client initialized successfully\n")
        
        # Fetch models
        print("Fetching models from Groq API...\n")
        models_response = client.models.list()
        
        print(f"{'='*80}")
        print(f"Total Models Available: {len(models_response.data)}")
        print(f"{'='*80}\n")
        
        for idx, model in enumerate(models_response.data, 1):
            print(f"{idx}. Model ID: {model.id}")
            print(f"   Owned by: {getattr(model, 'owned_by', 'N/A')}")
            print(f"   Active: {getattr(model, 'active', 'N/A')}")
            print(f"   Context Window: {getattr(model, 'context_window', 'N/A')}")
            print(f"   Created: {getattr(model, 'created', 'N/A')}")
            print()
        
        # Test chat with first model
        if models_response.data:
            test_model = models_response.data[0].id
            print(f"{'='*80}")
            print(f"Testing chat with model: {test_model}")
            print(f"{'='*80}\n")
            
            chat_completion = client.chat.completions.create(
                messages=[
                    {
                        "role": "user",
                        "content": "Say 'Hello from Groq!' in Vietnamese"
                    }
                ],
                model=test_model,
                temperature=0.7,
                max_tokens=100,
            )
            
            response = chat_completion.choices[0].message.content
            print(f"Response: {response}\n")
            print("✓ Chat test successful!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_groq_models()
