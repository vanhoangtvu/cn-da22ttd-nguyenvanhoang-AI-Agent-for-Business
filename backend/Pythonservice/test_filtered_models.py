#!/usr/bin/env python3
"""
Test the filtered Groq models endpoint
"""
import sys
import os
from dotenv import load_dotenv

# Load environment
load_dotenv()

sys.path.append('/home/hv/DuAn/CSN/AI-Agent-for-Business/backend/Pythonservice')

from routes.groq_service import init_groq, get_cached_models

# Initialize Groq
print("Initializing Groq client...")
success = init_groq()

if success:
    print("\nFetching filtered chat models...")
    models = get_cached_models()
    
    print(f"\n{'='*80}")
    print(f"Total Chat Models: {len(models)}")
    print(f"{'='*80}\n")
    
    for idx, model in enumerate(models, 1):
        print(f"{idx}. {model['name']}")
        print(f"   Owner: {model.get('owned_by', 'N/A')}")
        print(f"   Context: {model['context_window']:,} tokens")
        print()
else:
    print("Failed to initialize Groq client")
