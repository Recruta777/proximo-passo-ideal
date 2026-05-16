// Menu toggle
const menuToggle = document.querySelector('.menu-toggle');
const navList = document.querySelector('.nav-list');

menuToggle.addEventListener('click', () => {
    navList.classList.toggle('active');
});

// Close menu on link click
document.querySelectorAll('.nav-list a').forEach(link => {
    link.addEventListener('click', () => {
        navList.classList.remove('active');
    });
});

// Close menu on scroll
window.addEventListener('scroll', () => {
    navList.classList.remove('active');
});

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
form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const nome = document.getElementById('nome').value.trim();
    const telefone = document.getElementById('telefone').value.trim();
    const servico = document.getElementById('servico').value;
    const descricao = document.getElementById('descricao').value.trim();
    const email = document.getElementById('email').value.trim();

    if (!nome || !telefone || !servico || !descricao) {
        showToast('Preencha todos os campos obrigatórios.', 'error');
        return;
    }

    // Save to localStorage
    const solicitacoes = getSolicitacoes();
    const novaSolic = {
        id: Date.now().toString(),
        nome,
        telefone,
        email: email || 'Não informado',
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
        `*E-mail:* ${email || 'Não informado'}\n` +
        `*Serviço:* ${servico}\n` +
        `*Descrição:* ${descricao}`;

    const whatsappNumber = '5519983025082';
    const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

    showToast('Novo orçamento recebido! Redirecionando para o WhatsApp...');
    this.reset();

    setTimeout(() => {
        window.open(url, '_blank');
    }, 1500);
});

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

// Provider registration form
const providerForm = document.getElementById('provider-form');
if (providerForm) {
    providerForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const nome = document.getElementById('prov-nome').value.trim();
        const telefone = document.getElementById('prov-telefone').value.trim();
        const servico = document.getElementById('prov-servico').value;
        const cidade = document.getElementById('prov-cidade').value.trim();
        const descricao = document.getElementById('prov-descricao').value.trim();

        if (!nome || !telefone || !servico || !cidade || !descricao) {
            showToast('Preencha todos os campos obrigatórios.', 'error');
            return;
        }

        const message = `*NOVO PRESTADOR CADASTRADO!*\n\n` +
            `*Nome:* ${nome}\n` +
            `*Telefone:* ${telefone}\n` +
            `*Serviço:* ${servico}\n` +
            `*Cidade:* ${cidade}\n` +
            `*Sobre:* ${descricao}\n\n` +
            `*PIX R$10:* PENDENTE`;

        const whatsappNumber = '5519983025082';
        const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

        // Save to localStorage
        const STORAGE_KEY = 'proximopasso_prestadores';
        const providers = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        const novoProv = {
            id: Date.now().toString(),
            nome,
            telefone,
            servico,
            cidade,
            descricao,
            data: new Date().toLocaleDateString('pt-BR'),
            pago: false,
        };
        providers.push(novoProv);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(providers));

        // Save to API (banco de dados) com retry
        for (let tentativa = 0; tentativa < 3; tentativa++) {
            try {
                const resp = await fetch('/api/dados', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'salvar',
                        tipo: 'prestadores',
                        dados: novoProv
                    })
                });
                if (resp.ok) break;
            } catch(e) {
                if (tentativa === 2) console.warn('API indisponível após 3 tentativas');
            }
        }

        updateAdminBadge();
        showToast('Cadastro enviado com sucesso!');

        // Mostra opção de pagamento PIX
        const providerId = providers[providers.length - 1].id;
        const providerNome = nome;
        const pixOverlay = document.createElement('div');
        pixOverlay.className = 'pix-overlay';
        const escapedNome = providerNome.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        pixOverlay.innerHTML = `
            <div class="pix-modal">
                <button class="pix-close" onclick="this.closest('.pix-overlay').remove()">&times;</button>
                <h3><i class="fas fa-check-circle" style="color:#27ae60;"></i> Cadastro enviado!</h3>
                <p style="color:#666;margin:16px 0;">Pague <strong>R$ 10,00</strong> via PIX para liberar automaticamente:</p>
                <button class="btn btn-primary btn-full" data-prestador-id="${providerId}" data-prestador-nome="${escapedNome}" style="margin-bottom:10px;">
                    <i class="fas fa-qrcode"></i> Pagar com PIX agora
                </button>
                <button class="btn btn-outline btn-full" onclick="this.closest('.pix-overlay').remove();window.open('${url}','_blank');" style="border-color:#25d366;color:#25d366;">
                    <i class="fab fa-whatsapp"></i> Enviar comprovante no WhatsApp
                </button>
                <p style="font-size:12px;color:#999;margin-top:12px;">Após o pagamento, o cadastro é liberado automaticamente.</p>
            </div>
        `;
        document.body.appendChild(pixOverlay);

        // Attach PIX event via dataset (evita injeção no onclick)
        const pixBtn = pixOverlay.querySelector('[data-prestador-id]');
        if (pixBtn) {
            pixBtn.addEventListener('click', function() {
                abrirPix(this.dataset.prestadorId, this.dataset.prestadorNome);
            });
        }
        this.reset();
    });
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
const REVIEWS_KEY = 'proximopasso_avaliacoes';

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
    container.innerHTML = [...lista].reverse().map(r => `
        <div class="review-card">
            <div class="review-header">
                <span class="review-name"><i class="fas fa-user"></i> ${r.nome}</span>
                <span class="review-stars">${'<i class="fas fa-star"></i>'.repeat(r.stars)}${'<i class="far fa-star"></i>'.repeat(5 - r.stars)}</span>
            </div>
            <div class="review-meta">
                <span class="review-badge badge-${r.servico}">${labels[r.servico] || r.servico}</span>
                ${r.prestador ? `<i class="fas fa-tools"></i> ${r.prestador} · ` : ''}
                <i class="fas fa-calendar"></i> ${r.data}
            </div>
            <div class="review-text">${r.descricao}</div>
        </div>
    `).join('');
}

