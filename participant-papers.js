(() => {
    'use strict';

    const form = document.getElementById('participant-form');
    const password = document.getElementById('participant-password');
    const button = form.querySelector('button');
    const status = document.getElementById('participant-status');
    const download = document.getElementById('participant-download');

    const messages = document.documentElement.lang === 'ja' ? {
        unsupported: '論文集を開くには、暗号化に対応したブラウザーで HTTPS のページを開いてください。',
        waiting: '論文集を読み込んでいます…',
        unavailable: '論文集を読み込めませんでした。しばらくしてからもう一度お試しください。',
        incorrect: 'ロックを解除できませんでした。パスワードを確認してください。',
        ready: 'ロックを解除しました。以下のリンクから ZIP ファイルをダウンロードできます。'
    } : {
        unsupported: 'Open this page over HTTPS in a browser that supports Web Crypto.',
        waiting: 'Loading the papers…',
        unavailable: 'The archive could not be loaded. Please try again later.',
        incorrect: 'The archive could not be unlocked. Please check the password.',
        ready: 'The archive is ready. Use the link below to download the ZIP file.'
    };

    if (!window.crypto || !window.crypto.subtle) {
        status.textContent = messages.unsupported;
        return;
    }

    form.hidden = false;
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (button.disabled) return;
        button.disabled = true;
        const passwordBytes = new TextEncoder().encode(password.value);
        password.value = '';
        status.textContent = messages.waiting;

        try {
            const response = await fetch('participant-papers.enc');
            if (!response.ok) throw new Error('Archive unavailable');
            const envelope = new Uint8Array(await response.arrayBuffer());
            // The envelope contains a 16-byte salt, a 12-byte IV, then AES-GCM ciphertext and tag.
            if (envelope.length <= 44) throw new Error('Incomplete archive');
            const material = await crypto.subtle.importKey('raw', passwordBytes, 'PBKDF2', false, ['deriveKey']);
            const key = await crypto.subtle.deriveKey(
                {name: 'PBKDF2', hash: 'SHA-256', salt: envelope.subarray(0, 16), iterations: 600000},
                material, {name: 'AES-GCM', length: 256}, false, ['decrypt']
            );
            let zip;
            try {
                zip = await crypto.subtle.decrypt({name: 'AES-GCM', iv: envelope.subarray(16, 28)}, key, envelope.subarray(28));
            } catch {
                status.textContent = messages.incorrect;
                password.focus();
                return;
            }
            download.href = URL.createObjectURL(new Blob([zip], {type: 'application/zip'}));
            form.hidden = true;
            download.hidden = false;
            status.textContent = messages.ready;
            download.focus();
        } catch {
            status.textContent = messages.unavailable;
        } finally {
            passwordBytes.fill(0);
            button.disabled = false;
        }
    });

    window.addEventListener('pagehide', () => {
        if (download.hasAttribute('href')) URL.revokeObjectURL(download.href);
        download.removeAttribute('href');
        download.hidden = true;
        form.hidden = false;
        password.value = '';
        status.textContent = '';
    });
})();
