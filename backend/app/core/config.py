from typing import Optional
from pydantic_settings import BaseSettings
from decouple import config


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = config("DATABASE_URL", default="sqlite:///./autograder.db")
    
    # OpenAI
    OPENAI_API_KEY: str = config("OPENAI_API_KEY", default="")
    
    # Redis
    REDIS_URL: str = config("REDIS_URL", default="redis://localhost:6379/0")
    
    # JWT
    SECRET_KEY: str = config("SECRET_KEY", default="your-secret-key-here")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # File storage
    UPLOAD_DIR: str = config("UPLOAD_DIR", default="./uploads")
    
    # Environment
    DEBUG: bool = config("DEBUG", default=True, cast=bool)
    
    class Config:
        env_file = ".env"


settings = Settings()
