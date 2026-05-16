// PIX Integration - Mercado Pago + Netlify Functions
const PIX_API_URL = '/api/pix';

function gerarPix(prestadorId, nome, email) {
    return fetch(PIX_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'gerar_pix',
            prestador_id: prestadorId,
            nome: nome,
            email: email
        })
    }).then(r => r.json());
}

function consultarPix(paymentId) {
    return fetch(PIX_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'consultar',
            payment_id: paymentId
        })
    }).then(r => r.json());
}

function formatarPix(pixData) {
    const overlay = document.createElement('div');
    overlay.className = 'pix-overlay';
    overlay.innerHTML = `
        <div class="pix-modal">
            <button class="pix-close" onclick="this.closest('.pix-overlay').remove()">&times;</button>
            <h3><i class="fas fa-qrcode" style="color:#f39c12;"></i> Pagamento PIX</h3>
            <p style="color:#666;margin-bottom:20px;">Escaneie o QR Code abaixo para pagar <strong>R$ 10,00</strong></p>
            <div class="pix-qr-wrapper">
                <img src="data:image/png;base64,${pixData.qr_code_base64}" alt="QR Code PIX" class="pix-qr">
            </div>
            <p style="font-size:13px;color:#999;margin:16px 0 8px;">Ou copie o código PIX:</p>
            <div class="pix-copy-area">
                <code class="pix-code">${pixData.qr_code}</code>
                <button class="btn btn-primary btn-sm" onclick="copiarPix(this)" style="font-size:13px;padding:8px 16px;">Copiar</button>
            </div>
            <div class="pix-status" id="pix-status-${pixData.payment_id}">
                <i class="fas fa-spinner fa-spin"></i> Aguardando pagamento...
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    // Polling de 3 em 3 segundos
    const interval = setInterval(async () => {
        try {
            const status = await consultarPix(pixData.payment_id);
            const statusEl = document.getElementById(`pix-status-${pixData.payment_id}`);
            if (statusEl) {
                if (status.status === 'approved') {
                    statusEl.innerHTML = '<i class="fas fa-check-circle" style="color:#27ae60;"></i> Pagamento confirmado! Cadastro liberado!';
                    statusEl.style.color = '#27ae60';
                    clearInterval(interval);
                    setTimeout(() => {
                        const closeBtn = overlay.querySelector('.pix-close');
                        if (closeBtn) closeBtn.click();
                    }, 3000);
                } else if (status.status === 'rejected') {
                    statusEl.innerHTML = '<i class="fas fa-times-circle" style="color:#e74c3c;"></i> Pagamento rejeitado';
                    statusEl.style.color = '#e74c3c';
                    clearInterval(interval);
                }
            }
        } catch (err) {
            // silently retry on next interval
        }
    }, 3000);
}

function copiarPix(btn) {
    const code = btn.closest('.pix-copy-area').querySelector('.pix-code').textContent;
    navigator.clipboard.writeText(code).then(() => {
        btn.textContent = 'Copiado!';
        setTimeout(() => { btn.textContent = 'Copiar'; }, 2000);
    }).catch(() => {
        const ta = document.createElement('textarea');
        ta.value = code;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        btn.textContent = 'Copiado!';
        setTimeout(() => { btn.textContent = 'Copiar'; }, 2000);
    });
}
