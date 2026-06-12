// Casa Certa - App JavaScript
const SUPABASE_URL = 'https://ilidhyepptxscjjdxjxy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsaWRoeWVwcHR4c2NqamR4anh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2NjY0MDAsImV4cCI6MjA2NTI0MjQwMH0.example_key';

// Auth state
let currentUser = null;
let authToken = localStorage.getItem('authToken');

// Initialize
function init() {
    checkAuth();
    setupEventListeners();
}

// Check if user is logged in
async function checkAuth() {
    if (authToken) {
        try {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/users?select=*&id=eq.${getUserIdFromToken()}`, {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${authToken}`
                }
            });
            const users = await response.json();
            if (users.length > 0) {
                currentUser = users[0];
                updateUIForAuth();
            }
        } catch (error) {
            console.error('Auth check failed:', error);
        }
    }
}

function getUserIdFromToken() {
    try {
        const payload = JSON.parse(atob(authToken.split('.')[1]));
        return payload.sub;
    } catch {
        return null;
    }
}

function updateUIForAuth() {
    const navLinks = document.querySelector('.nav-links');
    if (navLinks && currentUser) {
        navLinks.innerHTML = `
            <a href="imoveis.html">Imóveis</a>
            <a href="dashboard.html">Dashboard</a>
            <a href="#" onclick="logout()">Sair</a>
        `;
    }
}

function setupEventListeners() {
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Register form
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }

    // User type selector
    const userTypeOptions = document.querySelectorAll('.user-type-option');
    userTypeOptions.forEach(option => {
        option.addEventListener('click', () => {
            userTypeOptions.forEach(o => o.classList.remove('active'));
            option.classList.add('active');
            const input = document.getElementById('userType');
            if (input) input.value = option.dataset.type;
        });
    });
}

// Login handler
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('error');

    try {
        // Query user from Supabase
        const response = await fetch(`${SUPABASE_URL}/rest/v1/users?select=*&email=eq.${encodeURIComponent(email)}`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });

        const users = await response.json();

        if (users.length === 0) {
            showError(errorDiv, 'Email não encontrado');
            return;
        }

        const user = users[0];

        // Simple password check (in production, use bcrypt)
        if (password !== user.password) {
            showError(errorDiv, 'Palavra-passe incorreta');
            return;
        }

        // Generate simple token
        const token = btoa(JSON.stringify({ sub: user.id, email: user.email }));
        localStorage.setItem('authToken', token);
        localStorage.setItem('user', JSON.stringify(user));

        window.location.href = 'dashboard.html';
    } catch (error) {
        showError(errorDiv, 'Erro de conexão. Tente novamente.');
        console.error('Login error:', error);
    }
}

// Register handler
async function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const userType = document.getElementById('userType').value || 'inquilino';
    const errorDiv = document.getElementById('error');

    if (password !== confirmPassword) {
        showError(errorDiv, 'As palavras-passe não coincidem');
        return;
    }

    if (password.length < 6) {
        showError(errorDiv, 'Palavra-passe deve ter pelo menos 6 caracteres');
        return;
    }

    try {
        // Check if email exists
        const checkResponse = await fetch(`${SUPABASE_URL}/rest/v1/users?select=id&email=eq.${encodeURIComponent(email)}`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });

        const existing = await checkResponse.json();
        if (existing.length > 0) {
            showError(errorDiv, 'Email já registado');
            return;
        }

        // Create user
        const createResponse = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                email,
                password,
                name,
                phone: phone || null,
                user_type: userType,
                role: 'user'
            })
        });

        if (!createResponse.ok) {
            throw new Error('Failed to create user');
        }

        const newUser = await createResponse.json();

        // Auto login
        const token = btoa(JSON.stringify({ sub: newUser[0].id, email: newUser[0].email }));
        localStorage.setItem('authToken', token);
        localStorage.setItem('user', JSON.stringify(newUser[0]));

        window.location.href = 'dashboard.html';
    } catch (error) {
        showError(errorDiv, 'Erro ao criar conta. Tente novamente.');
        console.error('Register error:', error);
    }
}

// Logout
function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    currentUser = null;
    window.location.href = 'index.html';
}

// Show error
function showError(element, message) {
    if (element) {
        element.textContent = message;
        element.style.display = 'block';
    }
}

// Format price
function formatPrice(price) {
    return new Intl.NumberFormat('pt-AO', {
        style: 'currency',
        currency: 'AOA',
        minimumFractionDigits: 0
    }).format(price).replace('AOA', 'Kz');
}

// Load properties
async function loadProperties() {
    const container = document.getElementById('propertiesGrid');
    if (!container) return;

    container.innerHTML = '<div class="loading"><div class="loading-spinner"></div><p>A carregar imóveis...</p></div>';

    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/properties?select=*,users(name)&status=eq.ativo&order=created_at.desc`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });

        const properties = await response.json();

        if (properties.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📍</div>
                    <h3>Nenhum imóvel encontrado</h3>
                    <p>Seja o primeiro a anunciar!</p>
                    <a href="registar.html" class="btn-primary">Anunciar Imóvel</a>
                </div>
            `;
            return;
        }

        container.innerHTML = properties.map(p => `
            <a href="imovel.html?id=${p.id}" class="property-card">
                <div class="property-image">
                    ${p.photos && p.photos.length > 0 ? '🏠' : '🏠'}
                    <span class="property-badge ${p.type === 'arrendamento' ? 'rent' : 'sale'}">
                        ${p.type === 'arrendamento' ? 'Arrendamento' : 'Venda'}
                    </span>
                    <span class="property-price">${formatPrice(p.price)}</span>
                </div>
                <div class="property-info">
                    <h3>${p.title}</h3>
                    <p class="property-location">📍 ${p.municipality}, ${p.province}</p>
                    <div class="property-details">
                        ${p.bedrooms ? `<span>🛏️ ${p.bedrooms} Quartos</span>` : ''}
                        ${p.bathrooms ? `<span>🚿 ${p.bathrooms} WC</span>` : ''}
                        ${p.area ? `<span>📐 ${p.area} m²</span>` : ''}
                    </div>
                </div>
            </a>
        `).join('');
    } catch (error) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚠️</div>
                <h3>Erro ao carregar imóveis</h3>
                <p>Tente novamente mais tarde.</p>
            </div>
        `;
        console.error('Load properties error:', error);
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', init);
