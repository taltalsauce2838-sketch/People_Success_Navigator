import httpx
from ..core.config import settings


class DifyClient:
    def __init__(self):
        self.api_key = settings.DIFY_API_KEY
        self.base_url = "https://api.dify.ai/v1"

    async def run_analysis(self, text: str, score: int):

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        payload = {
            "inputs": {
                "memo": text,
                "score": score
            },
            "response_mode": "blocking",
            "user": "pulse-survey-system"
        }
        print("Payload sent to Dify:", payload)
        # タイムアウトを30秒に延長
        timeout = httpx.Timeout(30.0, read=30.0)

        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                f"{self.base_url}/workflows/run",
                json=payload,
                headers=headers
            )
            response.raise_for_status()

            data = response.json()

            return data["data"]["outputs"]