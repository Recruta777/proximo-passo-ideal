


// Header shadow on scroll
const header = document.querySelector('.header');
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        header.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.15)';
    } else {
        header.style.boxShadow = 'none';
    }
});

// Notification sound via Web Audio API
function playNotificationSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.setValueAtTime(1000, ctx.currentTime + 0.1);
        osc.frequency.setValueAtTime(1200, ctx.currentTime + 0.2);

        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
    } catch (e) {
        // Audio not supported
    }
}

let _audioCtx;
function playCongratsSound() {
    try {
        if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (_audioCtx.state === 'suspended') _audioCtx.resume();
        const t = _audioCtx.currentTime;
        [660, 880].forEach((freq, i) => {
            const osc = _audioCtx.createOscillator();
            const gain = _audioCtx.createGain();
            osc.type = 'sine';
            osc.connect(gain);
            gain.connect(_audioCtx.destination);
            const start = t + i * 0.12;
            osc.frequency.setValueAtTime(freq, start);
            gain.gain.setValueAtTime(0.4, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.15);
            osc.start(start);
            osc.stop(start + 0.15);
        });
    } catch (e) {}
}

// Update admin badge with provider count
function updateAdminBadge() {
    const badge = document.getElementById('nav-badge');
    if (!badge) return;
    try {
        const data = localStorage.getItem('proximopasso_prestadores');
        if (data) {
            const count = JSON.parse(data).length;
            if (count > 0) {
                badge.textContent = count;
                badge.style.display = 'inline-flex';
            } else {
                badge.style.display = 'none';
            }
        }
    } catch(e) {}
}

// Toast notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    if (type === 'success') playNotificationSound();
    setTimeout(() => {
        toast.classList.remove('show');
    }, 5000);
}

// Storage key for client requests
const SOLICITACOES_KEY = 'proximopasso_solicitacoes';

function getSolicitacoes() {
    return JSON.parse(localStorage.getItem(SOLICITACOES_KEY) || '[]');
}

function saveSolicitacoes(data) {
    localStorage.setItem(SOLICITACOES_KEY, JSON.stringify(data));
    updateSolicitacaoBadge();
}

function updateSolicitacaoBadge() {
    const badge = document.getElementById('sol-badge');
    if (!badge) return;
    try {
        const count = getSolicitacoes().length;
        badge.textContent = count;
        badge.style.display = count > 0 ? 'inline-flex' : 'none';
    } catch(e) {}
}

// Form submission
const form = document.getElementById('contact-form');
if (form) {
form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const nome = document.getElementById('nome').value.trim();
    const telefone = document.getElementById('telefone').value.trim();
    const servico = document.getElementById('servico').value;
    const descricao = document.getElementById('descricao').value.trim();
    const email = document.getElementById('email').value.trim();

    if (!nome || !telefone || !servico || !descricao || !email) {
        showToast('Preencha todos os campos obrigatórios.', 'error');
        return;
    }

    playCongratsSound();

    const btn = form.querySelector('button[type="submit"]');
    const btnHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-check-circle"></i> Orçamento Enviado';
    btn.style.background = '#27ae60';
    btn.style.borderColor = '#27ae60';

    // Save to localStorage
    const solicitacoes = getSolicitacoes();
    const novaSolic = {
        id: Date.now().toString(),
        nome,
        telefone,
        email,
        servico,
        descricao,
        data: new Date().toLocaleString('pt-BR'),
        lida: false
    };
    solicitacoes.push(novaSolic);
    saveSolicitacoes(solicitacoes);

    // Save to API (banco de dados) com retry
    for (let tentativa = 0; tentativa < 3; tentativa++) {
        try {
            const resp = await fetch('/api/dados', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'salvar',
                    tipo: 'clientes',
                    dados: novaSolic
                })
            });
            if (resp.ok) break;
        } catch(e) {
            if (tentativa === 2) console.warn('API indisponível após 3 tentativas');
        }
    }

    const message = `Olá! Gostaria de solicitar um orçamento.\n\n` +
        `*Nome:* ${nome}\n` +
        `*Telefone:* ${telefone}\n` +
        `*E-mail:* ${email}\n` +
        `*Serviço:* ${servico}\n` +
        `*Descrição:* ${descricao}`;

    const whatsappNumber = '5519983025082';
    const url = `whatsapp://send?phone=${whatsappNumber}&text=${encodeURIComponent(message)}`;

    setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = btnHtml;
        btn.style.background = '';
        btn.style.borderColor = '';
    }, 3000);
    this.reset();

    setTimeout(() => {
        window.location.href = url;
    }, 1500);
});
}

