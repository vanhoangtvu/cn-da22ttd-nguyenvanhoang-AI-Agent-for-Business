#!/usr/bin/env python3
import os
import requests
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Test endpoint
url = "http://localhost:5000/analytics/ai-insights"

# Test data - simple request
data = {
    "analysis_type": "general",
    "model_id": "llama-3.3-70b-versatile"
}

print("=" * 60)
print("Testing AI Insights with Groq model: llama-3.3-70b-versatile")
print("=" * 60)
print(f"\nRequest URL: {url}")
print(f"Request Data: {json.dumps(data, indent=2)}")
print("\nSending request...\n")

try:
    response = requests.post(url, json=data, timeout=60)
    
    print(f"Status Code: {response.status_code}")
    print("-" * 60)
    
    if response.status_code == 200:
        result = response.json()
        print("✅ SUCCESS!")
        print(f"\nModel used: {result.get('model_used', 'N/A')}")
        print(f"Analysis type: {result.get('analysis_type', 'N/A')}")
        print(f"\nInsights preview (first 500 chars):")
        print("-" * 60)
        insights = result.get('insights', '')
        print(insights[:500] + "..." if len(insights) > 500 else insights)
        print("-" * 60)
        print(f"\nFull response length: {len(insights)} characters")
    else:
        print("❌ FAILED!")
        print(f"Error: {response.text}")
        
except requests.exceptions.Timeout:
    print("❌ Request timeout after 60 seconds")
except Exception as e:
    print(f"❌ Error: {str(e)}")

print("\n" + "=" * 60)
