(function(roiApp) {

    'use strict';

    const snapShotEl = document.getElementById('roi-form');
    const form = document.getElementById('mail-results');
    const submitButton = form.querySelector('button');
    const nameInput = form.querySelector('input[name=name]');
    const emailInput = form.querySelector('input[name=email]');
    const successEl = form.querySelector('.mail-success');
    const errorEl = form.querySelector('.mail-error');
    const buttonText = submitButton.innerText;

    function setError(message) {
        errorEl.innerText = message;
        errorEl.classList.remove('uk-hidden');
    }
    function setSuccess(message) {
        successEl.innerText = message;
        successEl.classList.remove('uk-hidden');
    }
    function resetMessages() {
        errorEl.classList.add('uk-hidden');
        successEl.classList.add('uk-hidden');
    }

    function setProcessing() {
        submitButton.innerText = 'Bezig met verzenden...';
        submitButton.setAttribute('disabled', 'disabled');
    }

    function resetProcessing() {
        submitButton.innerText = buttonText;
        submitButton.removeAttribute('disabled');
    }

    async function ensureResultsAreSet() {
        return new Promise((resolve) => {
            if (!roiApp || roiApp.resultsAreSet()) {
                return resolve();
            }
            roiApp.showResult();
            //wait for animation
            setTimeout(resolve, 1000);
        });
    }

    async function sendToServer(data) {
        //todo actually send somewhere
        return new Promise((resolve) => {
            setTimeout(() => resolve(data), 1000);
        });
    }

    async function createSnapshot() {
        const canvas = await html2canvas(snapShotEl, {
            windowWidth: '900px',
            onclone: copy => {
                console.log(copy);
                Array.from(copy.getElementsByTagName('button'))
                    .forEach(button => button.remove());
                copy.querySelector('#mail-results').remove();
            },
        });
        return canvas.toDataURL('image/jpeg', 1.0);
    }

    form.addEventListener('submit', async e => {
        e.preventDefault();
        setProcessing()
        resetMessages();
        const data = {
            name: nameInput.value,
            email: emailInput.value,
        };
        if (!data.name || !data.email) {
            setError('Naam en e-mailadres zijn verplicht!')
        }
        try {
            await ensureResultsAreSet();
            await sendToServer({
                ...data,
                dataUrl: await createSnapshot(),
            });
            setSuccess('E-mail succesvol verzonden.');
        } catch (e) {
            setError('Fout bij verzenden e-mail: ' + (e.message || e));
        } finally {
            resetProcessing()
        }
    });
})(roiApp);