// Phone mask helper
function applyPhoneMask(input) {
    input.addEventListener('input', function () {
        let value = this.value.replace(/\D/g, '');
        if (value.length > 11) value = value.slice(0, 11);
        if (value.length > 7) {
            this.value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
        } else if (value.length > 2) {
            this.value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
        } else if (value.length > 0) {
            this.value = `(${value}`;
        }
    });
}

// Apply phone masks
const telefoneInputs = document.querySelectorAll('input[type="tel"]');
telefoneInputs.forEach(applyPhoneMask);

// Provider registration form (PAGO via PIX)
const providerForm = document.getElementById('provider-form');
if (providerForm) {
    providerForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const nome = document.getElementById('prov-nome').value.trim();
        const empresa = document.getElementById('prov-empresa').value.trim();
        const telefone = document.getElementById('prov-telefone').value.trim();
        const servico = document.getElementById('prov-servico').value;
        const cidade = document.getElementById('prov-cidade').value;
        const descricao = document.getElementById('prov-descricao').value.trim();

        if (!nome || !empresa || !telefone || !servico || !cidade || !descricao) {
            showToast('Preencha todos os campos obrigatórios.', 'error');
            return;
        }

        playCongratsSound();

        const submitBtn = this.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Aguardando...';

        // Cartão de visita
        const cartaoInput = document.getElementById('prov-cartao');
        let cartaoData = null;
        if (cartaoInput && cartaoInput.files[0]) {
            const reader = new FileReader();
            cartaoData = await new Promise(resolve => {
                reader.onload = e => resolve(e.target.result);
                reader.readAsDataURL(cartaoInput.files[0]);
            });
        }

        // Save to localStorage como não pago
        const STORAGE_KEY = 'proximopasso_prestadores';
        const providers = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        const prestadorId = Date.now().toString();
        const novoProv = {
            id: prestadorId,
            nome,
            empresa,
            telefone,
            servico,
            cidade,
            descricao,
            cartao: cartaoData,
            data: new Date().toLocaleDateString('pt-BR'),
            pago: false,
        };
        providers.push(novoProv);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(providers));

        // Gera PIX
        try {
            const pixData = await gerarPix(prestadorId, nome, 'pagamento@proximopassoideal.com.br');
            if (pixData.erro) {
                showToast('Erro ao gerar PIX: ' + pixData.erro, 'error');
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Cadastrar';
                return;
            }

            salvarPagamentoLocal(pixData.payment_id, prestadorId);

            const overlay = document.createElement('div');
            overlay.className = 'pix-overlay';
            overlay.innerHTML = `
                <div class="pix-modal">
                    <button class="pix-close" onclick="this.closest('.pix-overlay').remove(); cancelarCadastro('${prestadorId}')">&times;</button>
                    <h3><i class="fas fa-qrcode" style="color:#f39c12;"></i> Pagamento PIX - R$ 10,00</h3>
                    <p style="color:#666;margin-bottom:20px;">Escaneie o QR Code abaixo para pagar e ativar seu cadastro</p>
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
                            marcarPagoLocal(pixData.payment_id);
                            statusEl.innerHTML = '<i class="fas fa-check-circle" style="color:#27ae60;"></i> Pagamento confirmado! Cadastro liberado!';
                            statusEl.style.color = '#27ae60';
                            clearInterval(interval);

                            // Atualiza para pago no localStorage
                            const provs = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
                            const idx = provs.findIndex(p => p.id === prestadorId);
                            if (idx !== -1) {
                                provs[idx].pago = true;
                                localStorage.setItem(STORAGE_KEY, JSON.stringify(provs));
                                for (let tentativa = 0; tentativa < 3; tentativa++) {
                                    try {
                                        const resp = await fetch('/api/dados', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                action: 'salvar',
                                                tipo: 'prestadores',
                                                dados: provs[idx]
                                            })
                                        });
                                        if (resp.ok) break;
                                    } catch(e) {
                                        if (tentativa === 2) console.warn('API indisponível após 3 tentativas');
                                    }
                                }
                            }

                            updateAdminBadge();

                            // Botão: verde com "Cadastro realizado!" por 5s, depois volta ao normal
                            submitBtn.innerHTML = '<i class="fas fa-check-circle"></i> Cadastro realizado!';
                            submitBtn.style.background = '#27ae60';
                            submitBtn.disabled = false;
                            setTimeout(() => {
                                submitBtn.innerHTML = 'Cadastrar';
                                submitBtn.style.background = '';
                                submitBtn.disabled = false;
                            }, 5000);

                            // Fecha overlay PIX após 1s
                            setTimeout(() => {
                                overlay.querySelector('.pix-close').click();
                            }, 1000);

                            // WhatsApp depois do pagamento
                            setTimeout(() => {
                                const message = `*NOVO PRESTADOR CADASTRADO (PAGO)!*\n\n` +
                                    `*Nome:* ${nome}\n` +
                                    (empresa ? `*Empresa:* ${empresa}\n` : '') +
                                    `*Telefone:* ${telefone}\n` +
                                    `*Serviço:* ${servico}\n` +
                                    `*Cidade:* ${cidade}\n` +
                                    `*Sobre:* ${descricao}\n\n` +
                                    `*PIX R$10:* ✅ CONFIRMADO`;

                                const whatsappNumber = '5519983025082';
                                const url = `whatsapp://send?phone=${whatsappNumber}&text=${encodeURIComponent(message)}`;
                                window.location.href = url;
                            }, 2000);

                        } else if (status.status === 'rejected') {
                            statusEl.innerHTML = '<i class="fas fa-times-circle" style="color:#e74c3c;"></i> Pagamento rejeitado';
                            statusEl.style.color = '#e74c3c';
                            clearInterval(interval);
                        }
                    }
                } catch (err) {}
            }, 3000);

            this.reset();
        } catch (err) {
            showToast('Erro ao processar pagamento. Tente novamente.', 'error');
            cancelarCadastro(prestadorId);
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Cadastrar';
        }
    });
}

