document.getElementById("analyzeBtn").addEventListener("click", async () => {
  const outputDiv = document.getElementById("output");
  outputDiv.innerHTML = "👀 Extracting Client Stats...";

  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: scrapeUpworkFinal,
  }, async (results) => {

    if (chrome.runtime.lastError || !results || !results[0]) {
      outputDiv.innerHTML = "❌ Error: Please refresh page.";
      return;
    }

    const data = results[0].result;

    if (data.error) {
      outputDiv.innerHTML = `⚠️ ${data.error}`;
      return;
    }

    console.log("🔍 [Debug] Stats Found:", data.clientStats);

    outputDiv.innerHTML = `
      <div style="font-size:12px; background:#f0f0f0; padding:5px; margin-bottom:5px;">
        💰 Spent: <strong>${data.clientStats.spent}</strong> |
        ⏰ Rate: <strong>${data.clientStats.rate}</strong>
      </div>
      🧠 AI Risk Analyzing...
    `;

    try {
      // ✅ 正式上线地址（Render）
      const response = await fetch("https://upwork-backend-iczl.onrender.com/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_description: data.description,
          client_reviews: data.reviews,
          client_stats: data.clientStats
        })
      });

      // ✅ 新增：检查 HTTP 状态
      if (!response.ok) {
        throw new Error("Server error: " + response.status);
      }

      const result = await response.json();

      console.log("🧠 AI RESULT:", result);

      const isRisky = result.risk_score > 50;
      const scoreClass = isRisky ? 'score-high' : 'score-low';

      outputDiv.innerHTML = `
        <div class="result-card">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <span style="font-weight:600;">Risk Score</span>
            <span class="score-badge ${scoreClass}">${result.risk_score}/100</span>
          </div>

          <div style="margin-bottom:10px;">
            <strong style="font-size:12px; color:#374151;">🚩 Analysis:</strong>
            <ul>
              ${(result.risk_reasons || []).map(r => `<li>${r}</li>`).join('')}
            </ul>
          </div>

          <div>
            <strong style="font-size:12px; color:#374151;">💡 Strategy:</strong>
            <textarea rows="6">${result.proposal_draft || ""}</textarea>
          </div>
        </div>
      `;

    } catch (err) {
      console.error("❌ FETCH ERROR:", err);
      outputDiv.innerHTML = "❌ Connection Error or Backend not updated.";
    }
  });
});


// --- 抓取逻辑 ---
function scrapeUpworkFinal() {

  let targetContainer = null;
  const dialogs = document.querySelectorAll('[role="dialog"], [role="complementary"], .air3-slider-container');

  for (let i = dialogs.length - 1; i >= 0; i--) {
    const el = dialogs[i];
    if (el.offsetWidth > 50 && el.offsetHeight > 50) {
      targetContainer = el;
      break;
    }
  }

  if (!targetContainer) {
    targetContainer = document.querySelector('main') || document.body;
  }

  const oldBorders = document.querySelectorAll('.upwork-scraper-border');
  oldBorders.forEach(el => el.style.border = 'none');
  targetContainer.style.border = "4px solid #ff0000";
  targetContainer.classList.add('upwork-scraper-border');

  const fullText = targetContainer.innerText;

  const spentMatch = fullText.match(/Total spent\s*([$€£\d\.kK\+,]+)/i)
                  || fullText.match(/([$€£\d\.kK\+,]+)\s*total spent/i);

  const rateMatch = fullText.match(/Avg hourly rate paid\s*([$€£\d\.]+)/i)
                 || fullText.match(/([$€£\d\.]+)\/hr\s*avg/i);

  const stats = {
    spent: spentMatch ? spentMatch[1] : "Hidden/New Client",
    rate: rateMatch ? rateMatch[1] : "Fixed Price/Hidden"
  };

  let description = "";
  const descEl = targetContainer.querySelector(".job-description")
              || targetContainer.querySelector("[data-test='job-description-text']");
  if (descEl) description = descEl.innerText.trim();
  else description = fullText.substring(0, 1500);

  let reviews = "No reviews found.";
  const reviewEl = targetContainer.querySelector(".client-activity-items")
                || targetContainer.querySelector("[data-test='client-history']");
  if (reviewEl) reviews = reviewEl.innerText.substring(0, 1500);

  return {
    clientStats: stats,
    description: description,
    reviews: reviews
  };
}