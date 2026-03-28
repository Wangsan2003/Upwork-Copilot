import os
import json
import re
from zhipuai import ZhipuAI
from dotenv import load_dotenv
from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

# ✅ 打印确认 API Key 是否加载成功（可删）
print("ZHIPU API KEY:", os.getenv("ZHIPU_API_KEY"))

client = ZhipuAI(api_key=os.getenv("ZHIPU_API_KEY"))

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class JobRequest(BaseModel):
    job_description: str
    client_reviews: str
    client_stats: dict


def get_ai_analysis(jd, reviews, stats):
    """
    核心逻辑：风险审计 + Hook 生成（稳定 JSON 版本）
    """

    # ✅ 强制 AI 只输出 JSON（关键修复）
    system_prompt = """
You are a strict JSON generator.

IMPORTANT:
- Return ONLY valid JSON
- No explanation
- No markdown
- No extra text

ROLE:
You are a Top-Rated Upwork Veteran (10+ years exp). Your job is to protect freelancers from bad clients and help them win jobs.

TASK 1: RISK AUDIT
- If total spent is $0 or Avg Rate < $10/hr → HIGH RISK (Score 70+)
- If "Telegram/WhatsApp" → SCAM (Score 100)
- If "Payment outside Upwork" → SCAM (Score 100)
- If vague job → High Risk

TASK 2: PROPOSAL HOOK
- Write ONLY first 2 sentences
- Mention specific problem from job description
- No generic phrases

OUTPUT FORMAT:
{
  "risk_score": 0,
  "risk_reasons": [],
  "proposal_draft": ""
}
"""

    user_input = f"""
CLIENT FINANCIALS:
Total Spent: {stats.get('spent', 'N/A')}
Avg Rate: {stats.get('rate', 'N/A')}

REVIEWS:
{reviews}

JOB:
{jd[:2000]}
"""

    try:
        response = client.chat.completions.create(
            model="glm-4-flash",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_input}
            ]
        )

        content = response.choices[0].message.content

        # ✅ 打印真实返回（调试用）
        print("----- RAW AI RESPONSE -----")
        print(content)

        # ✅ 核心修复：提取 JSON
        match = re.search(r"\{.*\}", content, re.DOTALL)

        if match:
            return json.loads(match.group())
        else:
            raise ValueError("No valid JSON found")

    except Exception as e:
        print("AI ERROR:", e)

        # ✅ fallback（避免前端崩）
        return {
            "risk_score": 50,
            "risk_reasons": ["Error parsing AI response"],
            "proposal_draft": "System error. Please try again."
        }


@app.post("/analyze")
async def analyze_job(request: JobRequest):
    print("----- New Request -----")
    print(f"Stats: {request.client_stats}")

    result = get_ai_analysis(
        request.job_description,
        request.client_reviews,
        request.client_stats
    )
    return result


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)