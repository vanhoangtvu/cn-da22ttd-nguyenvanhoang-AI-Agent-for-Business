"""
AI Configuration Routes
Allows admin to configure default AI model for users
Also stores user-specific AI provider preferences
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import json
import os

router = APIRouter()

# Config file paths
CONFIG_FILE = "./ai_config.json"
USER_PREFERENCES_FILE = "./user_ai_preferences.json"

# Available models
AVAILABLE_MODELS = [
    {
        "id": "gemini-2.0-flash",
        "name": "Gemini 2.0 Flash",
        "description": "Model mới nhất, nhanh và thông minh",
        "speed": "fast",
        "quality": "high"
    },
    {
        "id": "gemini-2.5-flash",
        "name": "Gemini 2.5 Flash",
        "description": "Model mới nhất với tính năng cao cấp",
        "speed": "fast",
        "quality": "highest"
    },
    {
        "id": "gemini-2.5-pro",
        "name": "Gemini 2.5 Pro",
        "description": "Model Pro mạnh mẽ cho tác vụ phức tạp",
        "speed": "medium",
        "quality": "highest"
    },
    {
        "id": "gemini-2.0-flash-lite",
        "name": "Gemini 2.0 Flash Lite",
        "description": "Phiên bản nhẹ, tốc độ cực nhanh",
        "speed": "fastest",
        "quality": "good"
    }
]

# Default config
DEFAULT_CONFIG = {
    "default_model": "gemini-2.0-flash",
    "allow_user_change": False,
    "max_tokens": 2048,
    "temperature": 0.7
}


def load_config() -> dict:
    """Load config from file or return default"""
    try:
        if os.path.exists(CONFIG_FILE):
            with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
    except Exception as e:
        print(f"Error loading config: {e}")
    return DEFAULT_CONFIG.copy()


def save_config(config: dict) -> bool:
    """Save config to file"""
    try:
        with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        print(f"Error saving config: {e}")
        return False


class AIConfigUpdate(BaseModel):
    default_model: Optional[str] = None
    allow_user_change: Optional[bool] = None
    max_tokens: Optional[int] = None
    temperature: Optional[float] = None


class UserAIPreference(BaseModel):
    user_id: str
    provider: str  # 'gemini' or 'groq'
    model: str  # model name/id


def load_user_preferences() -> dict:
    """Load user preferences from file"""
    try:
        if os.path.exists(USER_PREFERENCES_FILE):
            with open(USER_PREFERENCES_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
    except Exception as e:
        print(f"Error loading user preferences: {e}")
    return {}


def save_user_preferences(preferences: dict) -> bool:
    """Save user preferences to file"""
    try:
        with open(USER_PREFERENCES_FILE, 'w', encoding='utf-8') as f:
            json.dump(preferences, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        print(f"Error saving user preferences: {e}")
        return False


@router.get("/models")
async def get_available_models():
    """Get list of available AI models"""
    return {
        "models": AVAILABLE_MODELS,
        "total": len(AVAILABLE_MODELS)
    }


@router.get("/config")
async def get_ai_config():
    """Get current AI configuration (for admin)"""
    config = load_config()
    return {
        **config,
        "available_models": AVAILABLE_MODELS
    }


@router.get("/user-config")
async def get_user_ai_config():
    """Get AI configuration for users (limited info)"""
    config = load_config()
    return {
        "model": config.get("default_model", "gemini-2.0-flash"),
        "allow_change": config.get("allow_user_change", False)
    }


@router.put("/config")
async def update_ai_config(update: AIConfigUpdate):
    """Update AI configuration (admin only)"""
    config = load_config()
    
    if update.default_model is not None:
        # Validate model
        valid_ids = [m["id"] for m in AVAILABLE_MODELS]
        if update.default_model not in valid_ids:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid model. Available: {', '.join(valid_ids)}"
            )
        config["default_model"] = update.default_model
    
    if update.allow_user_change is not None:
        config["allow_user_change"] = update.allow_user_change
    
    if update.max_tokens is not None:
        if update.max_tokens < 100 or update.max_tokens > 8192:
            raise HTTPException(status_code=400, detail="max_tokens must be between 100 and 8192")
        config["max_tokens"] = update.max_tokens
    
    if update.temperature is not None:
        if update.temperature < 0 or update.temperature > 2:
            raise HTTPException(status_code=400, detail="temperature must be between 0 and 2")
        config["temperature"] = update.temperature
    
    if save_config(config):
        return {
            "success": True,
            "message": "Configuration updated",
            "config": config
        }
    else:
        raise HTTPException(status_code=500, detail="Failed to save configuration")


@router.post("/config/reset")
async def reset_ai_config():
    """Reset AI configuration to default"""
    if save_config(DEFAULT_CONFIG.copy()):
        return {
            "success": True,
            "message": "Configuration reset to default",
            "config": DEFAULT_CONFIG
        }
    else:
        raise HTTPException(status_code=500, detail="Failed to reset configuration")


# User Preference Endpoints
@router.get("/user-preference/{user_id}")
async def get_user_preference(user_id: str):
    """Get user's AI provider preference"""
    preferences = load_user_preferences()
    user_pref = preferences.get(user_id)
    
    if user_pref:
        return {
            "user_id": user_id,
            "provider": user_pref.get("provider", "gemini"),
            "model": user_pref.get("model", "gemini-2.0-flash")
        }
    else:
        # Return default
        return {
            "user_id": user_id,
            "provider": "gemini",
            "model": "gemini-2.0-flash"
        }


@router.post("/user-preference")
async def save_user_preference(pref: UserAIPreference):
    """Save user's AI provider preference"""
    preferences = load_user_preferences()
    
    # Validate provider
    if pref.provider not in ['gemini', 'groq']:
        raise HTTPException(status_code=400, detail="Provider must be 'gemini' or 'groq'")
    
    # Save preference
    preferences[pref.user_id] = {
        "provider": pref.provider,
        "model": pref.model
    }
    
    if save_user_preferences(preferences):
        return {
            "success": True,
            "message": "User preference saved",
            "preference": preferences[pref.user_id]
        }
    else:
        raise HTTPException(status_code=500, detail="Failed to save user preference")


@router.delete("/user-preference/{user_id}")
async def delete_user_preference(user_id: str):
    """Delete user's AI provider preference (revert to default)"""
    preferences = load_user_preferences()
    
    if user_id in preferences:
        del preferences[user_id]
        if save_user_preferences(preferences):
            return {
                "success": True,
                "message": "User preference deleted"
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to delete user preference")
    else:
        return {
            "success": True,
            "message": "User preference does not exist"
        }
