import httpx
from ..core.config import settings
import json

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
        
class DifyClient2:
    def __init__(self):
        self.api_key = settings.DIFY_API_KEY2
        self.base_url = "https://api.dify.ai/v1"

    async def run_risk_assessment(self, ai_input: dict):

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        payload = {
        "inputs": {
            "scores": json.dumps(ai_input["scores"]),
            "memos": json.dumps(ai_input["memos"], ensure_ascii=False),
            "sentiments": json.dumps(ai_input["sentiments"]),
        },
            "response_mode": "blocking",
            "user": "pulse-survey-system"
        }
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