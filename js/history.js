function formatDateLabel(rawLabel) {
    if (!rawLabel) return "N/A";
    const value = String(rawLabel).trim();
    const date = new Date(value);
    return /^\d{4}-\d{2}-\d{2}T/.test(value) && !Number.isNaN(date.getTime())
        ? date.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" })
        : value;
}

function formatDateTimeLabel(isoString) {
    if (!isoString) return "";
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
    });
}

function renderHistoryList(searchTerm = "") {
    const historyList = document.getElementById("historyList");
    if (!historyList) return;
    
    let sourceData = Array.isArray(window.cachedHistory) ? [...window.cachedHistory] : [];
    const query = searchTerm.toLowerCase().trim();

    // SORTING: Siguraduhing nauuna ang pinakabagong record sa taas (Descending Order)
    sourceData.sort((a, b) => {
        const timeA = new Date(a.createdAt || Number(a.id) || 0).getTime();
        const timeB = new Date(b.createdAt || Number(b.id) || 0).getTime();
        return timeB - timeA; // Bago muna bago ang luma
    });

    const filtered = sourceData.filter(entry => {
        const title = String(entry.title || entry.recordTitle || "Untitled Record").toLowerCase();
        const rawDate = String(entry.dateLabel || entry.date || "").toLowerCase();
        const items = Array.isArray(entry.items) ? entry.items : [];
        return !query || title.includes(query) || rawDate.includes(query) || formatDateLabel(rawDate).toLowerCase().includes(query) || items.some(item => (String(item.description || item.source || "") + " " + String(item.type || "") + " " + String(item.amount || "")).toLowerCase().includes(query));
    });

    window.currentFilteredHistory = filtered;

    if (!filtered.length) {
        historyList.innerHTML = '<p style="text-align:center; color:#64748b; padding:20px 0;">No records found.</p>';
        return;
    }

    historyList.innerHTML = filtered.map(entry => {
        const items = Array.isArray(entry.items) ? entry.items : [];
        const total = entry.grandTotal != null && entry.grandTotal !== "" ? Number(entry.grandTotal) : items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
        
        const createdTimestamp = entry.createdAt ? formatDateTimeLabel(entry.createdAt) : "";
        const timeBadge = createdTimestamp ? `<span class="created-time" style="font-size: 0.75rem; color: #64748b; display: block; margin-top: 2px;"><i class="fa-regular fa-clock"></i> Created: ${createdTimestamp}</span>` : "";

        return '<div class="history-card" id="card-' + entry.id + '">' +
            '<div class="history-card-header">' +
                '<div class="history-card-header-main">' +
                    '<span class="history-card-title">' + (entry.title || entry.recordTitle || "Untitled Record") + '</span>' +
                    '<span class="history-card-date"><i class="fa-solid fa-calendar-days"></i> ' + formatDateLabel(entry.dateLabel || entry.date) + '</span>' +
                    timeBadge +
                '</div>' +
                '<div class="card-right-side">' +
                    '<span class="entry-total">' + formatCurrency(total) + '</span>' +
                    '<div class="options-menu">' +
                        '<button class="icon-action-btn menu-trigger-btn" onclick="toggleCardMenu(event, \'' + entry.id + '\')" title="More Options"><i class="fa-solid fa-ellipsis-vertical"></i></button>' +
                        '<div class="options-dropdown" id="dropdown-' + entry.id + '">' +
                            '<button class="dropdown-item" onclick="loadRecordForEdit(\'' + entry.id + '\')"><i class="fa-solid fa-pen-to-square"></i> Edit</button>' +
                            '<button class="dropdown-item delete-item" onclick="deleteHistoryItem(\'' + entry.id + '\', event)"><i class="fa-solid fa-trash"></i> Delete</button>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<div class="history-card-body">' + items.map(item => '<div class="history-sub-item"><span><span class="type-badge ' + getBadgeClass(item.type) + '">' + formatGivingType(item.type) + '</span> ' + (item.description || item.source || "") + '</span><strong>' + formatCurrency(item.amount) + '</strong></div>').join("") + '</div>' +
        '</div>';
    }).join("");
}

async function renderHistoryScreen(searchTerm = "", forceRefresh = true) {
    const historyList = document.getElementById("historyList");
    if (!historyList) return;
    
    // 1. Unang ipakita ang nakasave na local cache para mabilis mag-load sa Screen
    const cache = getLocalHistoryCache();
    if (cache.length) { 
        window.cachedHistory = cache; 
        renderHistoryList(searchTerm); 
    } else {
        historyList.innerHTML = '<p style="text-align:center; color:#64748b; padding:20px 0;"><i class="fa-solid fa-spinner fa-spin"></i> Loading records from Google Sheet...</p>';
    }

    if (!forceRefresh) return;

    // 2. Kumuha ng bagong data mula sa Google Apps Script
    try {
        const freshData = await fetchHistoryFromSheet();
        window.cachedHistory = freshData;
        setLocalHistoryCache(freshData);
        renderHistoryList(document.getElementById("historySearchInput")?.value || searchTerm);
    } catch (error) {
        console.error("Error fetching history:", error);
        if (!cache.length) {
            historyList.innerHTML = '<p style="text-align:center; color:#b91c1c; padding:20px 0;">Unable to load history. Please check your internet connection.</p>';
        }
    }
}

