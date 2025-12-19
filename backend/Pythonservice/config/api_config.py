"""
API Configuration for Python Backend
"""

import os

def get_groq_chat_url(endpoint: str) -> str:
    """Get full Groq chat URL"""
    base_url = os.getenv('AI_SERVICE_URL', 'http://localhost:5000')
    return f"{base_url}/api/groq-chat{endpoint}"

def getGroqChatUrl(endpoint: str) -> str:
    """Alias for get_groq_chat_url"""
    return get_groq_chat_url(endpoint)