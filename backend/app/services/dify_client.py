import httpx
from ..core.config import settings # Dify API Key等を保持

class DifyClient:
    def __init__(self):
        self.api_key = settings.DIFY_API_KEY
        self.base_url = "https://api.dify.ai/v1"

    async def run_analysis(self, survey_id: int, text: str, score: int):
        headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
        # Difyのワークフローまたはチャット入力に合わせてペイロードを調整
        payload = {
            "inputs": {"text": text, "score": score},
            "user": f"survey_user_{survey_id}",
            "response_mode": "blocking"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(f"{self.base_url}/workflows/run", json=payload, headers=headers)
            response.raise_for_status()
            return response.json()