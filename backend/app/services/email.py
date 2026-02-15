import logging
import random
import string

logger = logging.getLogger(__name__)


def generate_verification_code() -> str:
    return "".join(random.choices(string.digits, k=6))


def send_verification_email(recipient: str, code: str) -> None:
    # Replace this logging with SMTP/SendGrid integration in production.
    logger.info("Verification code for %s is %s", recipient, code)
