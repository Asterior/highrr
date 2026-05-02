from pydantic import BaseModel, EmailStr, Field


class SendOtpResponse(BaseModel):
    email: EmailStr
    expires_in_seconds: int
    message: str
    otp_code: str | None = None


class VerifyOtpRequest(BaseModel):
    otp: str = Field(..., min_length=4, max_length=12)


class VerifyOtpResponse(BaseModel):
    email: EmailStr
    email_verified: bool
    message: str
