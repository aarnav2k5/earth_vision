from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = Field(default="Garuda Lens API", alias="APP_NAME")
    app_env: str = Field(default="development", alias="APP_ENV")
    app_host: str = Field(default="0.0.0.0", alias="APP_HOST")
    app_port: int = Field(default=8000, alias="APP_PORT")
    allowed_origins_raw: str = Field(default="http://localhost:3000", alias="ALLOWED_ORIGINS")
    allowed_origin_regex_raw: str = Field(default="", alias="ALLOWED_ORIGIN_REGEX")
    planetary_computer_stac_url: str = Field(
        default="https://planetarycomputer.microsoft.com/api/stac/v1",
        alias="PLANETARY_COMPUTER_STAC_URL",
    )
    sentinel_collection: str = Field(default="sentinel-2-l2a", alias="SENTINEL_COLLECTION")
    groq_api_key: str = Field(default="", alias="GROQ_API_KEY")
    groq_model: str = Field(default="openai/gpt-oss-20b", alias="GROQ_MODEL")

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @staticmethod
    def _normalize_origin(origin: str) -> str:
        normalized = origin.strip().strip("\"'")
        if normalized in {"*", ""}:
            return normalized
        return normalized.rstrip("/")

    @property
    def allowed_origins(self) -> list[str]:
        seen: set[str] = set()
        origins: list[str] = []
        for item in self.allowed_origins_raw.split(","):
            origin = self._normalize_origin(item)
            if not origin or origin in seen:
                continue
            seen.add(origin)
            origins.append(origin)
        return origins

    @property
    def allowed_origin_regex(self) -> str | None:
        regex = self.allowed_origin_regex_raw.strip()
        return regex or None

    @property
    def allow_credentials(self) -> bool:
        # Wildcard origins cannot be used with credentialed CORS requests.
        return "*" not in self.allowed_origins


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
