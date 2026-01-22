// CONFIGURATION
// Change this URL if you deploy the backend to Cloud (Render/Railway)
const API_URL = "http://127.0.0.1:8000/analyze";

document.getElementById("analyzeBtn").addEventListener("click", async () => {
  const btn = document.getElementById("analyzeBtn");
  const loader = document.getElementById("loader");
  const status = document.getElementById("status");
  const outputDiv = document.getElementById("output");

  // 1. UI Loading State
  btn.disabled = true;
  btn.innerText = "Analyzing...";
  loader.style.display = "block";
  outputDiv.innerHTML = "";
  status.innerText = "🔍 Scanning page data...";

  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // 2. Inject Script to Scrape Data
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: scrapeUpworkRobust, // Use robust scraper function
  }, async (results) => {
    
    // Handle Injection Errors
    if (chrome.runtime.lastError || !results || !results[0]) {
      resetUI("❌ Error: Please refresh the page.");
      return;
    }

    const data = results[0].result;
    
    // Handle Scraping Errors
    if (data.error) {
      resetUI(`⚠️ ${data.error}`);
      return;
    }

    console.log("[Debug] Scraped Data:", data);
    status.innerText = "🧠 Sending to AI Model...";

    try {
      // 3. Send Data to Backend
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_description: data.description,
          client_reviews: data.reviews,
          client_stats: data.clientStats
        })
      });

      if (!response.ok) throw new Error("Backend connection failed");

      const result = await response.json();

      // 4. Render Results
      renderResult(result);
      
      // Reset UI
      btn.disabled = false;
      btn.innerText = "Analyze Again";
      loader.style.display = "none";
      status.innerText = "✅ Analysis Complete";

    } catch (err) {
      console.error(err);
      resetUI("❌ Connection Error. Is Backend running?");
    }
  });

  // Helper: Reset UI on error
  function resetUI(msg) {
    btn.disabled = false;
    btn.innerText = "Retry Analysis";
    loader.style.display = "none";
    status.innerHTML = msg;
  }

  // Helper: Render the Result Card
  function renderResult(result) {
    const isHighRisk = result.risk_score > 50;
    const color = isHighRisk ? '#dc2626' : '#16a34a'; // Red or Green
    
    outputDiv.innerHTML = `
      <div class="result-card">
        <div class="score-box">
          <span>Risk Score</span>
          <span class="score-val" style="color: ${color};">${result.risk_score}/100</span>
        </div>
        
        <div style="margin-bottom:12px;">
          <strong style="font-size:12px; color:#555;">🚩 Risk Factors:</strong>
          <ul style="padding-left:18px; margin:5px 0;">
            ${result.risk_reasons.map(r => `<li>${r}</li>`).join('')}
          </ul>
        </div>

        <div>
          <strong style="font-size:12px; color:#555;">💡 Strategy Draft:</strong>
          <textarea rows="6">${result.proposal_draft}</textarea>
        </div>
      </div>
    `;
  }
});

/**
 * Robust Scraper Function (V1.4 Logic)
 * Detects side-panel dialogs and extracts financial data via Regex.
 */
function scrapeUpworkRobust() {
  
  // 1. Identify the Target Container (Side Panel vs Full Page)
  let targetContainer = null;
  
  // Upwork Side Panels usually have role="dialog" or "complementary"
  const dialogs = document.querySelectorAll('[role="dialog"], [role="complementary"], .air3-slider-container');
  
  // Find the last visible dialog (top-most layer)
  for (let i = dialogs.length - 1; i >= 0; i--) {
    const el = dialogs[i];
    if (el.offsetWidth > 50 && el.offsetHeight > 50) {
      targetContainer = el;
      break; 
    }
  }

  // Fallback to main body if no slider found
  if (!targetContainer) {
    targetContainer = document.querySelector('main') || document.body;
  }

  // Visual Feedback: Red Border
  const oldBorders = document.querySelectorAll('.upwork-scraper-border');
  oldBorders.forEach(el => el.style.border = 'none');
  targetContainer.style.border = "4px solid #ff0000";
  targetContainer.classList.add('upwork-scraper-border');

  // 2. Extract Data
  const fullText = targetContainer.innerText;

  // A. Regex for Financials (Supports English & Chinese formats)
  // Matches "$50k total spent" or "Total spent $50k" or "已花费..."
  const spentMatch = fullText.match(/(Total spent|已花费)\s*([$€£¥\d\.kK\+,]+)/i) 
                  || fullText.match(/([$€£¥\d\.kK\+,]+)\s*(total spent|已花费)/i);

  // Matches budget like "$200" or "200.00美元"
  const budgetMatch = fullText.match(/([\d\.,]+)\s*美元/) 
                   || fullText.match(/\$\s*([\d\.,]+)/);

  // Matches Hourly Rate
  const rateMatch = fullText.match(/(Avg hourly rate|平均时薪).*?([$€£¥\d\.]+)/i)
                 || fullText.match(/([$€£¥\d\.]+)\/hr/i);

  const stats = {
    spent: spentMatch ? spentMatch[2] : (budgetMatch ? "$" + budgetMatch[1] : "Hidden/New"),
    rate: rateMatch ? rateMatch[2] : "Fixed/Hidden"
  };

  // B. Job Description
  let description = "";
  const descEl = targetContainer.querySelector(".job-description") 
              || targetContainer.querySelector("[data-test='job-description-text']");
  
  if (descEl) description = descEl.innerText.trim();
  else description = fullText.substring(0, 1500); // Fallback

  // C. Client Reviews
  let reviews = "No reviews found.";
  const reviewEl = targetContainer.querySelector(".client-activity-items") 
                || targetContainer.querySelector("[data-test='client-history']");
  
  if (reviewEl) reviews = reviewEl.innerText.substring(0, 1500);

  return {
    clientStats: stats,
    description: description,
    reviews: reviews,
    error: null
  };
}