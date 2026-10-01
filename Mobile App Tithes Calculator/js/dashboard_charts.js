// ==========================================
// Dashboard Visuals & Charts Module
// ==========================================

let givingChartInstance = null;
let currentDistView = 1;
let currentRawTableData = [];
let currentSortColumn = null;
let isAscending = true;

/**
 * Render or Update the Giving Pie Chart
 */
function renderGivingPieChart(chartData, grandTotal) {
    const ctx = document.getElementById('givingPieChart');
    if (!ctx) return;

    if (givingChartInstance) {
        givingChartInstance.destroy();
    }

    const pieCalloutPlugin = {
        id: 'pieCalloutPlugin',
        afterDraw(chart) {
            const { ctx } = chart;
            const dataset = chart.data.datasets[0];
            const meta = chart.getDatasetMeta(0);

            const currentTotal = dataset.data.reduce((a, b) => a + (Number(b) || 0), 0);
            if (!currentTotal || !meta.data || !meta.data.length) return;

            meta.data.forEach((element, index) => {
                const value = dataset.data[index];
                if (!value || value <= 0) return;

                const { x, y, startAngle, endAngle, outerRadius } = element;
                const midAngle = startAngle + (endAngle - startAngle) / 2;

                const startX = x + Math.cos(midAngle) * outerRadius;
                const startY = y + Math.sin(midAngle) * outerRadius;

                const lineLen = 16;
                const breakX = x + Math.cos(midAngle) * (outerRadius + lineLen);
                const breakY = y + Math.sin(midAngle) * (outerRadius + lineLen);

                const isRight = Math.cos(midAngle) >= 0;
                const endX = breakX + (isRight ? 10 : -10);
                const endY = breakY;

                const sliceColor = dataset.backgroundColor[index] || '#64748b';

                ctx.save();
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(breakX, breakY);
                ctx.lineTo(endX, endY);
                ctx.strokeStyle = sliceColor;
                ctx.lineWidth = 1.5;
                ctx.stroke();

                const pctRaw = (value / currentTotal) * 100;
                let percentageText = pctRaw > 0 && pctRaw < 0.1 ? '< 0.1%' : pctRaw.toFixed(1) + '%';

                ctx.fillStyle = '#1e293b';
                ctx.font = 'bold 11px sans-serif';
                ctx.textAlign = isRight ? 'left' : 'right';
                ctx.textBaseline = 'middle';

                const textX = endX + (isRight ? 4 : -4);
                ctx.fillText(percentageText, textX, endY);
                ctx.restore();
            });
        }
    };

    givingChartInstance = new Chart(ctx, {
        type: 'pie',
        data: chartData,
        plugins: [pieCalloutPlugin],
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: { top: 20, bottom: 10, left: 35, right: 35 }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    align: 'center',
                    labels: {
                        padding: 20,
                        font: { size: 11 },
                        boxWidth: 12
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const rawValue = context.raw || 0;
                            const formattedVal = typeof formatCurrency === 'function'
                                ? formatCurrency(rawValue)
                                : '₱ ' + rawValue.toLocaleString('en-PH', { minimumFractionDigits: 2 });
                            const percentage = grandTotal > 0 
                                ? ((rawValue / grandTotal) * 100).toFixed(1) + '%' 
                                : '0%';
                            return `${label}: ${formattedVal} (${percentage})`;
                        }
                    }
                },
                datalabels: { display: false }
            }
        }
    });
}

/**
 * Render the Distribution Table View
 */
function renderDistributionTable(filteredEntries = [], formatFn = null) {
    let rowsData = [];

    filteredEntries.forEach(entry => {
        const label = entry.title || entry.label || entry.recordTitle || 'Untitled Record';
        const dateStr = entry.dateLabel || entry.date || entry.dateRange || entry.period || entry.createdAt || '-';

        if (entry.items && Array.isArray(entry.items) && entry.items.length > 0) {
            entry.items.forEach(item => {
                rowsData.push({
                    type: formatGivingType(item.type || 'Tithes'),
                    label: label,
                    source: item.source || item.description || '-',
                    date: dateStr,
                    amount: Number(item.amount) || 0
                });
            });
        } else {
            rowsData.push({
                type: formatGivingType(entry.type || 'Tithes'),
                label: label,
                source: entry.source || entry.description || '-',
                date: dateStr,
                amount: Number(entry.amount || entry.total || entry.grandTotal || 0)
            });
        }
    });

    currentRawTableData = rowsData;
    renderSortedTableData(formatFn);
}

