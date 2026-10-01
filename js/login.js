document.addEventListener("DOMContentLoaded", () => {
    // 1. Kung hindi pa nakikita ang Intro, ibalik sa intro.html
    if (!sessionStorage.getItem("hasSeenIntro")) {
        window.location.href = "intro.html";
        return;
    }

    const pinInputs = [
        document.getElementById("pin1"),
        document.getElementById("pin2"),
        document.getElementById("pin3"),
        document.getElementById("pin4")
    ];
    const errorMsg = document.getElementById("loginErrorMsg");
    const btnLogin = document.getElementById("btnLogin");
    const loginTitle = document.getElementById("loginTitle");
    const loginSubtitle = document.getElementById("loginSubtitle");

    const isLockEnabled = localStorage.getItem("kingdomCalcLockEnabled") === "true";
    const savedPin = String(localStorage.getItem("kingdomCalcPin") || "").trim();

    // Kung NAKA-OFF ang App Lock pero MAY SAVED PIN NA, rekta na sa Dashboard
    if (!isLockEnabled && savedPin) {
        sessionStorage.setItem("isUnlocked", "true");
        window.location.href = "index.html";
        return;
    }

    // Setup Mode kung wala pang nakagawang PIN sa DEVICE NA ITO
    if (!savedPin) {
        if (loginTitle) loginTitle.textContent = "Create 4-Digit PIN";
        if (loginSubtitle) loginSubtitle.textContent = "Set a passcode to secure your KingdomCalc data.";
    } else {
        if (loginTitle) loginTitle.textContent = "Enter Your PIN";
        if (loginSubtitle) loginSubtitle.textContent = "Enter your 4-digit passcode to continue.";
    }

    function getEnteredPin() {
        return pinInputs.map(i => (i ? String(i.value).trim() : "")).join("");
    }

    function clearInputs() {
        pinInputs.forEach(input => {
            if (input) input.value = "";
        });
        if (pinInputs[0]) {
            pinInputs[0].focus();
        }
    }

    // Auto-focus & Event Listener para sa Mobile & Desktop Keyboards
    pinInputs.forEach((input, idx) => {
        if (!input) return;

        // Siguraduhing 1 digit lang bawat input box sa mobile
        input.addEventListener("input", (e) => {
            const val = e.target.value.replace(/[^0-9]/g, ''); // RegEx: Numbers lang ang tanggapin
            e.target.value = val.slice(-1); // Kuhanin lang ang huling pumasok na digit

            if (e.target.value.length === 1 && idx < 3) {
                pinInputs[idx + 1].focus();
            }

            // Kapag nakumpleto na ang 4 digits, mag-authenticate pagkatapos ng maikling delay para sa mobile render
            if (getEnteredPin().length === 4) {
                setTimeout(() => {
                    handleAuthenticate();
                }, 50);
            }
        });

        input.addEventListener("keydown", (e) => {
            if (e.key === "Backspace" && !e.target.value && idx > 0) {
                pinInputs[idx - 1].focus();
            }
        });
    });

    function handleAuthenticate() {
        const entered = getEnteredPin();

        if (entered.length < 4) {
            if (errorMsg) errorMsg.textContent = "Please enter complete 4 digits.";
            return;
        }

        // Action 1: Mag-save ng Bagong PIN (First Time Setup sa Device na ito)
        if (!savedPin) {
            localStorage.setItem("kingdomCalcPin", entered);
            localStorage.setItem("kingdomCalcLockEnabled", "true");
            sessionStorage.setItem("isUnlocked", "true");
            window.location.href = "index.html";
            return;
        }

        // Action 2: I-verify ang PIN (String Comparison)
        if (entered === savedPin) {
            if (errorMsg) errorMsg.textContent = "";
            sessionStorage.setItem("isUnlocked", "true");
            window.location.href = "index.html";
        } else {
            if (errorMsg) errorMsg.textContent = "Incorrect PIN. Please try again.";
            clearInputs();
        }
    }

    if (btnLogin) {
        btnLogin.addEventListener("click", handleAuthenticate);
    }
});