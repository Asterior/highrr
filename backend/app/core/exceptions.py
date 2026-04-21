"""Custom exception types used across core services."""


class OllamaUnavailableError(Exception):
    """Raised when the Ollama server cannot be reached."""


class OllamaTimeoutError(Exception):
    """Raised when an Ollama request exceeds the configured timeout."""


class OllamaResponseError(Exception):
    """Raised when Ollama returns an unexpected or malformed response."""
