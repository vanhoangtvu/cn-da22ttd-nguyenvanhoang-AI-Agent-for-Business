#!/usr/bin/env python3
import requests
import json

# Test endpoint
url = "http://localhost:5000/analytics/ai-insights"

# Models to test
test_models = [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "groq/compound",
    "gemini-2.5-flash"
]

print("=" * 80)
print("Testing Multiple AI Models")
print("=" * 80)

results = []

for model_id in test_models:
    print(f"\n🧪 Testing: {model_id}")
    print("-" * 80)
    
    data = {
        "analysis_type": "general",
        "model_id": model_id
    }
    
    try:
        response = requests.post(url, json=data, timeout=60)
        
        if response.status_code == 200:
            result = response.json()
            insights = result.get('insights', '')
            print(f"✅ SUCCESS - Response: {len(insights)} chars")
            print(f"   Preview: {insights[:150]}...")
            results.append({"model": model_id, "status": "✅ OK", "length": len(insights)})
        else:
            print(f"❌ FAILED - Status: {response.status_code}")
            print(f"   Error: {response.text[:200]}")
            results.append({"model": model_id, "status": "❌ FAILED", "error": response.status_code})
            
    except requests.exceptions.Timeout:
        print(f"⏱️  TIMEOUT after 60 seconds")
        results.append({"model": model_id, "status": "⏱️ TIMEOUT", "error": "60s timeout"})
    except Exception as e:
        print(f"💥 ERROR: {str(e)}")
        results.append({"model": model_id, "status": "💥 ERROR", "error": str(e)})

# Summary
print("\n" + "=" * 80)
print("SUMMARY")
print("=" * 80)
for r in results:
    status = r['status']
    model = r['model']
    if 'length' in r:
        print(f"{status} {model:40} - {r['length']} chars")
    else:
        print(f"{status} {model:40} - {r.get('error', 'Unknown error')}")

success_count = sum(1 for r in results if '✅' in r['status'])
print(f"\n✅ {success_count}/{len(test_models)} models working successfully")
print("=" * 80)
