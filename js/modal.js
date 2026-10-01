function showModal({ title, message, type = "info" }) {
    return new Promise((resolve) => {
        const modal = document.getElementById("customModal");
        const modalTitle = document.getElementById("modalTitle");
        const modalMessage = document.getElementById("modalMessage");
        const modalIcon = document.getElementById("modalIcon");
        const modalConfirmBtn = document.getElementById("modalConfirmBtn");
        const modalCancelBtn = document.getElementById("modalCancelBtn");

        if (!modal) {
            resolve(confirm(`${title}\n\n${message}`));
            return;
        }

        if (modalTitle) modalTitle.textContent = title || "Notification";
        if (modalMessage) modalMessage.textContent = message || "";

        if (modalIcon) {
            modalIcon.className = "fa-solid";
            if (type === "warning" || type === "confirm") {
                modalIcon.classList.add("fa-triangle-exclamation");
                modalIcon.style.color = "#eab308";
            } else if (type === "danger") {
                modalIcon.classList.add("fa-circle-xmark");
                modalIcon.style.color = "#ef4444";
            } else {
                modalIcon.classList.add("fa-circle-info");
                modalIcon.style.color = "#0f766e";
            }
        }

        if (modalCancelBtn) {
            modalCancelBtn.style.display = (type === "confirm" || type === "warning") ? "inline-block" : "none";
        }

        modal.classList.add("active");

        function cleanup() {
            modal.classList.remove("active");
            if (modalConfirmBtn) modalConfirmBtn.removeEventListener("click", onConfirm);
            if (modalCancelBtn) modalCancelBtn.removeEventListener("click", onCancel);
        }

        function onConfirm() {
            cleanup();
            resolve(true);
        }

        function onCancel() {
            cleanup();
            resolve(false);
        }

        if (modalConfirmBtn) modalConfirmBtn.addEventListener("click", onConfirm);
        if (modalCancelBtn) modalCancelBtn.addEventListener("click", onCancel);
    });
}

window.showModal = showModal;
