"""
AI Configuration Routes
Allows admin to configure default AI model for users
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import json
import os

router = APIRouter()

# Config file path
CONFIG_FILE = "./ai_config.json"

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
