// premium/ai_service.js

const CONFIG = {
    ENABLE_AI_FEATURE: true,
    MODEL_NAME: "SmolLM2-360M-Instruct-q4f16_1-MLC" 
};

let engine = null;

// Helper function to check if the current user is a Premium user
export function isUserPremium() {
    const premiumStatus = localStorage.getItem("isPremiumUser");
    return premiumStatus !== null ? premiumStatus === "true" : true;
}

export function isAIFeatureEnabled() { 
    return CONFIG.ENABLE_AI_FEATURE && isUserPremium(); 
}

export async function checkWebGPUSupport() {
    if (!navigator.gpu) return false;
    try {
        const adapter = await navigator.gpu.requestAdapter();
        return !!adapter;
    } catch (e) {
        return false;
    }
}

export async function initWebLLM(progressCallback) {
    if (!isAIFeatureEnabled()) return null;
    
    if (engine) return engine;
    
    try {
        const webllm = await import("https://esm.run/@mlc-ai/web-llm");
        const appConfig = webllm.prebuiltAppConfig;

        engine = await webllm.CreateMLCEngine(
            CONFIG.MODEL_NAME,
            { 
                appConfig: appConfig,
                initProgressCallback: progressCallback
            }
        );

        return engine;
    } catch (err) {
        console.error("Failed to load WebLLM:", err);
        throw err;
    }
}

// Helper function for Peso currency formatting
function formatPHP(amount) {
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP'
    }).format(amount || 0);
}

// List of scriptures for financial stewardship
const SCRIPTURES = [
    { ref: "2 Corinthians 9:7", text: "Each of you should give what you have decided in your heart to give, not reluctantly or under compulsion, for God loves a cheerful giver." },
    { ref: "Proverbs 3:9-10", text: "Honor the LORD with your wealth, with the firstfruits of all your crops; then your barns will be filled to overflowing." },
    { ref: "Malachi 3:10", text: "Bring the whole tithe into the storehouse... Test me in this and see if I will not throw open the floodgates of heaven." },
    { ref: "Luke 6:38", text: "Give, and it will be given to you. A good measure, pressed down, shaken together and running over, will be poured into your lap." },
    { ref: "Matthew 6:21", text: "For where your treasure is, there your heart will be also." },
    { ref: "Acts 20:35", text: "In everything I did, I showed you that by this kind of hard work we must help the weak, remembering the words the Lord Jesus himself said: 'It is more blessed to give than to receive.'" },
    { ref: "Proverbs 11:24-25", text: "One person gives freely, yet gains even more; another withhold unduly, but comes to poverty. A generous person will prosper; whoever refreshes others will be refreshed." },
    { ref: "1 Chronicles 29:14", text: "But who am I, and who are my people, that we should be able to give as generously as this? Everything comes from you, and we have given you only what comes from your hand." },
    { ref: "Hebrews 13:16", text: "And do not forget to do good and to share with others, for with such sacrifices God is pleased." },
    { ref: "1 Timothy 6:17-18", text: "Command those who are rich in this present world not to be arrogant nor to put their hope in wealth... Command them to do good, to be rich in good deeds, and to be generous and willing to share." },
    { ref: "Deuteronomy 16:17", text: "Each of you must bring a gift in proportion to the way the LORD your God has blessed you." },
    { ref: "Proverbs 22:9", text: "The generous will themselves be blessed, for they share their food with the poor." },
    { ref: "Psalm 112:5", text: "Good will come to those who are generous and lend freely, who conduct their affairs with justice." },
    { ref: "Matthew 6:33", text: "But seek first his kingdom and his righteousness, and all these things will be given to you as well." }
];

