import os
import sys
import json
from zhipuai import ZhipuAI
from dotenv import load_dotenv
from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

# 1. Load Environment Variables
load_dotenv()

api_key = os.getenv("ZHIPU_API_KEY")

# Check if API Key exists to prevent crash
if not api_key:
    print("❌ Error: ZHIPU_API_KEY not found.")
    print("Please create a .env file in the backend directory with your key.")
    sys.exit(1)

client = ZhipuAI(api_key=api_key)

# 2. Initialize FastAPI App
app = FastAPI()

# Enable CORS for Chrome Extension access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define request data model
class JobRequest(BaseModel):
    job_description: str
    client_reviews: str
    client_stats: dict 

def get_ai_analysis(jd, reviews, stats):
    """
    Core Logic: Sends data to AI for Risk Audit and Strategy generation.
    """
    
    # Updated Prompt: Persona - Risk Auditor
    system_prompt = """
    ROLE: You are a Top-Rated Upwork Veteran. Your goal is to protect freelancers from bad clients and scams.

    TASK 1: RISK AUDIT (Be suspicious)
    - Check "Client Financials": If total spent is $0 or Avg Rate < $10/hr (for tech jobs), flag as HIGH RISK.
    - Check "Reviews": Look for keywords: "unresponsive", "waste of time", "rude".
    - Check "Description": 
        - "Telegram/WhatsApp/Skype" = SCAM (Risk 100).
        - "Payment outside Upwork" = SCAM (Risk 100).
        - "Re-type PDF" / "Simple typing" = SCAM (Risk 100).

    TASK 2: WINNING STRATEGY
    - Do NOT write a generic cover letter.
    - Write a "Hook" (First 2 sentences). Mention a specific problem from the JD to prove you read it.
    
    OUTPUT FORMAT (Strict JSON):
    {
        "risk_score": (Integer 0-100),
        "risk_reasons": ["Reason 1", "Reason 2", "Reason 3"],
        "proposal_draft": "Your strategic hook here..."
    }
    """
    
    # Prepare User Input Context
    user_input = f"""
    === CLIENT FINANCIALS ===
    Total Spent: {stats.get('spent', 'N/A')}
    Avg Hourly Rate: {stats.get('rate', 'N/A')}
    
    === CLIENT REVIEWS ===
    {reviews}
    
    === JOB DESCRIPTION ===
    {jd[:2000]} 
    """

    try:
        # Call AI Model (using glm-4-flash for speed/cost)
        response = client.chat.completions.create(
            model="glm-4-flash",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_input}
            ]
        )
        content = response.choices[0].message.content
        # Clean markdown formatting if present
        content = content.replace("```json", "").replace("```", "").strip()
        return json.loads(content)
    except Exception as e:
        print(f"AI Error: {e}")
        return {
            "risk_score": 0, 
            "risk_reasons": ["AI Processing Error"], 
            "proposal_draft": "Could not generate draft due to server error."
        }

@app.post("/analyze")
async def analyze_job(request: JobRequest):
    print(f"----- Incoming Request -----")
    print(f"Stats: {request.client_stats}")
    
    result = get_ai_analysis(
        request.job_description, 
        request.client_reviews,
        request.client_stats
    )
    return result

if __name__ == "__main__":
    import uvicorn
    print("🚀 Server starting on http://127.0.0.1:8000")
    # Running on localhost for local testing
    uvicorn.run(app, host="127.0.0.1", port=8000)