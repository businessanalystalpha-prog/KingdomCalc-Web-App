// Dynamic SCRIPT_URL: Kukunin muna sa localStorage kung may na-save sa Admin page
//const DEFAULT_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyI0U3ab1YeGAdhk_GoiL6weKCauUXfa4xMK_D63tUr9yIaGLTtpe7In4GEbxkASUAb5g/exec";
const DEFAULT_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz6pzX_grxj9apqasO6DkAdnaQ-1kDDzrXWjV5wuBQc77aR-WWDxccm2Ft-OL-pyMd0/exec";
const SCRIPT_URL = localStorage.getItem("customScriptUrl") || DEFAULT_SCRIPT_URL;

window.cachedHistory = [];
window.currentFilteredHistory = [];
let editingRecordId = null;
let flatpickrInstance = null;
let currentPendingItems = [];

// Helper function para sa NUMERO LANG (walang ₱ symbol)
function formatNumberOnly(amount) {
    return Number(amount || 0).toLocaleString("en-US", { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    });
}

// Retain formatCurrency para sa ibang bahagi ng app (halimbawa: list ng pending items)
function formatCurrency(amount) {
    return "₱ " + formatNumberOnly(amount);
}

function parseRawNumber(value) {
    return parseFloat(String(value || "").replace(/[^0-9.]/g, "")) || 0;
}

function getBadgeClass(type) {
    const clean = String(type || "").toLowerCase();
    if (clean.includes("expense") || clean.includes("gastos") || clean.includes("budget")) return "lovegift";
    if (clean.includes("investment") || clean.includes("offering")) return "investment";
    return "tithes";
}

function formatGivingType(type) {
    const clean = String(type || "").toLowerCase();
    if (clean.includes("investment") || clean.includes("offering")) {
        return clean === "investments" || clean === "offerings" ? "Investments" : "Investment";
    }
    return type || "Item";
}

function getSavedTithePercent() {
    const saved = localStorage.getItem("tithePercentConfig");
    return saved !== null ? parseFloat(saved) : 10;
}

function getSavedDateMode() {
    return localStorage.getItem("titheDateMode") || "range";
}

function getLocalHistoryCache() {
    try { return JSON.parse(localStorage.getItem("titheHistoryCache") || "[]"); }
    catch { return []; }
}

function setLocalHistoryCache(history) {
    localStorage.setItem("titheHistoryCache", JSON.stringify(history));
}

// Iwas Cache sa Browser: Dagdagan ng Timestamp Parameter ang GET Request
async function fetchHistoryFromSheet() {
    const cacheBusterUrl = SCRIPT_URL + (SCRIPT_URL.includes("?") ? "&" : "?") + "_t=" + new Date().getTime();
    const response = await fetch(cacheBusterUrl, { cache: "no-store" });
    if (!response.ok) throw new Error("Network response was not ok");
    const data = await response.json();
    return Array.isArray(data) ? data : [];
}