function cancelarCadastro(prestadorId) {
    const STORAGE_KEY = 'proximopasso_prestadores';
    const provs = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const filtered = provs.filter(p => p.id !== prestadorId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    updateAdminBadge();
}

function abrirPix(prestadorId, nome) {
    gerarPix(prestadorId, nome, 'pagamento@proximopassoideal.com.br').then(pixData => {
        if (pixData.erro) {
            showToast('Erro ao gerar PIX: ' + pixData.erro, 'error');
            return;
        }
        // Salva pagamento no localStorage para o admin
        salvarPagamentoLocal(pixData.payment_id, prestadorId);
        // Fecha overlay atual e abre o do PIX
        document.querySelector('.pix-overlay').remove();
        formatarPix(pixData);
    }).catch(() => {
        showToast('Serviço PIX indisponível no momento. Envie o comprovante no WhatsApp.', 'error');
    });
}

// === AVALIAÇÕES ===
var REVIEWS_KEY = 'proximopasso_avaliacoes';

function getReviews() {
    return JSON.parse(localStorage.getItem(REVIEWS_KEY) || '[]');
}

function saveReviews(lista) {
    localStorage.setItem(REVIEWS_KEY, JSON.stringify(lista));
    renderReviews();
}

function renderReviews() {
    const container = document.getElementById('reviews-list');
    if (!container) return;
    const lista = getReviews();

    if (lista.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-comments"></i>
                <h3>Nenhuma avaliação ainda</h3>
                <p>Seja o primeiro a compartilhar sua experiência!</p>
            </div>
        `;
        return;
    }

    const labels = { pedreiro: 'Pedreiro', marcenaria: 'Marcenaria', pintura: 'Pintura', refrigeracao: 'Refrigeração', outro: 'Outro', empresa: '⭐ Empresa' };
    function cardHTML(r) {
        return `
            <div class="review-card">
                <div class="review-header">
                    <span class="review-name"><i class="fas fa-user"></i> ${r.nome}</span>
                    <span class="review-stars">
                        ${r.recomendou === 'like' ? '<i class="fas fa-thumbs-up" style="color:#27ae60;margin-right:6px;"></i>' : ''}
                        ${r.recomendou === 'dislike' ? '<i class="fas fa-thumbs-down" style="color:#e74c3c;margin-right:6px;"></i>' : ''}
                        ${'<i class="fas fa-star"></i>'.repeat(r.stars)}${'<i class="far fa-star"></i>'.repeat(5 - r.stars)}
                    </span>
                </div>
                <div class="review-meta">
                    <span class="review-badge badge-${r.servico}">${labels[r.servico] || r.servico}</span>
                    ${r.prestador ? `<i class="fas fa-tools"></i> ${r.prestador} · ` : ''}
                    <i class="fas fa-calendar"></i> ${r.data}
                </div>
                <div class="review-text">${r.descricao}</div>
                ${r.foto ? `<img src="${r.foto}" class="review-foto" alt="Foto da avaliação">` : ''}
            </div>
        `;
    }
    const reversed = [...lista].reverse();
    const primeiras = reversed.slice(0, 2);
    const restantes = reversed.slice(2);

    container.innerHTML = primeiras.map(cardHTML).join('');

    if (restantes.length > 0) {
        let slideIndex = 0;
        const wrapper = document.createElement('div');
        wrapper.className = 'review-carousel';
        wrapper.innerHTML = `
            <div class="review-carousel-track" style="display:none"></div>
            <div class="review-carousel-nav" style="display:none">
                <button class="review-carousel-prev"><i class="fas fa-chevron-left"></i></button>
                <span class="review-carousel-counter"></span>
                <button class="review-carousel-next"><i class="fas fa-chevron-right"></i></button>
            </div>
            <button class="review-carousel-show btn btn-outline btn-sm" style="margin-top:12px;border-color:#ccc;color:#666;"><i class="fas fa-chevron-down"></i> Ver mais avaliações (${restantes.length})</button>
        `;
        container.appendChild(wrapper);

        const track = wrapper.querySelector('.review-carousel-track');
        const counter = wrapper.querySelector('.review-carousel-counter');
        const prevBtn = wrapper.querySelector('.review-carousel-prev');
        const nextBtn = wrapper.querySelector('.review-carousel-next');
        const showBtn = wrapper.querySelector('.review-carousel-show');

        function showSlide(i) {
            slideIndex = i;
            track.innerHTML = cardHTML(restantes[slideIndex]);
            counter.textContent = `${slideIndex + 1} de ${restantes.length}`;
            prevBtn.disabled = slideIndex === 0;
            nextBtn.disabled = slideIndex === restantes.length - 1;
        }

        showBtn.addEventListener('click', () => {
            showBtn.style.display = 'none';
            track.style.display = '';
            wrapper.querySelector('.review-carousel-nav').style.display = 'flex';
            showSlide(0);
        });

        prevBtn.addEventListener('click', () => { if (slideIndex > 0) showSlide(slideIndex - 1); });
        nextBtn.addEventListener('click', () => { if (slideIndex < restantes.length - 1) showSlide(slideIndex + 1); });
    }
}

// Star rating
document.addEventListener('DOMContentLoaded', function() {
    // === Review Stars (avaliação do prestador) ===
    const reviewStarContainer = document.getElementById('star-rating');
    let selectedStar = 0;
    let recomendou = null;

    const formLikeBtn = document.getElementById('form-like-btn');
    const formDislikeBtn = document.getElementById('form-dislike-btn');
    if (formLikeBtn) {
        formLikeBtn.addEventListener('click', () => {
            if (recomendou === 'like') {
                recomendou = null;
                formLikeBtn.classList.remove('active');
            } else {
                recomendou = 'like';
                formLikeBtn.classList.add('active');
                formDislikeBtn.classList.remove('active');
            }
        });
    }
    if (formDislikeBtn) {
        formDislikeBtn.addEventListener('click', () => {
            if (recomendou === 'dislike') {
                recomendou = null;
                formDislikeBtn.classList.remove('active');
            } else {
                recomendou = 'dislike';
                formDislikeBtn.classList.add('active');
                formLikeBtn.classList.remove('active');
            }
        });
    }

    if (reviewStarContainer) {
        const stars = reviewStarContainer.querySelectorAll('i');
        stars.forEach(star => {
            star.addEventListener('click', function() {
                const val = parseInt(this.dataset.star);
                if (val === selectedStar && selectedStar > 0) {
                    selectedStar = val - 1;
                } else {
                    selectedStar = val;
                }
                stars.forEach(s => s.classList.toggle('active', parseInt(s.dataset.star) <= selectedStar));
            });
        });

        // Photo upload
        const fotoInput = document.getElementById('rev-foto');
        let fotoData = null;
        if (fotoInput) {
            const photoLabel = document.querySelector('.form-photo-label');
            fotoInput.addEventListener('change', function() {
                const file = this.files[0];
                if (!file) { fotoData = null; document.getElementById('form-photo-btn').classList.remove('has-photo'); if (photoLabel) photoLabel.textContent = 'Adicione sua foto (opcional)'; return; }
                const reader = new FileReader();
                reader.onload = function(e) {
                    fotoData = e.target.result;
                    document.getElementById('form-photo-btn').classList.add('has-photo');
                    if (photoLabel) photoLabel.textContent = 'Foto adicionada';
                };
                reader.readAsDataURL(file);
            });
        }

        // Review form
        const reviewForm = document.getElementById('review-form');
        if (reviewForm) {
            reviewForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                const nome = document.getElementById('rev-nome').value.trim();
                const servico = document.getElementById('rev-servico').value;
                const prestador = document.getElementById('rev-prestador').value.trim();
                const descricao = document.getElementById('rev-descricao').value.trim();

                if (!nome || !servico || !descricao || selectedStar === 0) {
                    showToast('Preencha todos os campos e dê uma estrela.', 'error');
                    return;
                }

                playCongratsSound();

                const btnRv = reviewForm.querySelector('button[type="submit"]');
                const btnRvHtml = btnRv.innerHTML;
                btnRv.disabled = true;
                btnRv.innerHTML = '<i class="fas fa-check-circle"></i> Avaliação Enviada';
                btnRv.style.background = '#27ae60';
                btnRv.style.borderColor = '#27ae60';

                const reviews = getReviews();
                const novaRev = {
                    id: Date.now().toString(),
                    nome,
                    servico,
                    prestador: prestador || '',
                    stars: selectedStar,
                    descricao,
                    data: new Date().toLocaleDateString('pt-BR'),
                    recomendou,
                    foto: fotoData,
                    likes: 0,
                    dislikes: 0
                };
                reviews.push(novaRev);
                saveReviews(reviews);
                if (novaRev.recomendou) incrementRecCount(novaRev.recomendou);
                updateHeaderRecBadge();
                // Salva no banco
                for (let tentativa = 0; tentativa < 3; tentativa++) {
                    try {
                        const resp = await fetch('/api/dados', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'salvar', tipo: 'avaliacoes', dados: novaRev })
                        });
                        if (resp.ok) break;
                    } catch(e) {
                        if (tentativa === 2) console.warn('API indisponível após 3 tentativas');
                    }
                }
                setTimeout(() => {
                    btnRv.disabled = false;
                    btnRv.innerHTML = btnRvHtml;
                    btnRv.style.background = '';
                    btnRv.style.borderColor = '';
                }, 3000);
                this.reset();
                selectedStar = 0;
                recomendou = null;
                fotoData = null;
                stars.forEach(s => s.classList.remove('active'));
                if (formLikeBtn) formLikeBtn.classList.remove('active');
                if (formDislikeBtn) formDislikeBtn.classList.remove('active');
                document.getElementById('form-photo-btn').classList.remove('has-photo');
            });
        }
    }

    // === Header Recommendation Badge (contagem separada para não sumir ao limpar no admin) ===
    const REC_COUNTS_KEY = 'proximopasso_rec_counts';
    function getRecCounts() {
        return JSON.parse(localStorage.getItem(REC_COUNTS_KEY) || '{"likes":0,"dislikes":0}');
    }
    function saveRecCounts(likes, dislikes) {
        localStorage.setItem(REC_COUNTS_KEY, JSON.stringify({ likes, dislikes }));
    }
    function updateHeaderRecBadge() {
        try {
            const counts = getRecCounts();
            const likeEl = document.getElementById('header-rec-like-count');
            const dislikeEl = document.getElementById('header-rec-dislike-count');
            if (likeEl) likeEl.textContent = counts.likes;
            if (dislikeEl) dislikeEl.textContent = counts.dislikes;
        } catch(e) {}
    }
    // Atualiza os contadores separados sempre que houver avaliações salvas
    function syncRecCountsFromReviews() {
        const lista = getReviews();
        const likes = lista.filter(r => r.recomendou === 'like').length;
        const dislikes = lista.filter(r => r.recomendou === 'dislike').length;
        if (likes > 0 || dislikes > 0) {
            const current = getRecCounts();
            saveRecCounts(Math.max(current.likes, likes), Math.max(current.dislikes, dislikes));
        }
        updateHeaderRecBadge();
    }
    // Ao enviar avaliação, incrementa o contador separado
    function incrementRecCount(tipo) {
        const counts = getRecCounts();
        if (tipo === 'like') counts.likes++;
        if (tipo === 'dislike') counts.dislikes++;
        saveRecCounts(counts.likes, counts.dislikes);
        updateHeaderRecBadge();
    }
    syncRecCountsFromReviews();
    updateHeaderRecBadge();

    renderReviews();

    // Services carousel
    const track = document.querySelector('.services-track');
    const slides = document.querySelectorAll('.services-slide');
    const prevBtn = document.querySelector('.services-prev');
    const nextBtn = document.querySelector('.services-next');
    const dotsContainer = document.querySelector('.services-dots');
    if (track && slides.length && dotsContainer) {
        let currentIndex = 0;
        slides.forEach((_, i) => {
            const dot = document.createElement('button');
            dot.classList.toggle('active', i === 0);
            dot.addEventListener('click', () => goToSlide(i));
            dotsContainer.appendChild(dot);
        });
        function goToSlide(index) {
            currentIndex = index;
            track.style.transform = `translateX(-${index * 100}%)`;
            dotsContainer.querySelectorAll('button').forEach((d, i) => d.classList.toggle('active', i === index));
        }
        if (prevBtn) prevBtn.addEventListener('click', () => goToSlide(currentIndex > 0 ? currentIndex - 1 : slides.length - 1));
        if (nextBtn) nextBtn.addEventListener('click', () => goToSlide(currentIndex < slides.length - 1 ? currentIndex + 1 : 0));
    }

});
