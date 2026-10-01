// ==========================================
// Dashboard Data & Core Logic Module
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    let dashDateRangePicker = null;

    // Flag para maiwasan ang pag-override ng Flatpickr sa shortcut label
    let isInternalShortcutChange = false;

    // State para sa Pagination at Number View
    let isCompactFormat = localStorage.getItem('dash_num_format') === 'compact';
    let currentPage = 1;
    const itemsPerPage = 5;
    let currentFilteredRecords = [];

    // Helper: Formatter para sa Cards sa Dashboard
    function formatDashboardCurrency(amount) {
        const num = Number(amount) || 0;
        
        if (isCompactFormat) {
            return new Intl.NumberFormat('en-PH', {
                style: 'currency',
                currency: 'PHP',
                notation: 'compact',
                maximumFractionDigits: 2
            }).format(num);
        } else {
            return typeof formatCurrency === 'function' 
                ? formatCurrency(num) 
                : `₱ ${num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
    }

    // Event Listener at Handler para sa Toggle Card Button
    function setupFormatToggleButton() {
        const toggleBtn = document.getElementById('toggleNumberFormatBtn');
        const label = document.getElementById('formatBtnLabel');
        if (!toggleBtn) return;

        function updateBtnUI() {
            if (isCompactFormat) {
                toggleBtn.classList.add('active-compact');
                if (label) label.textContent = 'Compact';
            } else {
                toggleBtn.classList.remove('active-compact');
                if (label) label.textContent = 'Full View';
            }
        }

        updateBtnUI();

        toggleBtn.addEventListener('click', () => {
            isCompactFormat = !isCompactFormat;
            localStorage.setItem('dash_num_format', isCompactFormat ? 'compact' : 'full');
            updateBtnUI();
            
            if (typeof window.loadDashboardData === 'function') {
                window.loadDashboardData();
            }
        });
    }

    // Helper: I-parse ang date string patungong JS Date Objects
    function parseDateRange(dateStr) {
        if (!dateStr) return null;
        const str = String(dateStr).trim();
        
        if (str.includes(' to ') || str.includes(' - ')) {
            const parts = str.split(/\s+(?:to|-)\s+/);
            const start = new Date(parts[0]);
            const end = new Date(parts[1] || parts[0]);
            
            if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                start.setHours(0, 0, 0, 0);
                end.setHours(23, 59, 59, 999);
                return { start, end };
            }
        }

        const singleDate = new Date(str);
        if (!isNaN(singleDate.getTime())) {
            const start = new Date(singleDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(singleDate);
            end.setHours(23, 59, 59, 999);
            return { start, end };
        }

        return null;
    }

    // Helper para i-update ang Shortcut Dropdown Label at Selected Class
    function setShortcutDropdownValue(val, text) {
        const hiddenInput = document.getElementById('dashShortcutFilter');
        const label = document.getElementById('dashShortcutLabel');
        const options = document.querySelectorAll('#dashShortcutWrapper .custom-option');

        if (hiddenInput) hiddenInput.value = val;
        if (label) label.textContent = text;

        options.forEach(opt => {
            if (opt.getAttribute('data-value') === val) {
                opt.classList.add('selected');
            } else {
                opt.classList.remove('selected');
            }
        });
    }

    // INITIALIZE DATE RANGE PICKER
    function initDashboardDateRangePicker() {
        const inputEl = document.getElementById('dashDateFilter');
        if (!inputEl) return;

        if (inputEl._flatpickr) {
            inputEl._flatpickr.destroy();
        }

        const now = new Date();
        const startDate = new Date(now.getFullYear(), 0, 1);

        dashDateRangePicker = flatpickr(inputEl, {
            mode: "range",
            dateFormat: "d-M-Y",
            defaultDate: [startDate, now],
            separator: " to ",
            onChange: function(selectedDates) {
                if (!isInternalShortcutChange && selectedDates.length === 2) {
                    setShortcutDropdownValue("custom", "Custom Range");
                    currentPage = 1;
                    window.loadDashboardData();
                }
            },
            onClose: function(selectedDates, dateStr, instance) {
                if (!dateStr || selectedDates.length === 0) {
                    const currentYear = new Date().getFullYear();
                    const yearStart = new Date(currentYear, 0, 1);
                    const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59);

                    isInternalShortcutChange = true;
                    instance.setDate([yearStart, yearEnd], false);
                    setShortcutDropdownValue("ytd", "This Year (YTD)");
                    isInternalShortcutChange = false;

                    currentPage = 1;
                    window.loadDashboardData();
                }
            }
        });
    }

    // Handler para sa Shortcut Dropdown Choices
    function applyShortcutFilter(shortcutKey) {
        if (!dashDateRangePicker) return;

        const now = new Date();
        let start, end;
        let labelText = "Custom Range";

        switch (shortcutKey) {
            case 'ytd_now':
                start = new Date(now.getFullYear(), 0, 1);
                end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
                labelText = "YTD (Jan - Present)";
                break;
            case 'ytd':
                start = new Date(now.getFullYear(), 0, 1);
                end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
                labelText = "Full Year (Jan - Dec)";
                break;
            case 'this_month':
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                labelText = "This Month";
                break;
            case 'last_month':
                start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                end = new Date(now.getFullYear(), now.getMonth(), 0);
                labelText = "Last Month";
                break;
            case 'this_quarter':
                const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
                start = new Date(now.getFullYear(), quarterMonth, 1);
                end = new Date(now.getFullYear(), quarterMonth + 3, 0);
                labelText = "This Quarter";
                break;
            case 'all_time':
                start = new Date(2000, 0, 1);
                end = new Date(now.getFullYear() + 5, 11, 31);
                labelText = "All Time";
                break;
            default:
                labelText = "Custom Range";
                break;
        }

        setShortcutDropdownValue(shortcutKey, labelText);

        if (shortcutKey !== 'custom' && start && end) {
            currentPage = 1;
            isInternalShortcutChange = true;
            dashDateRangePicker.setDate([start, end], false);
            isInternalShortcutChange = false;
            
            window.loadDashboardData();
        }
    }

    // PANGUNAHING DATA LOADER & PROCESSOR
    window.loadDashboardData = async function() {
        let history = Array.isArray(window.cachedHistory) ? window.cachedHistory : [];

        if (!history.length && typeof window.getLocalHistoryCache === "function") {
            try {
                const cachedHistory = window.getLocalHistoryCache();
                if (Array.isArray(cachedHistory)) history = cachedHistory;
            } catch (err) {
                console.warn("Dashboard local cache read error:", err);
            }
        }

        if (!history.length && typeof window.fetchHistoryFromSheet === "function") {
            try {
                const fetchedHistory = await window.fetchHistoryFromSheet();
                if (Array.isArray(fetchedHistory)) history = fetchedHistory;
                if (typeof window.setLocalHistoryCache === "function") {
                    window.setLocalHistoryCache(history);
                }
            } catch (err) {
                console.error("Dashboard fetch error:", err);
            }
        }
        window.cachedHistory = history;

        const dateFilterVal = document.getElementById('dashDateFilter')?.value || "";
        let selectedRange = parseDateRange(dateFilterVal);

        if (!selectedRange) {
            const currentYear = new Date().getFullYear();
            selectedRange = {
                start: new Date(currentYear, 0, 1, 0, 0, 0),
                end: new Date(currentYear, 11, 31, 23, 59, 59)
            };
        }

        let filteredRecords = history.filter(record => {
            if (selectedRange) {
                let rawRecordDate = record.dateLabel || record.date || record.dateRange || record.createdAt || '';
                let recRange = parseDateRange(rawRecordDate);

                if (recRange) {
                    if (recRange.end < selectedRange.start || recRange.start > selectedRange.end) {
                        return false;
                    }
                }
            }
            return true;
        });

        currentFilteredRecords = filteredRecords.slice().reverse();

        let totalTithes = 0;
        let totalInvestments = 0;
        let totalExpenses = 0;

        filteredRecords.forEach(entry => {
            if (Array.isArray(entry.items) && entry.items.length > 0) {
                entry.items.forEach(item => {
                    const amt = Number(item.amount) || 0;
                    const type = String(item.type || "").toLowerCase();

                    if (type.includes("tithe")) {
                        totalTithes += amt;
                    } else if (type.includes("investment") || type.includes("offering")) {
                        totalInvestments += amt;
                    } else if (type.includes("expense") || type.includes("lovegift")) {
                        totalExpenses += amt;
                    }
                });
            } else {
                totalTithes += Number(entry.total1 || entry.tithesTotal || 0);
                totalInvestments += Number(entry.total2 || entry.investmentTotal || entry.offeringTotal || 0);
                totalExpenses += Number(entry.total3 || entry.expenseTotal || entry.lovegiftTotal || 0);
            }
        });

        const tithesEl = document.getElementById("dashTotalTithes");
        const investmentsEl = document.getElementById("dashTotalInvestments");
        const expensesEl = document.getElementById("dashTotalExpenses");

        if (tithesEl) tithesEl.textContent = formatDashboardCurrency(totalTithes);
        if (investmentsEl) investmentsEl.textContent = formatDashboardCurrency(totalInvestments);
        if (expensesEl) expensesEl.textContent = formatDashboardCurrency(totalExpenses);

        // 1. Tawagin ang Pie Chart Rendering mula sa dashboard_charts.js
        if (typeof renderGivingPieChart === 'function') {
            const grandTotal = totalTithes + totalInvestments + totalExpenses;
            const chartData = {
                labels: ['Tithes', 'Investments', 'Expenses'],
                datasets: [{
                    data: grandTotal > 0 ? [totalTithes, totalInvestments, totalExpenses] : [0, 0, 0],
                    backgroundColor: ['#0284c7', '#16a34a', '#d97706'],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            };
            renderGivingPieChart(chartData, grandTotal);
        }

        // 2. Tawagin ang Table View Rendering mula sa dashboard_charts.js
        if (typeof renderDistributionTable === 'function') {
            renderDistributionTable(filteredRecords, formatDashboardCurrency); 
        }

        // 3. Render Paginated Recent List
        renderPaginatedRecentList();
    };

    window.updateDashboard = window.loadDashboardData;

    // RECENT TRANSACTIONS PAGINATION
    function renderPaginatedRecentList() {
        const recentListContainer = document.getElementById('dashRecentList');
        const paginationContainer = document.getElementById('dashPagination');
        const prevBtn = document.getElementById('dashPrevPageBtn');
        const nextBtn = document.getElementById('dashNextPageBtn');
        const pageIndicator = document.getElementById('dashPageIndicator');

        if (!recentListContainer) return;

        const totalItems = currentFilteredRecords.length;

        if (totalItems === 0) {
            recentListContainer.innerHTML = `<p style="text-align:center; color:#64748b; padding:15px;">No record found for the selected date.</p>`;
            if (paginationContainer) paginationContainer.style.display = 'none';
            return;
        }

        const totalPages = Math.ceil(totalItems / itemsPerPage);

        if (currentPage < 1) currentPage = 1;
        if (currentPage > totalPages) currentPage = totalPages;

        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const pageEntries = currentFilteredRecords.slice(startIndex, endIndex);

        recentListContainer.innerHTML = pageEntries.map(entry => {
            const items = Array.isArray(entry.items) ? entry.items : [];
            const total = entry.grandTotal != null && entry.grandTotal !== "" 
                ? Number(entry.grandTotal) 
                : items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

            const dateText = entry.dateLabel || entry.date || entry.dateRange || '';

            return `
                <div class="recent-item">
                    <div>
                        <strong>${entry.title || entry.recordTitle || "Untitled Record"}</strong>
                        <div style="font-size: 0.8rem; color: #64748b;">${dateText}</div>
                    </div>
                    <strong style="color: #005f56;">${typeof formatCurrency === 'function' ? formatCurrency(total) : '₱ ' + total.toLocaleString()}</strong>
                </div>
            `;
        }).join("");

        if (paginationContainer) {
            if (totalPages > 1) {
                paginationContainer.style.display = 'flex';
                if (pageIndicator) pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;
                if (prevBtn) prevBtn.disabled = currentPage === 1;
                if (nextBtn) nextBtn.disabled = currentPage === totalPages;
            } else {
                paginationContainer.style.display = 'none';
            }
        }
    }

    // Recent Items Pagination Handlers
    const prevBtn = document.getElementById('dashPrevPageBtn');
    const nextBtn = document.getElementById('dashNextPageBtn');

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderPaginatedRecentList();
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            const totalPages = Math.ceil(currentFilteredRecords.length / itemsPerPage);
            if (currentPage < totalPages) {
                currentPage++;
                renderPaginatedRecentList();
            }
        });
    }

    // Setup Custom Shortcut Dropdown Listener
    const dashShortcutWrapper = document.getElementById('dashShortcutWrapper');
    if (dashShortcutWrapper) {
        const trigger = dashShortcutWrapper.querySelector('.custom-select-trigger');
        const options = dashShortcutWrapper.querySelectorAll('.custom-option');

        if (trigger) {
            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                dashShortcutWrapper.classList.toggle('open');
            });
        }

        options.forEach(option => {
            option.addEventListener('click', () => {
                const val = option.getAttribute('data-value');
                dashShortcutWrapper.classList.remove('open');
                applyShortcutFilter(val);
            });
        });

        document.addEventListener('click', () => {
            dashShortcutWrapper.classList.remove('open');
        });
    }

    // INITIAL CALLS UPON LOAD
    initDashboardDateRangePicker();
    setupFormatToggleButton();
    
    window.loadDashboardData();
});