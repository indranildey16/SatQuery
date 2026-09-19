from typing import Optional, Any


class InferenceAdapterError(Exception):
    """Base exception for all inference adapter failures."""

    def __init__(self, code: str, message: str, details: Optional[Any] = None):
        self.code = code
        self.message = message
        self.details = details
        super().__init__(message)


class ColabUnavailableError(InferenceAdapterError):
    """Raised when the Colab endpoint cannot be reached (connection refused, DNS error, tunnel offline)."""

    def __init__(self, message: str = "Google Colab inference endpoint is currently unavailable.", details: Optional[Any] = None):
        super().__init__(code="COLAB_UNAVAILABLE", message=message, details=details)


class ColabTimeoutError(InferenceAdapterError):
    """Raised when the remote Colab model inference takes longer than TIMEOUT_SECONDS."""

    def __init__(self, message: str = "Google Colab inference request timed out.", details: Optional[Any] = None):
        super().__init__(code="COLAB_TIMEOUT", message=message, details=details)


class ColabAuthError(InferenceAdapterError):
    """Raised when authentication to the Colab endpoint fails (HTTP 401/403)."""

    def __init__(self, message: str = "Authentication failed for Google Colab inference worker.", details: Optional[Any] = None):
        super().__init__(code="COLAB_AUTH_FAILED", message=message, details=details)


class ColabInvalidResponseError(InferenceAdapterError):
    """Raised when the Colab server returns non-JSON or response missing required fields."""

    def __init__(self, message: str = "Invalid or malformed response returned from Google Colab inference worker.", details: Optional[Any] = None):
        super().__init__(code="COLAB_INVALID_RESPONSE", message=message, details=details)


class InferenceFailedError(InferenceAdapterError):
    """Raised when remote inference crashes with a 5xx error or internal failure."""

    def __init__(self, message: str = "Model execution failed on remote inference worker.", details: Optional[Any] = None):
        super().__init__(code="INFERENCE_FAILED", message=message, details=details)
