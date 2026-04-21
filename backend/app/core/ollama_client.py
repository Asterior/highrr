"""Ollama HTTP client.
Single module responsible for all communication with the Ollama server.
All AI features in this project use this client exclusively.
"""

import json
import logging
import os
import time
import urllib.error
import urllib.request

from app.core.exceptions import OllamaResponseError, OllamaTimeoutError, OllamaUnavailableError

LOGGER = logging.getLogger(__name__)


class OllamaClient:
    """Client wrapper for Ollama generate/chat HTTP endpoints."""

    def __init__(self) -> None:
        """Reads OLLAMA_BASE_URL and QWEN_MODEL from environment and validates them."""
        self.base_url = (os.getenv("OLLAMA_BASE_URL") or "").strip()
        self.model = (os.getenv("QWEN_MODEL") or "").strip()
        if not self.base_url or not self.model:
            raise RuntimeError("OLLAMA_BASE_URL and QWEN_MODEL must be configured")
        self.timeout = max(5, int(os.getenv("OLLAMA_TIMEOUT_SECONDS", "75")))
        self.num_ctx = max(0, int(os.getenv("OLLAMA_NUM_CTX", "8192")))

    def _options(self) -> dict:
        options = {"temperature": 0.2}
        if self.num_ctx > 0:
            options["num_ctx"] = self.num_ctx
        return options

    def _request(self, endpoint: str, payload: dict) -> dict:
        """Sends an HTTP POST request to Ollama and returns JSON response."""
        url = f"{self.base_url}{endpoint}"
        started = time.perf_counter()
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as response:
                elapsed_ms = (time.perf_counter() - started) * 1000
                parsed = json.loads(response.read().decode("utf-8"))
                LOGGER.debug("Ollama request endpoint=%s prompt_len=%s elapsed_ms=%.2f", endpoint, len(str(payload)), elapsed_ms)
                return parsed
        except TimeoutError as exc:
            raise OllamaTimeoutError("Ollama request timed out") from exc
        except urllib.error.URLError as exc:
            raise OllamaUnavailableError("Ollama server is unreachable") from exc
        except json.JSONDecodeError as exc:
            raise OllamaResponseError("Malformed response from Ollama") from exc

    def generate(self, prompt: str, system: str = "") -> str:
        """Sends a generate request and returns plain response text."""
        payload = {
            "model": self.model,
            "prompt": prompt,
            "system": system,
            "stream": False,
            "options": self._options(),
        }
        response = self._request("/api/generate", payload)
        text = response.get("response")
        if not isinstance(text, str):
            raise OllamaResponseError("Missing or invalid generate response text")
        return text.strip()

    def chat(self, messages: list[dict]) -> str:
        """Sends a chat request and returns assistant response text."""
        payload = {
            "model": self.model,
            "messages": messages,
            "stream": False,
            "options": self._options(),
        }
        response = self._request("/api/chat", payload)
        message = response.get("message") or {}
        text = message.get("content") if isinstance(message, dict) else None
        if not isinstance(text, str):
            raise OllamaResponseError("Missing or invalid chat response content")
        return text.strip()

    def health_check(self) -> bool:
        """Pings the Ollama root endpoint and returns availability status."""
        try:
            req = urllib.request.Request(self.base_url, method="GET")
            with urllib.request.urlopen(req, timeout=5):
                return True
        except (urllib.error.URLError, TimeoutError):
            return False