// Star rating
document.addEventListener('DOMContentLoaded', function() {
    // === Review Stars (avaliação do prestador) ===
    const reviewStarContainer = document.getElementById('star-rating');
    let selectedStar = 0;

    if (reviewStarContainer) {
        const stars = reviewStarContainer.querySelectorAll('i');
        stars.forEach(star => {
            star.addEventListener('click', function() {
                selectedStar = parseInt(this.dataset.star);
                stars.forEach(s => s.classList.toggle('active', parseInt(s.dataset.star) <= selectedStar));
            });
            star.addEventListener('mouseenter', function() {
                const val = parseInt(this.dataset.star);
                stars.forEach(s => s.classList.toggle('active', parseInt(s.dataset.star) <= val));
            });
            reviewStarContainer.addEventListener('mouseleave', function() {
                stars.forEach(s => s.classList.toggle('active', parseInt(s.dataset.star) <= selectedStar));
            });
        });

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

                const reviews = getReviews();
                const novaRev = {
                    id: Date.now().toString(),
                    nome,
                    servico,
                    prestador: prestador || '',
                    stars: selectedStar,
                    descricao,
                    data: new Date().toLocaleDateString('pt-BR')
                };
                reviews.push(novaRev);
                saveReviews(reviews);
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
                showToast('Avaliação enviada com sucesso! Obrigado!');
                this.reset();
                selectedStar = 0;
                stars.forEach(s => s.classList.remove('active'));
            });
        }
    }

    // === Company Rating (avaliação da empresa) ===
    const COMPANY_RATING_KEY = 'proximopasso_company_rating';

    function getCompanyRating() {
        const data = JSON.parse(localStorage.getItem(COMPANY_RATING_KEY) || '{"total":0,"count":0}');
        return data;
    }

    function saveCompanyRating(val) {
        const data = getCompanyRating();
        data.total += val;
        data.count += 1;
        localStorage.setItem(COMPANY_RATING_KEY, JSON.stringify(data));
        updateCompanyRatingDisplay();

        // Salva também na lista de avaliações para aparecer no admin
        const reviews = getReviews();
        const revEmp = {
            id: 'emp_' + Date.now().toString(),
            nome: 'Cliente',
            servico: 'empresa',
            prestador: '',
            stars: val,
            descricao: 'Avaliação da empresa Próximo Passo Ideal',
            data: new Date().toLocaleDateString('pt-BR')
        };
        reviews.push(revEmp);
        saveReviews(reviews);
        try {
            fetch('/api/dados', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'salvar', tipo: 'avaliacoes', dados: revEmp })
            });
        } catch(e) {}

        showToast('Obrigado por avaliar a Próximo Passo Ideal!');
    }

    function updateCompanyRatingDisplay() {
        const scoreEl = document.getElementById('header-company-rating-score');
        if (!scoreEl) return;
        const data = getCompanyRating();
        const avg = data.count > 0 ? (data.total / data.count) : 0;
        scoreEl.textContent = avg.toFixed(1);
    }

    const companyStars = document.getElementById('header-company-stars');
    if (companyStars) {
        const stars = companyStars.querySelectorAll('i');
        let currentVal = 0;

        stars.forEach(star => {
            star.addEventListener('click', function() {
                currentVal = parseInt(this.dataset.val);
                saveCompanyRating(currentVal);
                stars.forEach(s => s.classList.toggle('active', parseInt(s.dataset.val) <= currentVal));
            });
            star.addEventListener('mouseenter', function() {
                const val = parseInt(this.dataset.val);
                stars.forEach(s => s.classList.toggle('active', parseInt(s.dataset.val) <= val));
            });
            companyStars.addEventListener('mouseleave', function() {
                stars.forEach(s => s.classList.toggle('active', parseInt(s.dataset.val) <= currentVal));
            });
        });

        updateCompanyRatingDisplay();
    }

    renderReviews();
});
