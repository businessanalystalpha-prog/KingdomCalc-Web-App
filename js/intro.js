document.addEventListener('DOMContentLoaded', () => {
    const getStartedBtn = document.querySelector('.get-started-btn');
    const cardContainer = document.querySelector('.intro-card');

    if (getStartedBtn) {
        getStartedBtn.addEventListener('click', (e) => {
            e.preventDefault();

            // I-mark na nabuksan na ang intro para sa session na ito
            sessionStorage.setItem('hasSeenIntro', 'true');

            if (cardContainer) {
                cardContainer.classList.add('page-exit');
            } else {
                document.body.classList.add('page-exit');
            }

            setTimeout(() => {
                window.location.href = 'index.html';
            }, 350);
        });
    }
});