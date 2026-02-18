import logging
import random
import smtplib
import string
from email.message import EmailMessage

from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailDeliveryError(Exception):
    pass


def generate_verification_code() -> str:
    return "".join(random.choices(string.digits, k=6))


def _deliver_email(recipient: str, subject: str, body: str) -> None:
    if not settings.smtp_host or not settings.smtp_from_email:
        raise EmailDeliveryError("SMTP is not configured. Set SMTP_HOST and SMTP_FROM_EMAIL.")

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = settings.smtp_from_email
    message["To"] = recipient
    message.set_content(body)

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=20) as server:
            if settings.smtp_use_tls:
                server.starttls()
            if settings.smtp_username and settings.smtp_password:
                server.login(settings.smtp_username, settings.smtp_password)
            server.send_message(message)
    except Exception as exc:
        logger.exception("Failed to send email to %s", recipient)
        raise EmailDeliveryError("Failed to send email") from exc


def send_verification_email(recipient: str, code: str) -> None:
    _deliver_email(
        recipient,
        "PAU Vox Email Verification Code",
        "Your PAU Vox verification code is: "
        f"{code}\n\nThis code expires in {settings.email_verification_code_ttl_minutes} minutes.",
    )


def send_plain_email(recipient: str, subject: str, body: str) -> None:
    _deliver_email(recipient, subject, body)