async function postToSheet(payload) {
    const response = await fetch(SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error("Network response was not ok");
    return response.json();
}

window.formatCurrency = formatCurrency;
window.formatNumberOnly = formatNumberOnly;
window.parseRawNumber = parseRawNumber;
window.getBadgeClass = getBadgeClass;
window.formatGivingType = formatGivingType;
window.getLocalHistoryCache = getLocalHistoryCache;
window.setLocalHistoryCache = setLocalHistoryCache;
window.fetchHistoryFromSheet = fetchHistoryFromSheet;
window.postToSheet = postToSheet;
window.getSavedTithePercent = getSavedTithePercent;
window.getSavedDateMode = getSavedDateMode;

function restrictToNumbersOnly(element) {
    if (!element) return;
    element.addEventListener("input", (event) => {
        const hasPeso = event.target.value.includes("₱");
        let cleanValue = event.target.value.replace(/[^0-9.]/g, "");
        const parts = cleanValue.split(".");
        if (parts.length > 2) cleanValue = parts[0] + "." + parts.slice(1).join("");
        event.target.value = cleanValue ? (hasPeso ? "₱ " : "") + cleanValue : "";
    });
}

window.addEventListener("DOMContentLoaded", () => {
    const recordTitleInput = document.getElementById("recordTitleInput");
    const givingTypeSelect = document.getElementById("givingType");
    const entryBuilderSection = document.getElementById("entryBuilderSection");
    const builderTypeTitle = document.getElementById("builderTypeTitle");
    const itemDescriptionInput = document.getElementById("itemDescriptionInput");
    const incomeGroup = document.getElementById("incomeGroup");
    const incomeInput = document.getElementById("incomeInput");
    const amountLabel = document.getElementById("amountLabel");
    const itemAmountInput = document.getElementById("itemAmountInput");
    const addItemToListBtn = document.getElementById("addItemToListBtn");
    const pendingListWrapper = document.getElementById("pendingListWrapper");
    const pendingItemsList = document.getElementById("pendingItemsList");
    const saveBtn = document.getElementById("saveBtn");
    const dateInputLabel = document.getElementById("dateInputLabel");
    
    const titheTotalDisplay = document.getElementById("titheTotalDisplay");
    const investmentTotalDisplay = document.getElementById("investmentTotalDisplay");
    const expenseTotalDisplay = document.getElementById("expenseTotalDisplay");
    const grandTotalDisplay = document.getElementById("grandTotalDisplay");
    
    const settingTithePercent = document.getElementById("settingTithePercent");
    const settingDateMode = document.getElementById("settingDateMode");
    const saveSettingsBtn = document.getElementById("saveSettingsBtn");

    function initDatePicker() {
        if (typeof flatpickr === "undefined") return;
        if (flatpickrInstance) {
            flatpickrInstance.destroy();
            flatpickrInstance = null;
        }
        const mode = getSavedDateMode();
        const dateInput = document.getElementById("dateRangePicker");
        if (!dateInput) return;

        if (mode === "monthly" && typeof monthSelectPlugin !== "undefined") {
            if (dateInputLabel) dateInputLabel.innerText = "Select Month";
            flatpickrInstance = flatpickr("#dateRangePicker", { 
                plugins: [new monthSelectPlugin({ shorthand: true, dateFormat: "F Y", theme: "light" })], 
                defaultDate: new Date(), 
                allowInput: false,
                disableMobile: "true"
            });
        } else {
            if (dateInputLabel) dateInputLabel.innerText = "Select Duration / Date Range";
            flatpickrInstance = flatpickr("#dateRangePicker", { 
                mode: "range", 
                dateFormat: "d-M-Y", 
                defaultDate: [new Date(), new Date()], 
                separator: " - ", 
                allowInput: false,
                disableMobile: "true"
            });
        }
    }

    function validateSubItemInput() {
        if (!addItemToListBtn || !itemDescriptionInput || !itemAmountInput) return;
        addItemToListBtn.disabled = !(itemDescriptionInput.value.trim() && parseRawNumber(itemAmountInput.value) > 0);
    }

    function resetSubInputs() {
        if (itemDescriptionInput) itemDescriptionInput.value = "";
        if (incomeInput) incomeInput.value = "";
        if (itemAmountInput) itemAmountInput.value = "";
        if (addItemToListBtn) addItemToListBtn.disabled = true;
    }

    function updateCurrentTotals() {
        const totals = currentPendingItems.reduce((result, item) => {
            const key = getBadgeClass(item.type);
            if (result[key] !== undefined) {
                result[key] += Number(item.amount) || 0;
            }
            return result;
        }, { tithes: 0, investment: 0, lovegift: 0 });
        
        // Gagamitin ang formatNumberOnly sa halip na formatCurrency para hindi mag-duplicate ang ₱ symbol
        if (titheTotalDisplay) titheTotalDisplay.innerText = formatNumberOnly(totals.tithes);
        if (investmentTotalDisplay) investmentTotalDisplay.innerText = formatNumberOnly(totals.investment);
        if (expenseTotalDisplay) expenseTotalDisplay.innerText = formatNumberOnly(totals.lovegift);
        
        if (grandTotalDisplay) {
            const grandTotalValue = totals.tithes + totals.investment + totals.lovegift;
            const formattedText = formatNumberOnly(grandTotalValue);
            
            grandTotalDisplay.innerText = formattedText;

            // DYNAMIC FONT SCALING
            grandTotalDisplay.classList.remove("medium-text", "small-text", "xsmall-text");

            const textLength = formattedText.length;

            if (textLength > 15) {
                grandTotalDisplay.classList.add("xsmall-text");
            } else if (textLength > 12) {
                grandTotalDisplay.classList.add("small-text");
            } else if (textLength > 9) {
                grandTotalDisplay.classList.add("medium-text");
            }
        }
    }

    // UPDATED RENDER PENDING ITEMS: Inayos ang HTML structure ng amount at button container
    function renderPendingItems() {
        if (!pendingListWrapper || !saveBtn || !pendingItemsList) return;
        pendingListWrapper.style.display = currentPendingItems.length ? "block" : "none";
        saveBtn.disabled = currentPendingItems.length === 0;
        
        pendingItemsList.innerHTML = currentPendingItems.map((item, index) => `
            <div class="pending-item">
                <div class="pending-item-info">
                    <span class="type-badge ${getBadgeClass(item.type)}">${formatGivingType(item.type)}</span>
                    <strong>${item.description}</strong>
                </div>
                <div class="pending-item-actions">
                    <span title="${formatCurrency(item.amount)}">${formatCurrency(item.amount)}</span>
                    <button type="button" class="remove-item-btn" onclick="removePendingItem(${index})" title="Remove Item">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
            </div>
        `).join("");
    }

    window.removePendingItem = (index) => {
        currentPendingItems.splice(index, 1);
        renderPendingItems();
        updateCurrentTotals();
    };

    window.resetCalculatorForm = () => {
        editingRecordId = null;
        currentPendingItems = [];
        if (recordTitleInput) recordTitleInput.value = "";
        if (givingTypeSelect) givingTypeSelect.value = "";
        if (entryBuilderSection) entryBuilderSection.style.display = "none";
        if (saveBtn) saveBtn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Save Entry Record`;
        if (flatpickrInstance) flatpickrInstance.setDate(new Date());
        renderPendingItems();
        updateCurrentTotals();
    };

    window.editCalculatorRecord = (record) => {
        editingRecordId = record.id;
        if (recordTitleInput) recordTitleInput.value = record.title || record.recordTitle || "";
        currentPendingItems = Array.isArray(record.items) ? JSON.parse(JSON.stringify(record.items)) : [];
        if (flatpickrInstance && (record.dateLabel || record.date)) flatpickrInstance.setDate(record.dateLabel || record.date);
        renderPendingItems();
        updateCurrentTotals();
        if (saveBtn) saveBtn.innerHTML = `<i class="fa-solid fa-pen-to-square"></i> Update Record`;
    };

    if (givingTypeSelect) {
        givingTypeSelect.addEventListener("change", () => {
            const type = givingTypeSelect.value;
            if (entryBuilderSection) entryBuilderSection.style.display = type ? "block" : "none";
            if (!type) return;
            if (builderTypeTitle) builderTypeTitle.innerText = `Add ${type} Item`;
            const isTithe = type === "Tithes";
            if (incomeGroup) incomeGroup.style.display = isTithe ? "block" : "none";
            if (amountLabel) amountLabel.innerText = isTithe ? "Computed Tithe Amount" : "Amount";
            if (itemAmountInput) {
                itemAmountInput.readOnly = isTithe;
                itemAmountInput.classList.toggle("readonly-input", isTithe);
            }
            resetSubInputs();
        });
    }

    if (incomeInput) {
        incomeInput.addEventListener("input", () => {
            if (itemAmountInput) {
                itemAmountInput.value = formatCurrency(parseRawNumber(incomeInput.value) * getSavedTithePercent() / 100);
            }
            validateSubItemInput();
        });
        incomeInput.addEventListener("blur", event => event.target.value = parseRawNumber(event.target.value) ? formatCurrency(parseRawNumber(event.target.value)) : "");
    }

    if (itemAmountInput) {
        itemAmountInput.addEventListener("input", validateSubItemInput);
        itemAmountInput.addEventListener("blur", event => { if (givingTypeSelect && givingTypeSelect.value !== "Tithes") event.target.value = parseRawNumber(event.target.value) ? formatCurrency(parseRawNumber(event.target.value)) : ""; });
    }

    if (itemDescriptionInput) {
        itemDescriptionInput.addEventListener("input", validateSubItemInput);
    }

    if (addItemToListBtn) {
        addItemToListBtn.addEventListener("click", () => {
            if (!givingTypeSelect || !itemDescriptionInput || !itemAmountInput) return;
            currentPendingItems.push({ id: Date.now(), type: givingTypeSelect.value, description: itemDescriptionInput.value.trim(), amount: parseRawNumber(itemAmountInput.value) });
            resetSubInputs();
            renderPendingItems();
            updateCurrentTotals();
        });
    }

    if (saveBtn) {
        saveBtn.addEventListener("click", async () => {
            if (!givingTypeSelect || !itemDescriptionInput || !itemAmountInput) return;
            const amount = parseRawNumber(itemAmountInput.value);
            if (givingTypeSelect.value && itemDescriptionInput.value.trim() && amount > 0) {
                currentPendingItems.push({ id: Date.now(), type: givingTypeSelect.value, description: itemDescriptionInput.value.trim(), amount });
                resetSubInputs();
            }
            if (!currentPendingItems.length) return showModal({ title: "Notice", message: "Please add at least one item before saving.", type: "warning" });
            
            const dateInput = document.getElementById("dateRangePicker");
            const record = { 
                id: String(editingRecordId ?? Date.now()), 
                title: recordTitleInput ? recordTitleInput.value.trim() || "Untitled Record" : "Untitled Record", 
                dateLabel: dateInput && dateInput.value.trim() ? dateInput.value.trim() : new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).replace(/ /g, "-"), 
                createdAt: new Date().toISOString(), 
                items: [...currentPendingItems] 
            };

            const isEditing = editingRecordId !== null;
            const originalHtml = saveBtn.innerHTML;
            saveBtn.disabled = true;
            saveBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>${isEditing ? "Updating..." : "Saving..."}</span>`;

            try {
                await postToSheet({ action: "save", data: record });
                
                // I-refresh muli ang history mula sa Google Sheet upang makuha ang pinaka-updated na datos
                const freshHistory = await fetchHistoryFromSheet();
                window.cachedHistory = freshHistory;
                setLocalHistoryCache(freshHistory);

                window.resetCalculatorForm();
                await showModal({ title: "Success", message: isEditing ? "Record updated successfully!" : "Record successfully saved to your database!", type: "info" });
                if (isEditing) window.setActiveScreen("historyScreen");
            } catch (error) {
                console.error("Failed to save to database:", error);
                await showModal({ title: "Error", message: "The record could not be saved. Check SCRIPT_URL and your internet connection.", type: "danger" });
            } finally {
                saveBtn.disabled = false;
                if (!isEditing) saveBtn.innerHTML = originalHtml;
            }
        });
    }

    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener("click", async () => {
            const selectedModeInput = document.getElementById("settingDateMode");
            const selectedPercentInput = document.getElementById("settingTithePercent");

            if (selectedPercentInput) {
                localStorage.setItem("tithePercentConfig", parseFloat(selectedPercentInput.value) || 0);
            }
            if (selectedModeInput) {
                localStorage.setItem("titheDateMode", selectedModeInput.value);
            }

            initDatePicker();

            await showModal({ 
                title: "Settings Saved", 
                message: "Your default preferences have been updated successfully!", 
                type: "info" 
            });
        });
    }

    const currentMode = getSavedDateMode();
    if (settingDateMode) {
        settingDateMode.value = currentMode;
    }

    const dateModeWrapper = document.getElementById("settingDateModeWrapper");
    const dateModeLabel = document.getElementById("settingDateModeLabel");
    if (dateModeWrapper) {
        const options = dateModeWrapper.querySelectorAll(".custom-option");
        options.forEach(option => {
            const val = option.getAttribute("data-value");
            if (val === currentMode) {
                option.classList.add("selected");
                if (dateModeLabel) {
                    dateModeLabel.textContent = option.textContent.trim();
                }
            } else {
                option.classList.remove("selected");
            }
        });
    }

    restrictToNumbersOnly(incomeInput);
    restrictToNumbersOnly(itemAmountInput);
    restrictToNumbersOnly(settingTithePercent);
    if (settingTithePercent) settingTithePercent.value = getSavedTithePercent();
    if (settingDateMode) settingDateMode.value = getSavedDateMode();
    
    initDatePicker();
    updateCurrentTotals();
});