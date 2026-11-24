"""Internal JWT authentication and authorization for ai-service."""

from typing import Any, Dict, Optional
import jwt
from fastapi import Header, HTTPException, status
from app.config import settings


def verify_internal_token(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """Validates the Internal JWT sent by the Spring Boot Gateway.
    
    Expected claims:
        - iss: "lms-gateway"
        - aud: "lms-ai"
        - scope: "lms-ai-internal"
        - role: "ROLE_ADMIN" or "ADMIN"
        - jti: Unique token ID
        - exp: Expiration timestamp (60s TTL)
        
    Raises:
        HTTPException 401 if token is missing, expired, or invalid.
        HTTPException 403 if role is not ADMIN.
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "UNAUTHORIZED", "message": "Missing Authorization header."},
        )

    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "UNAUTHORIZED", "message": "Invalid Authorization header format. Expected 'Bearer <token>'."},
        )

    token = parts[1]

    try:
        payload = jwt.decode(
            token,
            settings.internal_jwt_secret,
            algorithms=["HS256"],
            audience="lms-ai",
            issuer="lms-gateway",
            options={"require": ["exp", "iss", "aud", "scope", "role", "jti"]},
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "TOKEN_EXPIRED", "message": "Internal JWT has expired."},
        )
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_TOKEN", "message": f"Internal JWT validation failed: {e}"},
        )

    # Validate scope
    if payload.get("scope") != "lms-ai-internal":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_SCOPE", "message": "Invalid token scope for internal analytics service."},
        )

    # Validate admin role
    user_role = payload.get("role", "")
    if user_role not in ("ROLE_ADMIN", "ADMIN"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Admin privileges required to access AI analytics."},
        )

    return payload