async function deleteHistoryItem(id, event) {
    document.querySelectorAll(".options-dropdown.show").forEach(menu => menu.classList.remove("show"));
    
    const confirmed = await showModal({ 
        title: "Delete Entry", 
        message: "Are you sure you want to delete this history item?", 
        type: "confirm" 
    });
    
    if (!confirmed) return;

    const cardElement = document.getElementById('card-' + id);
    if (cardElement) {
        cardElement.style.opacity = "0.5";
        cardElement.style.pointerEvents = "none";
    }

    try { 
        await postToSheet({ action: "delete", data: { id } }); 
    } catch (error) { 
        console.error("Failed to delete history item:", error); 
    }

    window.cachedHistory = (window.cachedHistory || []).filter(item => String(item.id) !== String(id));
    setLocalHistoryCache(window.cachedHistory);
    
    renderHistoryList(document.getElementById("historySearchInput")?.value || "");
    
    await showModal({ 
        title: "Entry Deleted", 
        message: "The record has been removed successfully.", 
        type: "info" 
    });
}

window.deleteHistoryItem = deleteHistoryItem;
window.renderHistoryScreen = renderHistoryScreen;
window.toggleCardMenu = (event, id) => {
    event.stopPropagation();
    document.querySelectorAll(".options-dropdown.show").forEach(menu => { 
        if (menu.id !== ('dropdown-' + id)) menu.classList.remove("show"); 
    });
    document.getElementById('dropdown-' + id)?.classList.toggle("show");
};

window.loadRecordForEdit = id => {
    const record = (window.cachedHistory || []).find(item => String(item.id) === String(id));
    
    if (!record) {
        console.error("Record not found for ID:", id);
        return;
    }

    if (typeof window.editCalculatorRecord === "function") {
        window.editCalculatorRecord(record);
    } else {
        console.warn("window.editCalculatorRecord is not defined in calc.js!");
    }

    if (typeof window.setActiveScreen === "function") {
        window.setActiveScreen("calcScreen");
    }
};

function buildExportRows() {
    const records = Array.isArray(window.currentFilteredHistory) && window.currentFilteredHistory.length > 0
        ? window.currentFilteredHistory 
        : (Array.isArray(window.cachedHistory) ? window.cachedHistory : []);

    return records.flatMap(entry => {
        const items = entry.items?.length ? entry.items : [{ type: "", description: "", amount: 0 }];
        const total = entry.grandTotal ?? items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
        return items.map((item, index) => ({
            title: index === 0 ? (entry.title || entry.recordTitle || "Untitled Record") : "",
            date: index === 0 ? formatDateLabel(entry.dateLabel || entry.date) : "",
            createdTime: index === 0 ? formatDateTimeLabel(entry.createdAt) : "",
            type: item.type ? formatGivingType(item.type) : "", 
            description: item.description || item.source || "", 
            amount: item.amount || 0,
            recordTotal: index === items.length - 1 ? total : ""
        }));
    });
}

function exportFilename(extension) { 
    return 'giving-history-' + new Date().toISOString().slice(0, 10) + '.' + extension; 
}

const headers = ["Computation Title", "Date", "Created Time", "Giving Type", "Source / Description", "Amount", "Record Grand Total"];

function getExportRowsOrAlert() {
    const rows = buildExportRows();
    if (!rows || !rows.length) {
        showModal({ title: "Nothing to Export", message: "There are no history records to export.", type: "warning" });
        return null;
    }
    return rows;
}

