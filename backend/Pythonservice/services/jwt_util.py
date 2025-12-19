"""
JWT Utility for Python Service
Shared JWT validation with Spring Service
"""

import jwt
from typing import Optional, Dict, Any
from datetime import datetime, timedelta

class JwtUtil:
    """
    JWT utility matching Spring Service implementation
    """

    SECRET_KEY = "MySecretKeyForJWTTokenGenerationAndValidation123456789"
    ALGORITHM = "HS256"
    EXPIRATION_TIME = 86400  # 24 hours in seconds

    @classmethod
    def validate_token(cls, token: str) -> bool:
        """
        Validate JWT token

        Args:
            token: JWT token string

        Returns:
            True if valid, False otherwise
        """
        try:
            # Decode without verification first to check expiration
            payload = jwt.decode(token, cls.SECRET_KEY, algorithms=[cls.ALGORITHM], options={"verify_exp": False})

            # Check if token is expired
            exp = payload.get('exp')
            if exp and datetime.utcnow().timestamp() > exp:
                return False

            # Decode with full verification
            jwt.decode(token, cls.SECRET_KEY, algorithms=[cls.ALGORITHM])
            return True

        except jwt.InvalidTokenError:
            return False
        except Exception:
            return False

    @classmethod
    def extract_claims(cls, token: str) -> Optional[Dict[str, Any]]:
        """
        Extract claims from JWT token

        Args:
            token: JWT token string

        Returns:
            Claims dict or None if invalid
        """
        try:
            payload = jwt.decode(token, cls.SECRET_KEY, algorithms=[cls.ALGORITHM])
            return payload
        except jwt.InvalidTokenError:
            return None
        except Exception:
            return None

    @classmethod
    def extract_user_id(cls, token: str) -> Optional[int]:
        """
        Extract user ID from JWT token

        Args:
            token: JWT token string

        Returns:
            User ID or None if invalid
        """
        claims = cls.extract_claims(token)
        if claims:
            return claims.get('userId')
        return None

    @classmethod
    def extract_username(cls, token: str) -> Optional[str]:
        """
        Extract username from JWT token

        Args:
            token: JWT token string

        Returns:
            Username or None if invalid
        """
        claims = cls.extract_claims(token)
        if claims:
            return claims.get('sub')  # 'sub' is the subject (username)
        return None

    @classmethod
    def extract_role(cls, token: str) -> Optional[str]:
        """
        Extract role from JWT token

        Args:
            token: JWT token string

        Returns:
            Role or None if invalid
        """
        claims = cls.extract_claims(token)
        if claims:
            return claims.get('role')
        return None

    @classmethod
    def generate_token(cls, user_id: int, username: str, role: str) -> str:
        """
        Generate JWT token (for testing purposes)

        Args:
            user_id: User ID
            username: Username
            role: User role

        Returns:
            JWT token string
        """
        payload = {
            'sub': username,
            'userId': user_id,
            'role': role,
            'iat': datetime.utcnow(),
            'exp': datetime.utcnow() + timedelta(seconds=cls.EXPIRATION_TIME)
        }

        return jwt.encode(payload, cls.SECRET_KEY, algorithm=cls.ALGORITHM)