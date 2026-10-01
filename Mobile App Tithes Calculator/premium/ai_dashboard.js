import { generateGivingInsights, askAIFinancialWisdom } from './ai_service.js';

document.addEventListener('DOMContentLoaded', () => {
    // DOM Element References
    const aiOutput = document.getElementById('aiOutput');
    const aiPromptInput = document.getElementById('aiPromptInput');
    const btnSendPrompt = document.getElementById('btnSendPrompt');
    const btnAutoInsights = document.getElementById('btnAutoInsights');
    const btnResetAI = document.getElementById('btnResetAI');

    // Default Placeholder Message
    const DEFAULT_MESSAGE = 'Click <b>Auto Generate Insights</b> for summary or type a prompt below to ask JoshBot AI.';

    /**
     * Helper: Helper function para i-render ang loading indicator sa output box
     */
    function showLoading(message = 'Analyzing financial records...') {
        if (!aiOutput) return;
        aiOutput.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; color: #0f766e; font-weight: 500;">
                <i class="fa-solid fa-spinner fa-spin" style="font-size: 1.1rem;"></i>
                <span>${message}</span>
            </div>
        `;
    }

    /**
     * Helper: Helper function para i-render ang text output nang malinis
     */
    function renderOutput(text) {
        if (!aiOutput) return;
        // Palitan ang newlines (\n) ng HTML line breaks (<br>)
        const formattedText = text.replace(/\n/g, '<br>');
        aiOutput.innerHTML = formattedText;
    }

    /**
     * 1. Auto Generate Insights Handler
     */
    if (btnAutoInsights) {
        btnAutoInsights.addEventListener('click', async (e) => {
            e.preventDefault();
            
            showLoading('Generating insights from your records...');
            
            try {
                const insights = await generateGivingInsights();
                if (insights) {
                    renderOutput(insights);
                } else {
                    renderOutput('No transaction data found to generate insights.');
                }
            } catch (error) {
                console.error('Error generating AI insights:', error);
                renderOutput('Unable to generate insights right now. Please try again later.');
            }
        });
    }

    /**
     * 2. Send Custom Prompt Handler
     */
    async function handleSendPrompt() {
        if (!aiPromptInput) return;
        
        const promptText = aiPromptInput.value.trim();
        if (!promptText) return;

        showLoading('Thinking...');
        aiPromptInput.value = ''; // I-clear ang input field

        try {
            const response = await askAIFinancialWisdom(promptText);
            if (response) {
                renderOutput(response);
            } else {
                renderOutput('Sorry, I couldn\'t process that question right now.');
            }
        } catch (error) {
            console.error('Error asking AI:', error);
            renderOutput('Error communicating with AI. Please check your connection.');
        }
    }

    // Event Listener para sa Send Button
    if (btnSendPrompt) {
        btnSendPrompt.addEventListener('click', (e) => {
            e.preventDefault();
            handleSendPrompt();
        });
    }

    // Event Listener para sa "Enter" key sa input field
    if (aiPromptInput) {
        aiPromptInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleSendPrompt();
            }
        });
    }

    /**
     * 3. Reset AI View Handler
     */
    if (btnResetAI) {
        btnResetAI.addEventListener('click', (e) => {
            e.preventDefault();
            if (aiOutput) {
                aiOutput.innerHTML = DEFAULT_MESSAGE;
            }
            if (aiPromptInput) {
                aiPromptInput.value = '';
            }
        });
    }
});