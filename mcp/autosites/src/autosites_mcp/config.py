from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    backend_url: str
    backend_token: str | None
    supabase_url: str | None
    supabase_service_role_key: str | None

    @classmethod
    def from_env(cls) -> Settings:
        return cls(
            backend_url=os.environ.get("AUTOSITES_BACKEND_URL", "http://localhost:8888").rstrip("/"),
            backend_token=os.environ.get("AUTOSITES_BACKEND_TOKEN") or None,
            supabase_url=(
                os.environ.get("SUPABASE_URL")
                or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
                or None
            ),
            supabase_service_role_key=os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or None,
        )

    @property
    def cms_configured(self) -> bool:
        return bool(self.supabase_url and self.supabase_service_role_key)


settings = Settings.from_env()
