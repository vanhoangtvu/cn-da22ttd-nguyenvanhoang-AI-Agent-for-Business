#!/usr/bin/env python3
import requests
import json

# Test endpoint
url = "http://localhost:5000/analytics/ai-insights"

# Get all available models first
models_response = requests.get("http://localhost:5000/analytics/models")
all_models = models_response.json()['models']
groq_models = [m['id'] for m in all_models if m['provider'] == 'Groq']

print("=" * 80)
print(f"Testing ALL {len(groq_models)} Groq Models")
print("=" * 80)

results = []

for model_id in groq_models:
    print(f"\n🧪 Testing: {model_id}")
    
    data = {
        "analysis_type": "general",
        "model_id": model_id
    }
    
    try:
        response = requests.post(url, json=data, timeout=60)
        
        if response.status_code == 200:
            result = response.json()
            insights = result.get('insights', '')
            print(f"   ✅ OK - {len(insights)} chars")
            results.append({"model": model_id, "status": "✅", "length": len(insights)})
        else:
            error_msg = response.text[:150]
            print(f"   ❌ FAILED - {response.status_code}: {error_msg}")
            results.append({"model": model_id, "status": "❌", "error": f"{response.status_code}"})
            
    except requests.exceptions.Timeout:
        print(f"   ⏱️  TIMEOUT")
        results.append({"model": model_id, "status": "⏱️", "error": "timeout"})
    except Exception as e:
        print(f"   💥 ERROR: {str(e)[:100]}")
        results.append({"model": model_id, "status": "💥", "error": str(e)[:100]})

# Summary
print("\n" + "=" * 80)
print("SUMMARY")
print("=" * 80)

success = [r for r in results if r['status'] == '✅']
failed = [r for r in results if r['status'] == '❌']
timeout = [r for r in results if r['status'] == '⏱️']
error = [r for r in results if r['status'] == '💥']

print(f"\n✅ SUCCESS: {len(success)}/{len(groq_models)}")
for r in success:
    print(f"   {r['model']:50} - {r['length']} chars")

if failed:
    print(f"\n❌ FAILED: {len(failed)}")
    for r in failed:
        print(f"   {r['model']:50} - Error {r['error']}")

if timeout:
    print(f"\n⏱️  TIMEOUT: {len(timeout)}")
    for r in timeout:
        print(f"   {r['model']}")

if error:
    print(f"\n💥 ERROR: {len(error)}")
    for r in error:
        print(f"   {r['model']:50} - {r['error']}")

print("=" * 80)
