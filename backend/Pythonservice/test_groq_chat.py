"""
Groq Chat Controller - Usage Examples & Tests
Run this file to test the Groq Chat endpoints
"""

import requests
import json
from typing import List, Dict, Optional

# Configuration
BASE_URL = "http://localhost:5000/api/groq-chat"

class GroqChatClient:
    """Simple client for Groq Chat API"""
    
    def __init__(self, base_url: str = BASE_URL):
        self.base_url = base_url
        self.conversation_history: List[Dict] = []
    
    def health_check(self) -> Dict:
        """Check if Groq Chat service is healthy"""
        response = requests.get(f"{self.base_url}/health")
        return response.json()
    
    def get_models(self) -> Dict:
        """Get available Groq models"""
        response = requests.get(f"{self.base_url}/models")
        return response.json()
    
    def simple_chat(self, message: str) -> str:
        """Simple chat - single message, no history"""
        response = requests.post(
            f"{self.base_url}/simple-chat",
            params={"message": message}
        )
        data = response.json()
        return data['message']
    
    def chat(
        self,
        message: str,
        model: str = "mixtral-8x7b-32768",
        max_tokens: int = 1024,
        temperature: float = 0.7
    ) -> str:
        """Chat with history support"""
        response = requests.post(
            f"{self.base_url}/chat",
            json={
                "message": message,
                "conversation_history": self.conversation_history,
                "model": model,
                "max_tokens": max_tokens,
                "temperature": temperature
            }
        )
        data = response.json()
        
        # Add to history for next request
        self.conversation_history.append({
            "role": "user",
            "content": message
        })
        self.conversation_history.append({
            "role": "assistant",
            "content": data['message']
        })
        
        return data['message']
    
    def conversation(
        self,
        messages: List[Dict],
        model: str = "mixtral-8x7b-32768",
        max_tokens: int = 1024,
        temperature: float = 0.7
    ) -> str:
        """Send full conversation"""
        response = requests.post(
            f"{self.base_url}/conversation",
            json={
                "messages": messages,
                "model": model,
                "max_tokens": max_tokens,
                "temperature": temperature
            }
        )
        data = response.json()
        return data['message']
    
    def clear_history(self):
        """Clear conversation history"""
        self.conversation_history = []


def test_health_check():
    """Test 1: Health Check"""
    print("\n" + "="*60)
    print("TEST 1: Health Check")
    print("="*60)
    
    client = GroqChatClient()
    try:
        result = client.health_check()
        print(f"✅ Status: {result['status']}")
        print(f"✅ Service: {result['service']}")
        print(f"✅ API Configured: {result['api_configured']}")
        print(f"✅ Timestamp: {result['timestamp']}")
    except Exception as e:
        print(f"❌ Error: {e}")


def test_get_models():
    """Test 2: Get Available Models"""
    print("\n" + "="*60)
    print("TEST 2: Get Available Models")
    print("="*60)
    
    client = GroqChatClient()
    try:
        result = client.get_models()
        print(f"✅ Default Model: {result['default_model']}")
        print(f"✅ Available Models ({len(result['models'])} total):")
        for model in result['models']:
            print(f"   - {model}")
    except Exception as e:
        print(f"❌ Error: {e}")


def test_simple_chat():
    """Test 3: Simple Chat (No History)"""
    print("\n" + "="*60)
    print("TEST 3: Simple Chat")
    print("="*60)
    
    client = GroqChatClient()
    try:
        message = "What is artificial intelligence in one sentence?"
        print(f"User: {message}")
        
        response = client.simple_chat(message)
        print(f"Groq: {response}")
        print("✅ Simple chat works!")
    except Exception as e:
        print(f"❌ Error: {e}")


def test_chat_with_history():
    """Test 4: Chat with History"""
    print("\n" + "="*60)
    print("TEST 4: Chat with History (Context-Aware)")
    print("="*60)
    
    client = GroqChatClient()
    try:
        # First message
        msg1 = "Tell me about Python"
        print(f"\n👤 User 1: {msg1}")
        response1 = client.chat(msg1)
        print(f"🤖 Groq: {response1[:200]}...")
        
        # Second message (should have context)
        msg2 = "What are its main uses?"
        print(f"\n👤 User 2: {msg2}")
        response2 = client.chat(msg2)
        print(f"🤖 Groq: {response2[:200]}...")
        
        print("\n✅ Chat with history works!")
    except Exception as e:
        print(f"❌ Error: {e}")


def test_full_conversation():
    """Test 5: Full Conversation"""
    print("\n" + "="*60)
    print("TEST 5: Full Conversation")
    print("="*60)
    
    client = GroqChatClient()
    try:
        messages = [
            {"role": "user", "content": "Hi there!"},
            {"role": "assistant", "content": "Hello! How can I help you today?"},
            {"role": "user", "content": "What is machine learning?"}
        ]
        
        print("📝 Conversation:")
        for msg in messages:
            role_icon = "👤" if msg['role'] == 'user' else "🤖"
            print(f"{role_icon} {msg['role'].capitalize()}: {msg['content']}")
        
        print("\n⏳ Groq is thinking...")
        response = client.conversation(messages)
        print(f"\n🤖 Groq: {response[:300]}...")
        
        print("\n✅ Full conversation works!")
    except Exception as e:
        print(f"❌ Error: {e}")


def run_all_tests():
    """Run all tests"""
    print("\n" + "="*60)
    print("GROQ CHAT CONTROLLER - TESTING SUITE")
    print("="*60)
    print(f"Base URL: {BASE_URL}")
    
    try:
        test_health_check()
        test_get_models()
        test_simple_chat()
        test_chat_with_history()
        test_full_conversation()
        
        print("\n" + "="*60)
        print("✅ ALL TESTS COMPLETED!")
        print("="*60)
        
    except requests.exceptions.ConnectionError:
        print("\n❌ ERROR: Cannot connect to server")
        print(f"Make sure server is running at {BASE_URL}")
        print("Start with: python3 app.py")
    except Exception as e:
        print(f"\n❌ FATAL ERROR: {e}")


if __name__ == "__main__":
    run_all_tests()
