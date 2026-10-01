document.addEventListener("DOMContentLoaded", () => {
    const reminderFrequency = document.getElementById("reminderSchedule");
    const customReminderGroup = document.getElementById("customReminderGroup");
    const customReminderDateTime = document.getElementById("customReminderDateTime");
    const reminderNote = document.getElementById("reminderNote");
    const saveReminderBtn = document.getElementById("saveReminderBtn");
    
    const activeReminderCard = document.getElementById("activeReminderCard");
    const activeReminderTitle = document.getElementById("activeReminderTitle");
    const activeReminderDetails = document.getElementById("activeReminderDetails");

    let reminderPickerInstance = null;

    // ==========================================
    // MOBILE NOTIFICATION & BADGE HELPERS
    // ==========================================
    
    // I-update ang Red Badge Icon sa Mobile Home Screen
    function updateMobileAppBadge(count) {
        if ('setAppBadge' in navigator) {
            if (count > 0) {
                navigator.setAppBadge(count).catch(err => console.error("Error setting badge:", err));
            } else {
                navigator.clearAppBadge().catch(err => console.error("Error clearing badge:", err));
            }
        }
    }

    // Magpakita ng Notification sa Phone Lock Screen / Dropdown Bar
    async function triggerSystemNotification(title, body) {
        if (!("Notification" in window) || Notification.permission !== "granted") {
            return;
        }

        // Subukan gamitin ang Service Worker Registration para sa Mobile
        if ('serviceWorker' in navigator) {
            try {
                const reg = await navigator.serviceWorker.ready;
                if (reg && reg.showNotification) {
                    await reg.showNotification(title, {
                        body: body,
                        icon: "logo.svg",
                        badge: "logo.svg",
                        vibrate: [200, 100, 200],
                        tag: "giving-reminder",
                        data: { url: "./index.html" }
                    });
                    return;
                }
            } catch (err) {
                console.warn("Service worker notification error, falling back to standard API:", err);
            }
        }

        // Fallback sa standard Web Notification API
        try {
            new Notification(title, {
                body: body,
                icon: "logo.svg"
            });
        } catch (e) {
            console.error("Standard Notification failed:", e);
        }
    }

    function initReminderPicker() {
        if (typeof flatpickr === "undefined" || !customReminderDateTime) return;

        reminderPickerInstance = flatpickr("#customReminderDateTime", {
            enableTime: true,
            dateFormat: "Y-m-d H:i",
            minDate: "today",
            time_24hr: false
        });
    }

    // Function para i-handle ang pagpapakita/pagpapakundisyon ng custom date group
    function handleFrequencyChange(value) {
        const val = (value || "").toLowerCase();

        if (saveReminderBtn) {
            if (!val || val === "") {
                saveReminderBtn.disabled = true;
                saveReminderBtn.style.opacity = "0.6";
                saveReminderBtn.style.cursor = "not-allowed";
            } else {
                saveReminderBtn.disabled = false;
                saveReminderBtn.style.opacity = "1";
                saveReminderBtn.style.cursor = "pointer";
            }
        }

        if (val === "custom") {
            if (customReminderGroup) customReminderGroup.style.display = "block";
            if (!reminderPickerInstance) initReminderPicker();
        } else {
            if (customReminderGroup) customReminderGroup.style.display = "none";
        }
    }

    if (reminderFrequency) {
        reminderFrequency.addEventListener("change", () => {
            handleFrequencyChange(reminderFrequency.value);
        });
    }

    // Event listener para sa custom dropdown options para siguradong sumalo sa click
    const reminderWrapper = document.getElementById("reminderScheduleWrapper");
    if (reminderWrapper) {
        const options = reminderWrapper.querySelectorAll(".custom-option");
        options.forEach(option => {
            option.addEventListener("click", () => {
                const val = option.getAttribute("data-value");
                handleFrequencyChange(val);
            });
        });
    }

    // Schedule calculation function
    function calculateNextTrigger(frequency, customDateTime) {
        const now = new Date();
        const freq = (frequency || "").toLowerCase();

        if (freq === "custom" && customDateTime) {
            return new Date(customDateTime);
        }

        if (freq === "weekly") {
            const nextSunday = new Date();
            nextSunday.setDate(now.getDate() + ((7 - now.getDay()) % 7 || 7));
            nextSunday.setHours(9, 0, 0, 0);
            return nextSunday;
        }

        if (freq === "semi-monthly") {
            const day = now.getDate();
            const target = new Date();
            target.setHours(9, 0, 0, 0);

            if (day < 15) {
                target.setDate(15);
            } else if (day < 30) {
                target.setDate(30);
            } else {
                target.setMonth(target.getMonth() + 1);
                target.setDate(15);
            }
            return target;
        }

        if (freq === "monthly") {
            const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 9, 0, 0);
            return nextMonth;
        }

        return null;
    }

    function renderActiveStatus(savedData) {
        const freq = (savedData?.frequency || "").toLowerCase();

        if (!savedData || freq === "none" || freq === "" || !activeReminderCard) {
            if (activeReminderCard) activeReminderCard.style.display = "none";
            updateMobileAppBadge(0); // I-clear ang Badge sa Mobile Icon
            return;
        }

        const nextDate = calculateNextTrigger(savedData.frequency, savedData.customDateTime);
        const formattedDate = nextDate ? nextDate.toLocaleString('en-US', { 
            dateStyle: 'medium', 
            timeStyle: 'short' 
        }) : "N/A";

        const scheduleTitles = {
            weekly: "Weekly Giving Schedule",
            "semi-monthly": "Bi-Weekly Giving Schedule",
            monthly: "Monthly Giving Schedule",
            custom: "Custom Date Schedule"
        };

        activeReminderCard.style.display = "block";
        if (activeReminderTitle) {
            activeReminderTitle.textContent = scheduleTitles[freq] || "Giving Reminder";
        }

        if (activeReminderDetails) {
            activeReminderDetails.innerHTML = `
                <p><strong>Frequency:</strong> ${savedData.frequency.toUpperCase()}</p>
                <p><strong>Note:</strong> ${savedData.note || "No note added"}</p>
                <p style="color: #0f766e; font-weight: bold; margin-top: 8px;">
                    <i class="fa-solid fa-calendar-check"></i> Next Scheduled Reminder: <br>
                    <span>${formattedDate}</span>
                </p>
            `;
        }
    }

    function loadSavedReminder() {
        try {
            const saved = JSON.parse(localStorage.getItem("titheReminderConfig") || "{}");
            if (saved.frequency && reminderFrequency) {
                reminderFrequency.value = saved.frequency;
                
                handleFrequencyChange(saved.frequency);
                if (saved.frequency.toLowerCase() === "custom") {
                    initReminderPicker();
                    if (reminderPickerInstance && saved.customDateTime) {
                        reminderPickerInstance.setDate(saved.customDateTime);
                    }
                }

                if (reminderNote && saved.note) {
                    reminderNote.value = saved.note;
                }

                renderActiveStatus(saved);
            }
        } catch (e) {
            console.error("Failed to load reminder settings:", e);
        }
    }

    // Save Reminder Logic
    if (saveReminderBtn) {
        saveReminderBtn.addEventListener("click", async () => {
            const frequency = reminderFrequency ? reminderFrequency.value : "";
            const customDateTime = customReminderDateTime ? customReminderDateTime.value : "";
            const note = reminderNote ? reminderNote.value.trim() : "";
            const freqLower = frequency.toLowerCase();

            if (!frequency || frequency === "") {
                if (typeof showModal === "function") {
                    await showModal({
                        title: "Validation Error",
                        message: "Please select a valid reminder schedule.",
                        type: "warning"
                    });
                }
                return;
            }

            if (freqLower === "custom" && !customDateTime) {
                if (typeof showModal === "function") {
                    await showModal({
                        title: "Validation Error",
                        message: "Please select a custom date and time for the reminder.",
                        type: "warning"
                    });
                }
                return;
            }

            const originalBtnHTML = saveReminderBtn.innerHTML;
            saveReminderBtn.disabled = true;
            saveReminderBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Saving...`;

            // Hilingin ang Mobile System Notification Permission
            if (freqLower !== "none" && "Notification" in window && Notification.permission !== "granted") {
                await Notification.requestPermission();
            }

            setTimeout(async () => {
                const reminderData = {
                    frequency: frequency,
                    customDateTime: customDateTime,
                    note: note,
                    updatedAt: new Date().toISOString(),
                    lastTriggeredAt: null // I-reset kapag may bagong schedule
                };

                localStorage.setItem("titheReminderConfig", JSON.stringify(reminderData));
                renderActiveStatus(reminderData);

                saveReminderBtn.disabled = false;
                saveReminderBtn.innerHTML = originalBtnHTML;

                const successMessage = freqLower === "none"
                    ? "Reminders have been disabled."
                    : "Your giving reminder schedule has been successfully updated!";

                if (typeof showModal === "function") {
                    await showModal({
                        title: "Reminder Saved",
                        message: successMessage,
                        type: "info"
                    });
                }
            }, 600);
        });
    }

    // Delete Reminder Event Listener
    document.addEventListener("click", async (e) => {
        const deleteBtn = e.target.closest("#deleteReminderBtn");
        
        if (deleteBtn) {
            e.preventDefault();

            if (typeof showModal === "function") {
                const confirmed = await showModal({
                    title: "Delete Reminder",
                    message: "Are you sure you want to delete this active reminder schedule?",
                    type: "confirm"
                });

                if (!confirmed) return;
            }

            localStorage.removeItem("titheReminderConfig");
            updateMobileAppBadge(0); // Clear badge

            if (reminderFrequency) reminderFrequency.value = "";
            if (reminderNote) reminderNote.value = "";
            if (customReminderDateTime) customReminderDateTime.value = "";
            if (customReminderGroup) customReminderGroup.style.display = "none";

            if (activeReminderCard) activeReminderCard.style.display = "none";

            if (typeof showModal === "function") {
                await showModal({
                    title: "Reminder Deleted",
                    message: "The active reminder schedule has been removed.",
                    type: "info"
                });
            }
        }
    });

    // Initial Load
    loadSavedReminder();

    // ==========================================
    // AUTOMATIC REMINDER CHECKER LOOP
    // ==========================================
    async function checkAndTriggerReminder() {
        try {
            const saved = JSON.parse(localStorage.getItem("titheReminderConfig") || "{}");
            if (!saved || !saved.frequency || saved.frequency === "none") {
                updateMobileAppBadge(0);
                return;
            }

            const nextTrigger = calculateNextTrigger(saved.frequency, saved.customDateTime);
            if (!nextTrigger) return;

            const now = new Date();

            // Kapag sumapit o lumampas na sa scheduled time (at hindi pa na-trigger)
            if (now >= nextTrigger && !saved.lastTriggeredAt) {
                
                // 1. I-set ang Red Badge sa Mobile App Icon
                updateMobileAppBadge(1);

                // 2. Magpakita ng System Mobile Notification
                await triggerSystemNotification(
                    "Tithes & Investments Reminder", 
                    saved.note || "It's time for your scheduled giving reminder!"
                );

                // 3. Magpakita ng In-App Modal Alert
                if (typeof showModal === "function") {
                    showModal({
                        title: "Giving Reminder!",
                        message: saved.note || "It's time for your scheduled giving reminder!",
                        type: "info"
                    });
                }

                // 4. Markahan na na-trigger na para hindi mag-loop
                saved.lastTriggeredAt = now.toISOString();
                localStorage.setItem("titheReminderConfig", JSON.stringify(saved));
            }
        } catch (e) {
            console.error("Error checking reminder trigger:", e);
        }
    }

    // Patakbuhin ang checker bawat 10 segundo
    setInterval(checkAndTriggerReminder, 10000);
    
    // I-run din agad pagka-load ng page
    checkAndTriggerReminder();
});