// ==========================================
// 1. GENERATE GIVING INSIGHTS (Dashboard AI)
// ==========================================
export async function generateGivingInsights(historyData = []) {
    if (!isAIFeatureEnabled()) {
        return "JoshBot AI features are exclusively available for Premium users.";
    }
    
    if (!historyData || historyData.length === 0) {
        if (Array.isArray(window.cachedHistory) && window.cachedHistory.length > 0) {
            historyData = window.cachedHistory;
        } else {
            try {
                const rawLocal = localStorage.getItem('titheHistory') || localStorage.getItem('kingdom_calc_history');
                historyData = JSON.parse(rawLocal || '[]');
            } catch (e) {
                historyData = [];
            }
        }
    }

    if (!historyData || historyData.length === 0) return "No giving records found.";

    const totalAmount = historyData.reduce((acc, entry) => {
        const entryTotal = entry.grandTotal || (entry.items || []).reduce((a, b) => a + Number(b.amount || 0), 0);
        return acc + Number(entryTotal || 0);
    }, 0);

    const formattedTotal = formatPHP(totalAmount);
    const selectedScripture = SCRIPTURES[Math.floor(Math.random() * SCRIPTURES.length)];

    const fallbackAppreciations = [
        "Thank you for your faithful giving and heart of stewardship!",
        "May God bless your generosity and dedication to His kingdom.",
        "Your continued faithfulness is a true blessing to the church community.",
        "Thank you for honoring the Lord with your gifts and investments!"
    ];

    try {
        if (!engine) {
            await initWebLLM();
        }

        const reply = await engine.chat.completions.create({
            messages: [
                { 
                    role: "system", 
                    content: "You are JoshBot AI, a grateful pastor assistant. Always express joy and thankfulness for church investments." 
                },
                { 
                    role: "user", 
                    content: `Write 1 short sentence thanking a church member for giving ${formattedTotal}. Do not say sorry. Do not repeat words.` 
                }
            ],
            temperature: 0.5,
            max_tokens: 40,
            stop: ["<|im_start|>", "<|im_end|>", "<|endoftext|>", "\n", "."]
        });

        let aiNote = reply.choices[0].message.content.trim();
        aiNote = aiNote.replace(/^(I would say|Here is|Sure|Note|Response|Appreciation):\s*/i, '').replace(/^"|"$/g, '');

        if (!aiNote || aiNote.length < 5 || aiNote.toLowerCase().includes("sorry")) {
            aiNote = fallbackAppreciations[Math.floor(Math.random() * fallbackAppreciations.length)];
        }

        return `
<div style="margin-bottom: 10px;"><b>Summary:</b> Total recorded giving is <b>${formattedTotal}</b> across ${historyData.length} record(s).</div>
<div style="margin-bottom: 10px;"><b>Scripture:</b> <i>"${selectedScripture.text}"</i> — <b>${selectedScripture.ref}</b></div>
<div><b>Appreciation:</b> ${aiNote}</div>
        `.trim();

    } catch (error) {
        const randomFallback = fallbackAppreciations[Math.floor(Math.random() * fallbackAppreciations.length)];
        return `
<div style="margin-bottom: 10px;"><b>Summary:</b> Total recorded giving is <b>${formattedTotal}</b>.</div>
<div style="margin-bottom: 10px;"><b>Scripture:</b> <i>"${selectedScripture.text}"</i> — <b>${selectedScripture.ref}</b></div>
<div><b>Appreciation:</b> ${randomFallback}</div>
        `.trim();
    }
}