function renderSortedTableData(formatFn = null) {
    const tableBody = document.getElementById('distributionTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = '';

    if (!currentRawTableData || currentRawTableData.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted py-3">
                    No transactions found.
                </td>
            </tr>`;
        return;
    }

    if (currentSortColumn) {
        currentRawTableData.sort((a, b) => {
            let valA = a[currentSortColumn];
            let valB = b[currentSortColumn];

            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();

            if (valA < valB) return isAscending ? -1 : 1;
            if (valA > valB) return isAscending ? 1 : -1;
            return 0;
        });
    }

    let rowsHTML = '';
    currentRawTableData.forEach(item => {
        let badgeClass = 'bg-secondary';
        const lowerType = String(item.type).toLowerCase();
        if (lowerType.includes('tithe')) badgeClass = 'bg-primary';
        else if (lowerType.includes('investment') || lowerType.includes('offer')) badgeClass = 'bg-success';
        else if (lowerType.includes('expense')) badgeClass = 'bg-danger';

        const displayAmount = typeof formatFn === 'function' 
            ? formatFn(item.amount) 
            : (typeof formatCurrency === 'function' ? formatCurrency(item.amount) : '₱ ' + item.amount.toLocaleString());

        rowsHTML += `
            <tr>
                <td><span class="badge ${badgeClass}">${item.type}</span></td>
                <td class="fw-semibold">${item.label}</td>
                <td>${item.source}</td>
                <td>${item.date}</td>
                <td class="text-end fw-bold">${displayAmount}</td>
            </tr>
        `;
    });

    tableBody.innerHTML = rowsHTML;
}

/**
 * Setup Controls (View Switcher, Table Sorting, Export Excel)
 */
function setupDistributionViewSwitcher() {
    const prevBtn = document.getElementById('prevViewBtn');
    const nextBtn = document.getElementById('nextViewBtn');
    const indicator = document.getElementById('viewIndicator');
    const chartContainer = document.getElementById('chartViewContainer');
    const tableContainer = document.getElementById('tableViewContainer');
    const titleEl = document.getElementById('distributionCardTitle');

    if (!prevBtn || !nextBtn) return;

    function updateViewUI() {
        if (currentDistView === 1) {
            chartContainer?.classList.remove('d-none');
            tableContainer?.classList.add('d-none');
            if (titleEl) titleEl.textContent = 'Distribution Percentage';
            if (indicator) indicator.textContent = '1 / 2';
            prevBtn.disabled = true;
            nextBtn.disabled = false;
        } else {
            chartContainer?.classList.add('d-none');
            tableContainer?.classList.remove('d-none');
            if (titleEl) titleEl.textContent = 'Distribution Table View';
            if (indicator) indicator.textContent = '2 / 2';
            prevBtn.disabled = false;
            nextBtn.disabled = true;
        }
    }

    prevBtn.onclick = () => {
        if (currentDistView > 1) {
            currentDistView--;
            updateViewUI();
        }
    };

    nextBtn.onclick = () => {
        if (currentDistView < 2) {
            currentDistView++;
            updateViewUI();
        }
    };

    updateViewUI();
}

function setupTableSorting() {
    const headers = document.querySelectorAll('.sortable-header');
    
    headers.forEach(header => {
        header.onclick = () => {
            const sortKey = header.getAttribute('data-sort');

            if (currentSortColumn === sortKey) {
                isAscending = !isAscending;
            } else {
                currentSortColumn = sortKey;
                isAscending = true;
            }

            headers.forEach(h => {
                const icon = h.querySelector('i');
                if (icon) icon.className = 'fas fa-sort text-muted ms-1';
            });

            const activeIcon = header.querySelector('i');
            if (activeIcon) {
                activeIcon.className = isAscending 
                    ? 'fas fa-sort-up text-primary ms-1' 
                    : 'fas fa-sort-down text-primary ms-1';
            }

            renderSortedTableData();
        };
    });
}

function setupDashboardExcelExport() {
    const exportBtn = document.getElementById('dashExportExcelBtn');
    if (!exportBtn) return;

    exportBtn.onclick = () => {
        if (!currentRawTableData || currentRawTableData.length === 0) {
            if (typeof showModal === 'function') {
                showModal('No Data', 'Wala pang records na pwedeng i-export para sa napiling date range.');
            } else {
                alert('Wala pang records na pwedeng i-export.');
            }
            return;
        }

        if (typeof XLSX === 'undefined') {
            console.error('SheetJS library is missing.');
            return;
        }

        const excelRows = currentRawTableData.map(item => ({
            'Type': item.type,
            'Record / Label': item.label,
            'Source / Description': item.source,
            'Date': item.date,
            'Amount (PHP)': item.amount
        }));

        const worksheet = XLSX.utils.json_to_sheet(excelRows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Distribution Breakdown');

        const max_width = excelRows.reduce((w, r) => Math.max(w, (r['Record / Label'] || '').length), 10);
        worksheet['!cols'] = [
            { wch: 12 },
            { wch: Math.min(max_width, 35) },
            { wch: 25 },
            { wch: 15 },
            { wch: 15 }
        ];

        const filename = `Dashboard_Distribution_${new Date().toISOString().slice(0, 10)}.xlsx`;
        XLSX.writeFile(workbook, filename);
    };
}

function initChartControls() {
    setupDistributionViewSwitcher();
    setupTableSorting();
    setupDashboardExcelExport();
}

document.addEventListener('DOMContentLoaded', () => {
    initChartControls();
});