// Global Event Delegation para sa Export at Dropdowns
document.addEventListener("click", (e) => {
    const exportMainBtn = e.target.closest("#exportMainBtn");
    const exportDropdownMenu = document.getElementById("exportDropdownMenu");

    if (exportMainBtn) {
        e.stopPropagation();
        exportDropdownMenu?.classList.toggle("show");
        return;
    }

    if (e.target.closest("#exportCsvBtn")) {
        exportDropdownMenu?.classList.remove("show");
        const rows = getExportRowsOrAlert();
        if (!rows) return;

        const escape = value => { const text = String(value ?? ""); return /[",\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text; };
        const csv = [headers, ...rows.map(row => [row.title, row.date, row.createdTime, row.type, row.description, row.amount, row.recordTotal])].map(row => row.map(escape).join(",")).join("\r\n");
        const link = document.createElement("a"); 
        link.href = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv" })); 
        link.download = exportFilename("csv"); 
        link.click(); 
        URL.revokeObjectURL(link.href);
        return;
    }

    if (e.target.closest("#exportExcelBtn")) {
        exportDropdownMenu?.classList.remove("show");
        const rows = getExportRowsOrAlert();
        if (!rows) return;
        if (typeof XLSX === "undefined") return showModal({ title: "Error", message: "The Excel export library (xlsx.full.min.js) did not load.", type: "danger" });

        const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows.map(row => [row.title, row.date, row.createdTime, row.type, row.description, row.amount, row.recordTotal])]);
        const workbook = XLSX.utils.book_new(); 
        XLSX.utils.book_append_sheet(workbook, sheet, "Giving History"); 
        XLSX.writeFile(workbook, exportFilename("xlsx"));
        return;
    }

    if (e.target.closest("#exportPdfBtn")) {
        exportDropdownMenu?.classList.remove("show");
        const rows = getExportRowsOrAlert();
        if (!rows) return;
        if (!window.jspdf?.jsPDF) return showModal({ title: "Error", message: "The PDF export library (jspdf) did not load.", type: "danger" });

        const documentPdf = new window.jspdf.jsPDF({ orientation: "landscape" });

        const logoBase64 = typeof KINGDOMCALC_LOGO_BASE64 !== "undefined" ? KINGDOMCALC_LOGO_BASE64 : null;

        if (logoBase64) {
            try {
                documentPdf.addImage(logoBase64, 'PNG', 14, 10, 10, 10);
                documentPdf.setFontSize(16);
                documentPdf.setFont("helvetica", "bold");
                documentPdf.setTextColor(18, 92, 81);
                documentPdf.text("KingdomCalc", 27, 17);
            } catch (e) {
                documentPdf.setFontSize(16);
                documentPdf.setFont("helvetica", "bold");
                documentPdf.setTextColor(18, 92, 81);
                documentPdf.text("KingdomCalc", 14, 17);
            }
        } else {
            documentPdf.setFontSize(16);
            documentPdf.setFont("helvetica", "bold");
            documentPdf.setTextColor(18, 92, 81);
            documentPdf.text("KingdomCalc", 14, 17);
        }

        documentPdf.setFontSize(11);
        documentPdf.setFont("helvetica", "normal");
        documentPdf.setTextColor(80, 80, 80);
        documentPdf.text("Tithes, Investments, & Expenses - Giving History", 14, 25);

        const formatPdfCurrency = (val) => {
            if (val === "" || val === null || val === undefined) return "";
            const num = Number(val) || 0;
            return `PHP ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        };

        const formattedBodyRows = rows.map(row => [
            row.title, 
            row.date, 
            row.createdTime, 
            row.type, 
            row.description, 
            formatPdfCurrency(row.amount), 
            formatPdfCurrency(row.recordTotal)
        ]);

        documentPdf.autoTable({ 
            startY: 30, 
            head: [headers], 
            body: formattedBodyRows,
            theme: 'grid',
            headStyles: {
                fillColor: [30, 126, 166],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                lineWidth: 0.2,
                lineColor: [180, 180, 180],
                halign: 'left'
            },
            bodyStyles: {
                textColor: [40, 40, 40],
                lineWidth: 0.2,
                lineColor: [200, 200, 200]
            },
            columnStyles: {
                5: { halign: 'right', cellWidth: 35 },
                6: { halign: 'right', cellWidth: 40 }
            },
            alternateRowStyles: {
                fillColor: [248, 249, 250]
            },
            styles: {
                fontSize: 8.5,
                cellPadding: 3,
                valign: 'middle',
                overflow: 'linebreak'
            }
        });

        documentPdf.save(exportFilename("pdf"));
        return;
    }

    document.querySelectorAll(".options-dropdown.show").forEach(menu => menu.classList.remove("show"));
    if (exportDropdownMenu && exportDropdownMenu.classList.contains("show")) {
        if (!exportDropdownMenu.contains(e.target)) {
            exportDropdownMenu.classList.remove("show");
        }
    }
});

document.addEventListener("DOMContentLoaded", () => {
    const clearHistoryBtn = document.getElementById("clearHistoryBtn");
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener("click", async () => {
            const confirmed = await showModal({ 
                title: "Clear All History", 
                message: "Are you sure you want to erase all history records? This action cannot be undone.", 
                type: "warning" 
            });
            
            if (!confirmed) return;

            const originalBtnHTML = clearHistoryBtn.innerHTML;
            clearHistoryBtn.disabled = true;
            clearHistoryBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Clearing...';

            try { 
                await postToSheet({ action: "clear" }); 
            } catch (error) { 
                console.error("Failed to clear history:", error); 
            }

            localStorage.removeItem("titheHistoryCache");
            window.cachedHistory = [];
            setLocalHistoryCache([]);
            renderHistoryList("");

            clearHistoryBtn.disabled = false;
            clearHistoryBtn.innerHTML = originalBtnHTML;

            await showModal({ 
                title: "History Cleared", 
                message: "All history entries have been deleted.", 
                type: "info" 
            });
        });
    }

    const searchInput = document.getElementById("historySearchInput");
    const clearSearchBtn = document.getElementById("clearSearchBtn");

    if (searchInput && clearSearchBtn) {
        function toggleClearButton() {
            clearSearchBtn.style.display = searchInput.value.trim().length > 0 ? "flex" : "none";
        }

        searchInput.addEventListener("input", (event) => {
            toggleClearButton();
            renderHistoryList(event.target.value);
        });

        clearSearchBtn.addEventListener("click", () => {
            searchInput.value = "";
            toggleClearButton();
            searchInput.focus();
            renderHistoryList("");
        });

        toggleClearButton();
    }
});