// ==========================================
// 2. ASK CUSTOM PROMPT (Chat AI)
// ==========================================
export async function askCustomPrompt(historyData, userPrompt) {
    if (!isAIFeatureEnabled()) {
        return "JoshBot AI features are exclusively available for Premium users.";
    }

    if (typeof historyData === 'string' && !userPrompt) {
        userPrompt = historyData;
        if (Array.isArray(window.cachedHistory) && window.cachedHistory.length > 0) {
            historyData = window.cachedHistory;
        } else {
            try {
                const rawLocal = localStorage.getItem('titheHistory') || localStorage.getItem('kingdom_calc_history');
                historyData = JSON.parse(rawLocal || '[]');
            } catch (e) {
                historyData = [];
            }
        }
    }

    const query = (userPrompt || "").toLowerCase().trim();

    // 1. IDENTITY & GREETING CHECK
    if (query.includes("who are you") || query.includes("your name") || query.includes("what is your name") || query.includes("who is joshbot")) {
        return "Hello! I am JoshBot AI, your friendly Christian financial assistant for KingdomCalc. I am here to assist you with giving insights, scriptural guidance, and app navigation!";
    }

    // 2. FAST LOCAL ROUTER FOR NAVIGATION
    if (query.includes("reminder") || query.includes("reminders")) {
        return "To set up giving schedules or notifications, click the 'Reminders' tab (bell icon) in the bottom navigation bar.";
    }
    if (query.includes("setting") || query.includes("settings")) {
        return "To change the default tithe percentage or date selection format, go to the Settings tab in the bottom navigation.";
    }
    if (query.includes("history") || query.includes("export") || query.includes("record")) {
        return "To view, edit, search, or export your past giving records (CSV, Excel, PDF), click the 'History' tab in the bottom navigation bar.";
    }
    if (query.includes("calc") || query.includes("calculate") || query.includes("compute")) {
        return "To compute Tithes, Investments, Love Gifts, or Expenses, click the 'Calculate' tab in the bottom navigation bar.";
    }
    if (query.includes("dashboard") || query.includes("chart") || query.includes("summary")) {
        return "To view your overall giving stats, chart overview, and AI insights, click the 'Dashboard' tab on the far left of the bottom navigation bar.";
    }

    // 3. DYNAMIC CATEGORY, MONTH & YEAR DATA FILTER (Tithes, Investments, Expenses)
    const categories = ["tithe", "tithes", "investment", "investments", "offering", "offerings", "expense", "expenses", "giving", "record", "summary"];
    const months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

    const hasCategoryQuery = categories.some(cat => query.includes(cat));

    if (hasCategoryQuery) {
        let targetMonth = months.find(m => query.includes(m));

        const yearMatch = query.match(/\b(20\d{2})\b/);
        let targetYear = yearMatch ? yearMatch[1] : null;

        const availableYears = [...new Set((historyData || []).map(entry => {
            const dateStr = entry.dateLabel || entry.date || "";
            const match = dateStr.match(/\b(20\d{2})\b/);
            return match ? match[1] : null;
        }).filter(Boolean))];

        const currentYear = new Date().getFullYear().toString();

        if (targetMonth && !targetYear) {
            if (availableYears.length > 1) {
                const monthCap = targetMonth.charAt(0).toUpperCase() + targetMonth.slice(1);
                return `Which year for ${monthCap} are you referring to? (e.g., ${availableYears.join(' or ')})`;
            } else if (availableYears.length === 1) {
                targetYear = availableYears[0];
            } else {
                targetYear = currentYear;
            }
        }

        if (!targetMonth) {
            targetMonth = new Date().toLocaleString('en-US', { month: 'long' }).toLowerCase();
        }
        if (!targetYear) {
            targetYear = availableYears.length > 0 ? availableYears[0] : currentYear;
        }

        let targetCategory = "";
        if (query.includes("tithe")) targetCategory = "tithe";
        else if (query.includes("investment") || query.includes("offering")) targetCategory = "investment";
        else if (query.includes("expense")) targetCategory = "expense";

        const filteredItems = [];
        let categoryTotal = 0;

        (historyData || []).forEach(entry => {
            const entryDate = (entry.dateLabel || entry.date || "").toLowerCase();

            if (entryDate.includes(targetMonth) && entryDate.includes(targetYear)) {
                (entry.items || []).forEach(item => {
                    const itemType = (item.type || item.category || "").toLowerCase();
                    const itemName = (item.name || item.title || itemType || "").toLowerCase();

                    const matchesCategory = !targetCategory || (targetCategory === "investment"
                        ? itemType.includes("investment") || itemType.includes("offering") || itemName.includes("investment") || itemName.includes("offering")
                        : itemType.includes(targetCategory) || itemName.includes(targetCategory));

                    if (matchesCategory) {
                        const amt = Number(item.amount || 0);
                        categoryTotal += amt;
                        let label = item.name || item.title || (targetCategory === "investment" ? "Investment" : itemType.charAt(0).toUpperCase() + itemType.slice(1));
                        if (/^offerings?$/i.test(label)) label = "Investment";
                        filteredItems.push(`${label}: ${formatPHP(amt)}`);
                    }
                });
            }
        });

        const monthCap = targetMonth.charAt(0).toUpperCase() + targetMonth.slice(1);
        const catLabel = targetCategory ? (targetCategory.charAt(0).toUpperCase() + targetCategory.slice(1) + "s") : "Records";

        if (filteredItems.length > 0) {
            return `Here is a summary of your ${catLabel} for ${monthCap} ${targetYear}:\n- ` + 
                   filteredItems.join("\n- ") + 
                   `\n\nTotal: ${formatPHP(categoryTotal)}`;
        } else {
            return `No recorded ${catLabel.toLowerCase()} found for ${monthCap} ${targetYear}.`;
        }
    }

    // 4. GENERAL AI PROMPT HANDLING
    const totalRecords = (historyData || []).length;
    const grandTotalGiving = (historyData || []).reduce((acc, entry) => {
        const entryTotal = entry.grandTotal || (entry.items || []).reduce((a, b) => a + Number(b.amount || 0), 0);
        return acc + Number(entryTotal || 0);
    }, 0);

    const summarizedData = {
        totalRecords: totalRecords,
        totalAmountGiven: formatPHP(grandTotalGiving)
    };

    const systemPrompt = `You are JoshBot AI, a helpful Christian financial AI assistant for KingdomCalc. Refer to the category as Investments.
Always introduce yourself as JoshBot AI if asked.
Answer clearly, warmly, and politely in 1 to 2 English sentences. Always use ₱ for currency values.

User giving context: ${JSON.stringify(summarizedData)}`;

    try {
        if (!engine) {
            await initWebLLM();
        }

        const reply = await engine.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            temperature: 0.3,
            max_tokens: 100,
            stop: ["<|im_start|>", "<|im_end|>", "<|endoftext|>"]
        });

        return reply.choices[0].message.content.trim();
    } catch (error) {
        console.error("Custom Prompt Error:", error);
        return "Sorry, I could not process your request right now. Please try again.";
    }
}

export const askAIFinancialWisdom = askCustomPrompt;