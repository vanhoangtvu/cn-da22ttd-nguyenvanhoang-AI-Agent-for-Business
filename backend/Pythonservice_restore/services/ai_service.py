"""
Shared AI Service
Provides unified interface to AI providers (Gemini, Groq)
Used by both customer chat and business analytics
"""
import os
import google.generativeai as genai
from groq import Groq
from typing import Optional, Dict, Any, List
from datetime import datetime


class AIService:
    """Shared AI service for both customer chat and business analytics"""
    
    def __init__(self):
        """Initialize AI service with API keys"""
        # Configure Gemini
        self.gemini_api_key = os.getenv('GOOGLE_API_KEY')
        if self.gemini_api_key:
            genai.configure(api_key=self.gemini_api_key)
            print("[AI Service] Gemini configured successfully")
        
        # Configure Groq
        self.groq_api_key = os.getenv('GROQ_API_KEY')
        self.groq_client = None
        if self.groq_api_key:
            self.groq_client = Groq(api_key=self.groq_api_key)
            print("[AI Service] Groq configured successfully")
        
        # Cache for models
        self._cached_models = None
        self._models_cache_time = None
    
    def get_available_models(self) -> List[Dict[str, Any]]:
        """
        Get list of available AI models from all providers
        Returns: List of model dictionaries with id, name, provider, context_window
        """
        import time
        
        # Cache for 1 hour
        if self._cached_models and self._models_cache_time and (time.time() - self._models_cache_time) < 3600:
            return self._cached_models
        
        models = []
        
        # Get Gemini models
        if self.gemini_api_key:
            try:
                gemini_models = genai.list_models()
                allowed_gemini = ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-pro', 'gemini-1.5-flash', 'gemini-1.5-pro']
                
                for m in gemini_models:
                    if 'generateContent' in m.supported_generation_methods:
                        model_id = m.name.replace('models/', '')
                        
                        if any(allowed in model_id for allowed in allowed_gemini):
                            models.append({
                                'id': model_id,
                                'name': m.display_name,
                                'provider': 'Google',
                                'context_window': getattr(m, 'input_token_limit', 32768)
                            })
                            print(f"[AI Service] Added Gemini model: {model_id}")
                
            except Exception as e:
                print(f"[AI Service] Error loading Gemini models: {e}")
        
        # Get Groq models
        if self.groq_client:
            try:
                models_response = self.groq_client.models.list()
                excluded_keywords = ['whisper', 'distil-whisper', 'guard']
                
                for model in models_response.data:
                    if hasattr(model, 'id') and model.id:
                        model_id_lower = model.id.lower()
                        
                        if not any(keyword in model_id_lower for keyword in excluded_keywords):
                            models.append({
                                'id': model.id,
                                'name': getattr(model, 'name', model.id),
                                'provider': 'Groq',
                                'context_window': getattr(model, 'context_window', 8192)
                            })
                            print(f"[AI Service] Added Groq model: {model.id}")
                
            except Exception as e:
                print(f"[AI Service] Error loading Groq models: {e}")
        
        self._cached_models = models
        self._models_cache_time = time.time()
        
        return models
    
    def generate_with_gemini(self, model_id: str, prompt: str, system_instruction: Optional[str] = None) -> str:
        """
        Generate content using Gemini
        
        Args:
            model_id: Gemini model ID
            prompt: User prompt
            system_instruction: System instruction (optional)
            
        Returns:
            Generated text
        """
        if not self.gemini_api_key:
            raise ValueError("Gemini API key not configured")
        
        try:
            model = genai.GenerativeModel(
                model_name=model_id,
                system_instruction=system_instruction
            )
            
            response = model.generate_content(prompt)
            return response.text
            
        except Exception as e:
            raise Exception(f"Gemini generation error: {str(e)}")
    
    def generate_with_groq(self, model_id: str, messages: List[Dict[str, str]], temperature: float = 0.7) -> str:
        """
        Generate content using Groq
        
        Args:
            model_id: Groq model ID
            messages: List of message dictionaries with 'role' and 'content'
            temperature: Temperature for generation
            
        Returns:
            Generated text
        """
        if not self.groq_client:
            raise ValueError("Groq API key not configured")
        
        try:
            chat_completion = self.groq_client.chat.completions.create(
                messages=messages,
                model=model_id,
                temperature=temperature,
                max_tokens=4096
            )
            
            return chat_completion.choices[0].message.content
            
        except Exception as e:
            raise Exception(f"Groq generation error: {str(e)}")
    
    def generate(self, model_id: str, prompt: str, system_instruction: Optional[str] = None, 
                temperature: float = 0.7) -> str:
        """
        Universal generate method - auto-detects provider
        
        Args:
            model_id: Model ID (from any provider)
            prompt: User prompt
            system_instruction: System instruction (optional)
            temperature: Temperature for generation
            
        Returns:
            Generated text
        """
        # Detect provider based on model_id
        if 'gemini' in model_id.lower():
            return self.generate_with_gemini(model_id, prompt, system_instruction)
        else:
            # Assume Groq for other models
            messages = []
            if system_instruction:
                messages.append({"role": "system", "content": system_instruction})
            messages.append({"role": "user", "content": prompt})
            
            return self.generate_with_groq(model_id, messages, temperature)


# Global singleton instance
_ai_service_instance = None

def get_ai_service() -> AIService:
    """Get global AI service instance"""
    global _ai_service_instance
    if _ai_service_instance is None:
        _ai_service_instance = AIService()
    return _ai_service_instance
