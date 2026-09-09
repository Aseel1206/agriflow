from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://agriflow:agriflow@localhost:5432/agriflow"
    jwt_secret: str = "change-this-secret-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440
    firebase_service_account_path: str = "./firebase-service-account.json"

    class Config:
        env_file = ".env"


settings = Settings()
