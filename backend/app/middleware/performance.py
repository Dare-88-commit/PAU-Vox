from time import perf_counter
from typing import Awaitable, Callable

from starlette.types import ASGIApp, Message, Receive, Scope, Send


class ResponseTimeMiddleware:
    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        start = perf_counter()

        async def send_wrapper(message: Message):
            if message["type"] == "http.response.start":
                elapsed_ms = (perf_counter() - start) * 1000
                headers = list(message.get("headers", []))
                headers.append((b"x-response-time-ms", f"{elapsed_ms:.2f}".encode("ascii")))
                message["headers"] = headers
            await send(message)

        await self.app(scope, receive, send_wrapper)
