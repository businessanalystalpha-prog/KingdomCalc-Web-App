if (!sessionStorage.getItem('hasSeenIntro')) {
    window.location.href = 'intro.html';
}

document.addEventListener("DOMContentLoaded", () => {
    const navItems = document.querySelectorAll(".nav-item");
    const screens = document.querySelectorAll(".screen");

    function setActiveScreen(targetId) {
        if (!targetId) return;

        navItems.forEach(nav => nav.classList.remove("active"));
        screens.forEach(screen => screen.classList.remove("active-screen"));

        const targetNav = document.querySelector(`.nav-item[data-target="${targetId}"]`);
        const targetScreen = document.getElementById(targetId);
        if (!targetNav || !targetScreen) return;

        targetNav.classList.add("active");
        targetScreen.classList.add("active-screen");

        localStorage.setItem("activeScreen", targetId);

        if (targetId === "historyScreen" && typeof window.renderHistoryScreen === "function") {
            window.renderHistoryScreen(document.getElementById("historySearchInput")?.value || "", true);
        }

        if (targetId === "dashboardScreen") {
            if (typeof window.updateDashboard === "function") {
                window.updateDashboard();
            }
            if (typeof window.setupDashboardAI === "function") {
                window.setupDashboardAI();
            }
        }
    }

    window.setActiveScreen = setActiveScreen;

    navItems.forEach(item => {
        item.addEventListener("click", () => {
            const target = item.getAttribute("data-target");
            if (target === "calcScreen" && typeof window.resetCalculatorForm === "function") {
                window.resetCalculatorForm();
            }
            setActiveScreen(target);
        });
    });

    const validScreens = ["dashboardScreen", "calcScreen", "historyScreen", "reminderScreen", "settingsScreen"];
    let savedScreen = localStorage.getItem("activeScreen");

    if (!validScreens.includes(savedScreen)) {
        savedScreen = "dashboardScreen";
    }

    setActiveScreen(savedScreen);

    // Unang pag-load ng app: Kumuha ng bagong datos mula sa Google Sheet
    if (typeof window.renderHistoryScreen === "function") {
        window.renderHistoryScreen("", true).then(() => {
            if (typeof window.updateDashboard === "function") {
                window.updateDashboard();
            }
        });
    }
});

function setupCustomDropdown(wrapperId, labelId, hiddenInputId) {
    const wrapper = document.getElementById(wrapperId);
    if (!wrapper) return;

    const trigger = wrapper.querySelector(".custom-select-trigger");
    const label = document.getElementById(labelId);
    const options = wrapper.querySelectorAll(".custom-option");
    const hiddenInput = document.getElementById(hiddenInputId);

    trigger.addEventListener("click", (e) => {
        e.stopPropagation();
        document.querySelectorAll(".custom-select-wrapper.open").forEach(w => {
            if (w !== wrapper) w.classList.remove("open");
        });
        wrapper.classList.toggle("open");
    });

    options.forEach(option => {
        option.addEventListener("click", () => {
            const value = option.getAttribute("data-value");
            const text = option.textContent.trim();

            options.forEach(opt => opt.classList.remove("selected"));
            option.classList.add("selected");

            label.textContent = text;
            hiddenInput.value = value;
            wrapper.classList.remove("open");

            hiddenInput.dispatchEvent(new Event("change"));
        });
    });
}

document.addEventListener("DOMContentLoaded", () => {
    setupCustomDropdown("givingTypeWrapper", "givingTypeLabel", "givingType");
    setupCustomDropdown("reminderScheduleWrapper", "reminderScheduleLabel", "reminderSchedule");
    setupCustomDropdown("settingDateModeWrapper", "settingDateModeLabel", "settingDateMode");
    
    document.addEventListener("click", () => {
        document.querySelectorAll(".custom-select-wrapper.open").forEach(w => w.classList.remove("open"));
    });
});