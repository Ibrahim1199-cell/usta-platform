// =========================================================
// KONFİQURASİYA VƏ QLOBAL DƏYİŞƏNLƏR
// =========================================================
const BASE_URL = "https://usta-platform.onrender.com";
const SUPABASE_URL = "https://jbtazoqcjvrcnnedgxne.supabase.co/rest/v1/";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpidGF6b3FjanZyY25uZWRneG5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ3NDQ4MjMsImV4cCI6MjExMDMyMDgyM30.0dnwuMPvMlRCAdIg6F9NIENmqxJoiyxATwQ3W9tOQ-o";

const CATEGORIES = [
    "Hamısı",
    "Santexnik",
    "Elektrik",
    "Mebel ustası",
    "Kombi/Kondisioner",
    "Təmir-tikinti",
    "Avto usta"
];

let currentUser = null;
let allMasters = [];
let selectedCategory = "Hamısı";
let activeTab = "";
let activeChatOrderId = null;
let chatPollTimer = null;

// =========================================================
// İŞƏ DÜŞMƏ VƏ MODALLARIN BAĞLANMASI (X, KƏNAR KLİK, ESC)
// =========================================================
document.addEventListener("DOMContentLoaded", () => {
    lucide.createIcons();

    // Bütün modallarda qara arxa plana klikləyəndə bağlansın
    document.querySelectorAll(".modal-backdrop").forEach(backdrop => {
        backdrop.addEventListener("click", (e) => {
            if (e.target === backdrop) {
                if (backdrop.id === "chatModal") closeChat();
                else closeModal(backdrop.id);
            }
        });
    });

    // Klaviatura ESC düyməsi ilə bağlanma
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            closeChat();
            document.querySelectorAll(".modal-backdrop").forEach(m => m.classList.add("hidden"));
            closeModal("lightboxModal");
        }
    });

    const saved = localStorage.getItem("usta_user");
    if (saved) {
        currentUser = JSON.parse(saved);
        initDashboard();
    }
});

// =========================================================
// KÖMƏKÇİ FUNKSİYALAR
// =========================================================
function showToast(message, type = "success") {
    const container = document.getElementById("toastContainer");
    const toast = document.createElement("div");

    const styles = {
        success: "bg-slate-900 text-white border-slate-800",
        error: "bg-red-600 text-white border-red-700",
        info: "bg-[#2D5A3C] text-white border-[#22452E]"
    };

    const icons = {
        success: "check-circle-2",
        error: "alert-circle",
        info: "info"
    };

    toast.className = `pointer-events-auto flex items-center gap-3 px-4 py-3.5 rounded-2xl shadow-xl border text-sm font-semibold transition-all duration-300 ${styles[type] || styles.success}`;
    toast.innerHTML = `
        <i data-lucide="${icons[type] || "info"}" class="w-4 h-4 shrink-0"></i>
        <span class="flex-1">${escapeHtml(message)}</span>
    `;

    container.appendChild(toast);
    lucide.createIcons();

    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(-10px)";
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function openModal(id) {
    const el = document.getElementById(id);
    if (el) {
        el.classList.remove("hidden");
        el.style.display = "";
        lucide.createIcons();
    }
}

function closeModal(id) {
    const el = document.getElementById(id);
    if (el) {
        el.classList.add("hidden");
    }
}

function openLightbox(url) {
    document.getElementById("lightboxImage").src = url;
    openModal("lightboxModal");
}

function getAvatarUrl(user) {
    if (user && user.avatarUrl) return user.avatarUrl;
    const name = user && user.fullName ? user.fullName : "Usta";
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=2D5A3C&color=fff&bold=true`;
}

function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function getStatusBadge(status) {
    const map = {
        GOZLEMEDE: { label: "Gözləmədə", cls: "bg-amber-50 text-amber-700 border-amber-200" },
        QEBUL_EDILDI: { label: "Qəbul edildi", cls: "bg-blue-50 text-blue-700 border-blue-200" },
        TAMAMLANDI: { label: "Tamamlandı", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
        IMTINA_EDILDI: { label: "İmtina edildi", cls: "bg-red-50 text-red-700 border-red-200" },
        LEGV_EDILDI: { label: "Ləğv edildi", cls: "bg-slate-100 text-slate-600 border-slate-200" }
    };
    const item = map[status] || { label: status, cls: "bg-slate-100 text-slate-700 border-slate-200" };
    return `<span class="text-xs font-bold px-2.5 py-1 rounded-lg border ${item.cls}">${item.label}</span>`;
}

// =========================================================
// SUPABASE STORAGE ŞƏKİL YÜKLƏMƏ (sb_publishable VƏ anon DƏSTƏYİ)
// =========================================================
async function uploadToSupabase(file) {
    const key = SUPABASE_ANON_KEY.trim();
    if (!key || key.includes("BURAYA_SUPABASE")) {
        throw new Error("app.js faylında SUPABASE_ANON_KEY açarını daxil edin!");
    }
    if (file.size > 5 * 1024 * 1024) {
        throw new Error("Şəklin ölçüsü 5 MB-dan böyük ola bilməz.");
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9.]/g, "_");
    const filePath = `${Date.now()}_${safeName}`;

    // Köhnə eyJ... açarıdırsa Authorization: Bearer göndər, sb_publishable_ açarıdırsa yalnız apikey göndər
    const headers = {
        "apikey": key,
        "Content-Type": file.type || "image/jpeg"
    };
    if (key.startsWith("eyJ")) {
        headers["Authorization"] = `Bearer ${key}`;
    }

    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/usta-images/${filePath}`, {
        method: "POST",
        headers,
        body: file
    });

    if (!res.ok) {
        let detail = "";
        try {
            const errJson = await res.json();
            detail = errJson.message || errJson.error || "";
        } catch (e) { /* ignore */ }
        throw new Error(`Şəkil yüklənmədi (${res.status}): ${detail || "Supabase Storage Policy icazəsini yoxlayın"}`);
    }

    return `${SUPABASE_URL}/storage/v1/object/public/usta-images/${filePath}`;
}

// =========================================================
// AUTH: GİRİŞ VƏ QEYDİYYAT
// =========================================================
function switchAuthMode(mode) {
    const isLogin = mode === "login";
    document.getElementById("loginBox").classList.toggle("hidden", !isLogin);
    document.getElementById("registerBox").classList.toggle("hidden", isLogin);

    const tabLogin = document.getElementById("authTabLogin");
    const tabReg = document.getElementById("authTabRegister");

    if (isLogin) {
        tabLogin.className = "py-2.5 text-sm font-bold rounded-xl bg-white text-slate-900 shadow-sm transition-all";
        tabReg.className = "py-2.5 text-sm font-bold rounded-xl text-slate-500 hover:text-slate-800 transition-all";
    } else {
        tabReg.className = "py-2.5 text-sm font-bold rounded-xl bg-white text-slate-900 shadow-sm transition-all";
        tabLogin.className = "py-2.5 text-sm font-bold rounded-xl text-slate-500 hover:text-slate-800 transition-all";
    }
}

function togglePassword(inputId, btn) {
    const input = document.getElementById(inputId);
    const isPass = input.type === "password";
    input.type = isPass ? "text" : "password";
    btn.innerHTML = `<i data-lucide="${isPass ? "eye-off" : "eye"}" class="w-4 h-4"></i>`;
    lucide.createIcons();
}

function toggleMasterInputs() {
    const role = document.querySelector('input[name="regRole"]:checked').value;
    document.getElementById("masterExtraInputs").classList.toggle("hidden", role !== "USTA");
}

async function handleLogin(e) {
    e.preventDefault();
    const phone = document.getElementById("loginPhone").value.trim();
    const password = document.getElementById("loginPassword").value.trim();
    const btn = document.getElementById("btnLogin");

    btn.disabled = true;
    btn.innerHTML = `<span>Serverə qoşulur...</span>`;

    try {
        const res = await fetch(`${BASE_URL}/api/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone, password })
        });

        if (!res.ok) {
            const msg = await res.text();
            throw new Error(msg || "Telefon nömrəsi və ya şifrə yanlışdır!");
        }

        currentUser = await res.json();
        localStorage.setItem("usta_user", JSON.stringify(currentUser));
        showToast(`Xoş gəldiniz, ${currentUser.fullName}!`, "success");
        initDashboard();
    } catch (err) {
        showToast(err.message, "error");
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<span>Hesaba daxil ol</span><i data-lucide="arrow-right" class="w-4 h-4"></i>`;
        lucide.createIcons();
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const role = document.querySelector('input[name="regRole"]:checked').value;
    const btn = document.getElementById("btnRegister");

    const payload = {
        fullName: document.getElementById("regName").value.trim(),
        phone: document.getElementById("regPhone").value.trim(),
        password: document.getElementById("regPassword").value.trim(),
        city: document.getElementById("regCity").value.trim(),
        role,
        category: role === "USTA" ? document.getElementById("regCategory").value : null,
        experience: role === "USTA" ? parseInt(document.getElementById("regExperience").value || "0", 10) : null,
        about: role === "USTA" ? document.getElementById("regAbout").value.trim() : null
    };

    btn.disabled = true;
    btn.innerText = "Hesab yaradılır...";

    try {
        const res = await fetch(`${BASE_URL}/api/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const msg = await res.text();
            throw new Error(msg || "Qeydiyyat zamanı xəta baş verdi.");
        }

        showToast("Qeydiyyat uğurla tamamlandı! İndi daxil olun.", "success");
        switchAuthMode("login");
        document.getElementById("loginPhone").value = payload.phone;
    } catch (err) {
        showToast(err.message, "error");
    } finally {
        btn.disabled = false;
        btn.innerText = "Hesab yarat";
    }
}

function logout() {
    localStorage.removeItem("usta_user");
    currentUser = null;
    if (chatPollTimer) clearInterval(chatPollTimer);
    document.getElementById("dashboardSection").classList.add("hidden");
    document.getElementById("authSection").classList.remove("hidden");
    showToast("Hesabdan çıxış edildi.", "info");
}

// =========================================================
// DASHBOARD NAVİQASİYASI
// =========================================================
function initDashboard() {
    document.getElementById("authSection").classList.add("hidden");
    document.getElementById("dashboardSection").classList.remove("hidden");

    updateNavbarUser();

    const isMaster = currentUser.role === "USTA";
    const tabs = isMaster
        ? [
              { id: "masterOrders", label: "Sifarişlər", icon: "clipboard-list" },
              { id: "profile", label: "Profil & Portfolio", icon: "user-cog" }
          ]
        : [
              { id: "masters", label: "Ustalar", icon: "search" },
              { id: "customerOrders", label: "Sifarişlərim", icon: "clipboard-list" },
              { id: "profile", label: "Profilim", icon: "user" }
          ];

    document.getElementById("desktopNav").innerHTML = tabs.map(t => `
        <button onclick="switchTab('${t.id}')" data-tab="${t.id}"
            class="nav-btn px-3.5 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition">
            <i data-lucide="${t.icon}" class="w-4 h-4"></i>
            <span>${t.label}</span>
        </button>
    `).join("");

    document.getElementById("mobileNav").innerHTML = tabs.map(t => `
        <button onclick="switchTab('${t.id}')" data-tab="${t.id}"
            class="mobile-nav-btn flex-1 py-1.5 flex flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-bold transition">
            <i data-lucide="${t.icon}" class="w-5 h-5"></i>
            <span>${t.label}</span>
        </button>
    `).join("");

    switchTab(isMaster ? "masterOrders" : "masters");
}

function updateNavbarUser() {
    document.getElementById("navAvatar").src = getAvatarUrl(currentUser);
    document.getElementById("navUserName").innerText = currentUser.fullName;
    document.getElementById("navUserCity").innerText = currentUser.city || "Azərbaycan";
    document.getElementById("rolePill").innerText = currentUser.role === "USTA" ? "Usta Paneli" : "Müştəri";
}

function resetToHome() {
    switchTab(currentUser.role === "USTA" ? "masterOrders" : "masters");
}

function switchTab(tabId) {
    activeTab = tabId;

    document.querySelectorAll(".nav-btn").forEach(btn => {
        const active = btn.dataset.tab === tabId;
        btn.className = active
            ? "nav-btn px-3.5 py-2 rounded-xl text-sm font-bold flex items-center gap-2 bg-[#2D5A3C]/10 text-[#2D5A3C] transition"
            : "nav-btn px-3.5 py-2 rounded-xl text-sm font-bold flex items-center gap-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition";
    });

    document.querySelectorAll(".mobile-nav-btn").forEach(btn => {
        const active = btn.dataset.tab === tabId;
        btn.className = active
            ? "mobile-nav-btn flex-1 py-1.5 flex flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-bold text-[#2D5A3C] bg-[#2D5A3C]/10 transition"
            : "mobile-nav-btn flex-1 py-1.5 flex flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-bold text-slate-400 transition";
    });

    if (tabId === "masters") loadMastersView();
    if (tabId === "customerOrders") loadCustomerOrdersView();
    if (tabId === "masterOrders") loadMasterOrdersView();
    if (tabId === "profile") loadProfileView();
}

// =========================================================
// BÖLMƏ 1: MÜŞTƏRİ ÜÇÜN USTALAR SİYAHISI VƏ AXTARIŞ
// =========================================================
async function loadMastersView() {
    const main = document.getElementById("mainContent");
    main.innerHTML = `
        <div class="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
            <div>
                <h2 class="text-xl sm:text-2xl font-extrabold text-slate-900">Peşəkar usta tapın</h2>
                <p class="text-xs sm:text-sm text-slate-500">Yoxlanılmış ustalar, real müştəri rəyləri və şəffaf qiymətlər.</p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div class="sm:col-span-2 relative">
                    <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2"></i>
                    <input id="masterSearchInput" type="text" oninput="applyMasterFilters()"
                        placeholder="Ad, şəhər və ya xidmət üzrə axtar (məs: Bakı, kombi)..."
                        class="input-field pl-11">
                </div>
                <div>
                    <select id="masterSortSelect" onchange="applyMasterFilters()" class="input-field bg-white font-semibold text-slate-700">
                        <option value="rating">Sırala: Ən yüksək reytinq</option>
                        <option value="experience">Sırala: Ən çox təcrübə</option>
                        <option value="reviews">Sırala: Ən çox rəy</option>
                    </select>
                </div>
            </div>

            <div id="categoryPills" class="flex gap-2 overflow-x-auto pb-1">
                ${CATEGORIES.map(cat => `
                    <button onclick="selectCategory('${cat}')"
                        class="cat-pill ${selectedCategory === cat ? "active" : ""}">
                        ${cat}
                    </button>
                `).join("")}
            </div>
        </div>

        <div id="mastersGrid" class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${renderSkeletonCards(4)}
        </div>
    `;
    lucide.createIcons();

    try {
        const res = await fetch(`${BASE_URL}/api/masters`);
        allMasters = await res.json();
        applyMasterFilters();
    } catch (err) {
        document.getElementById("mastersGrid").innerHTML = `
            <div class="col-span-full bg-white p-8 rounded-3xl border border-slate-200 text-center">
                <p class="text-sm font-bold text-red-600">Ustalar yüklənərkən xəta baş verdi.</p>
            </div>
        `;
    }
}

function selectCategory(cat) {
    selectedCategory = cat;
    document.querySelectorAll(".cat-pill").forEach(btn => {
        btn.classList.toggle("active", btn.innerText.trim() === cat);
    });
    applyMasterFilters();
}

function applyMasterFilters() {
    const query = (document.getElementById("masterSearchInput")?.value || "").toLowerCase().trim();
    const sortBy = document.getElementById("masterSortSelect")?.value || "rating";

    let filtered = allMasters.filter(m => {
        const matchCat = selectedCategory === "Hamısı" || (m.category && m.category.toLowerCase() === selectedCategory.toLowerCase());
        const matchText = !query ||
            (m.fullName && m.fullName.toLowerCase().includes(query)) ||
            (m.city && m.city.toLowerCase().includes(query)) ||
            (m.category && m.category.toLowerCase().includes(query)) ||
            (m.about && m.about.toLowerCase().includes(query));
        return matchCat && matchText;
    });

    filtered.sort((a, b) => {
        if (sortBy === "experience") return (b.experience || 0) - (a.experience || 0);
        if (sortBy === "reviews") return (b.ratingCount || 0) - (a.ratingCount || 0);
        return (b.rating || 0) - (a.rating || 0);
    });

    const grid = document.getElementById("mastersGrid");
    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full bg-white p-10 rounded-3xl border border-slate-200 text-center space-y-2">
                <i data-lucide="search-x" class="w-10 h-10 text-slate-300 mx-auto"></i>
                <p class="font-bold text-slate-800">Uyğun usta tapılmadı</p>
                <p class="text-xs text-slate-500">Axtarış sözünü və ya kateqoriyanı dəyişərək yenidən yoxlayın.</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    grid.innerHTML = filtered.map(m => {
        const photos = m.portfolioUrls ? m.portfolioUrls.split("||").filter(Boolean) : [];
        return `
            <div class="bg-white p-5 rounded-3xl border border-slate-200/90 hover:border-[#2D5A3C]/40 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                    <div class="flex items-start gap-3.5">
                        <img src="${getAvatarUrl(m)}" onclick="openMasterProfile(${m.id})"
                            class="w-14 h-14 rounded-2xl object-cover border border-slate-200 cursor-pointer shrink-0">
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center justify-between gap-2">
                                <h3 onclick="openMasterProfile(${m.id})"
                                    class="font-bold text-base text-slate-900 hover:text-[#2D5A3C] cursor-pointer truncate">
                                    ${escapeHtml(m.fullName)}
                                </h3>
                                <span class="shrink-0 inline-flex items-center gap-1 text-xs font-extrabold bg-amber-50 text-amber-700 border border-amber-200/70 px-2.5 py-1 rounded-xl">
                                    <i data-lucide="star" class="w-3.5 h-3.5 fill-amber-400 text-amber-400"></i>
                                    ${m.rating > 0 ? m.rating.toFixed(1) : "Yeni"}
                                    <span class="text-[10px] font-semibold text-amber-600/80">(${m.ratingCount || 0})</span>
                                </span>
                            </div>
                            <p class="text-xs font-bold text-[#2D5A3C] mt-0.5">${escapeHtml(m.category || "Usta")}</p>
                            <div class="flex items-center gap-3 text-[11px] text-slate-500 mt-1.5">
                                <span class="inline-flex items-center gap-1"><i data-lucide="map-pin" class="w-3 h-3"></i> ${escapeHtml(m.city || "Bakı")}</span>
                                <span class="inline-flex items-center gap-1"><i data-lucide="briefcase" class="w-3 h-3"></i> ${m.experience || 0} il təcrübə</span>
                            </div>
                        </div>
                    </div>

                    <p class="text-xs sm:text-sm text-slate-600 mt-3.5 line-clamp-2 leading-relaxed">
                        ${escapeHtml(m.about || "Peşəkar və zəmanətli xidmət göstərilir.")}
                    </p>

                    ${photos.length > 0 ? `
                        <div class="mt-3.5 flex items-center gap-2">
                            ${photos.slice(0, 3).map(url => `
                                <img src="${url}" onclick="openLightbox('${url}')"
                                    class="w-14 h-14 rounded-xl object-cover border border-slate-200 cursor-zoom-in hover:opacity-90 transition">
                            `).join("")}
                            ${photos.length > 3 ? `
                                <button onclick="openMasterProfile(${m.id})"
                                    class="w-14 h-14 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center">
                                    +${photos.length - 3}
                                </button>
                            ` : ""}
                        </div>
                    ` : ""}
                </div>

                <div class="flex items-center gap-2 mt-4 pt-3.5 border-t border-slate-100">
                    <button onclick="openMasterProfile(${m.id})"
                        class="px-3.5 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition">
                        Profil & Rəylər
                    </button>
                    <button onclick="openCreateOrderModal(${m.id})"
                        class="flex-1 h-10 rounded-xl bg-[#2D5A3C] hover:bg-[#22452E] text-white text-xs font-bold shadow-sm transition">
                        Sifariş Ver
                    </button>
                    <a href="tel:${escapeHtml(m.phone)}" title="Zəng et"
                        class="w-10 h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center transition">
                        <i data-lucide="phone-call" class="w-4 h-4"></i>
                    </a>
                </div>
            </div>
        `;
    }).join("");
    lucide.createIcons();
}

function renderSkeletonCards(count) {
    return Array.from({ length: count }).map(() => `
        <div class="bg-white p-5 rounded-3xl border border-slate-200 animate-pulse space-y-3">
            <div class="flex items-center gap-3">
                <div class="w-14 h-14 rounded-2xl bg-slate-200"></div>
                <div class="flex-1 space-y-2">
                    <div class="h-4 bg-slate-200 rounded w-1/2"></div>
                    <div class="h-3 bg-slate-100 rounded w-1/3"></div>
                </div>
            </div>
            <div class="h-3 bg-slate-100 rounded w-full"></div>
        </div>
    `).join("");
}

// =========================================================
// DETALLI USTA PROFİLİ MODALI
// =========================================================
async function openMasterProfile(masterId) {
    const master = allMasters.find(m => m.id === masterId);
    if (!master) return;

    openModal("masterProfileModal");
    const body = document.getElementById("masterProfileBody");
    body.innerHTML = `<p class="text-sm text-slate-500 text-center py-8">Profil məlumatları yüklənir...</p>`;

    let reviews = [];
    try {
        const res = await fetch(`${BASE_URL}/api/masters/${masterId}/reviews`);
        if (res.ok) reviews = await res.json();
    } catch (e) { /* ignore */ }

    const photos = master.portfolioUrls ? master.portfolioUrls.split("||").filter(Boolean) : [];

    body.innerHTML = `
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/70">
            <div class="flex items-center gap-4">
                <img src="${getAvatarUrl(master)}" class="w-16 h-16 rounded-2xl object-cover border border-slate-200">
                <div>
                    <h4 class="font-extrabold text-lg text-slate-900">${escapeHtml(master.fullName)}</h4>
                    <p class="text-xs font-bold text-[#2D5A3C]">${escapeHtml(master.category || "Usta")} • ${escapeHtml(master.city || "")}</p>
                    <div class="flex items-center gap-3 text-xs text-slate-600 mt-1">
                        <span>⭐ <b>${master.rating > 0 ? master.rating.toFixed(1) : "Yeni"}</b> (${master.ratingCount || 0} rəy)</span>
                        <span>•</span>
                        <span><b>${master.experience || 0} il</b> təcrübə</span>
                    </div>
                </div>
            </div>
            <div class="flex gap-2">
                <a href="tel:${escapeHtml(master.phone)}" class="px-4 h-10 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center gap-1.5">
                    <i data-lucide="phone" class="w-3.5 h-3.5"></i> Zəng
                </a>
                <button onclick="closeModal('masterProfileModal'); openCreateOrderModal(${master.id})"
                    class="px-4 h-10 rounded-xl bg-[#2D5A3C] text-white text-xs font-bold">
                    Sifariş Ver
                </button>
            </div>
        </div>

        <div>
            <h5 class="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">Haqqında</h5>
            <p class="text-sm text-slate-700 leading-relaxed">${escapeHtml(master.about || "Məlumat əlavə edilməyib.")}</p>
        </div>

        <div>
            <h5 class="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2">Gördüyü İşlər (${photos.length})</h5>
            ${photos.length > 0 ? `
                <div class="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                    ${photos.map(url => `
                        <img src="${url}" onclick="openLightbox('${url}')"
                            class="w-full h-24 rounded-2xl object-cover border border-slate-200 cursor-zoom-in hover:opacity-90 transition">
                    `).join("")}
                </div>
            ` : `<p class="text-xs text-slate-400 bg-slate-50 p-4 rounded-2xl">Usta hələ portfolio şəkli yükləməyib.</p>`}
        </div>

        <div>
            <h5 class="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2">Müştəri Rəyləri (${reviews.length})</h5>
            <div class="space-y-3">
                ${reviews.length > 0 ? reviews.map(r => `
                    <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2">
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-extrabold text-amber-600">
                                ${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)} (${r.rating}/5)
                            </span>
                            <span class="text-[11px] font-semibold text-slate-400 truncate max-w-[200px]">${escapeHtml(r.description)}</span>
                        </div>
                        <p class="text-sm text-slate-800">${escapeHtml(r.review || "Rəy mətni qeyd edilməyib.")}</p>
                        ${r.masterReply ? `
                            <div class="mt-2 pl-3 py-1.5 border-l-2 border-[#2D5A3C] bg-white rounded-r-xl text-xs text-slate-700">
                                <span class="font-bold text-[#2D5A3C]">↳ Ustanın cavabı:</span> ${escapeHtml(r.masterReply)}
                            </div>
                        ` : ""}
                    </div>
                `).join("") : `<p class="text-xs text-slate-400 bg-slate-50 p-4 rounded-2xl">Bu usta üçün hələ rəy yazılmayıb.</p>`}
            </div>
        </div>
    `;
    lucide.createIcons();
}

// =========================================================
// BÖLMƏ 2: MÜŞTƏRİNİN SİFARİŞLƏRİ VƏ QİYMƏTLƏNDİRMƏ
// =========================================================
function openCreateOrderModal(masterId) {
    const master = allMasters.find(m => m.id === masterId);
    document.getElementById("orderMasterId").value = masterId;
    document.getElementById("orderTargetMasterName").innerText = master ? `Usta: ${master.fullName} (${master.category})` : "";
    document.getElementById("orderDescription").value = "";
    document.getElementById("orderAddress").value = currentUser.city ? `${currentUser.city}, ` : "";
    openModal("createOrderModal");
}

async function submitOrder(e) {
    e.preventDefault();
    const masterId = parseInt(document.getElementById("orderMasterId").value, 10);
    const desc = document.getElementById("orderDescription").value.trim();
    const urgency = document.getElementById("orderUrgency").value;
    const address = document.getElementById("orderAddress").value.trim();
    const btn = document.getElementById("btnSubmitOrder");

    btn.disabled = true;
    btn.innerText = "Göndərilir...";

    try {
        const res = await fetch(`${BASE_URL}/api/orders`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                customerId: currentUser.id,
                masterId,
                description: `${desc} [${urgency}]`,
                address
            })
        });

        if (!res.ok) throw new Error("Sifariş göndərilərkən xəta baş verdi.");
        closeModal("createOrderModal");
        showToast("Sifarişiniz ustaya göndərildi!", "success");
        switchTab("customerOrders");
    } catch (err) {
        showToast(err.message, "error");
    } finally {
        btn.disabled = false;
        btn.innerText = "Sifarişi Göndər";
    }
}

async function loadCustomerOrdersView() {
    const main = document.getElementById("mainContent");
    main.innerHTML = `
        <div class="flex items-center justify-between">
            <div>
                <h2 class="text-xl font-extrabold text-slate-900">Sifarişlərim</h2>
                <p class="text-xs text-slate-500">Tamamlanmış sifarişlərə ulduz və rəy verə bilərsiniz</p>
            </div>
            <button onclick="loadCustomerOrdersView()" class="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5">
                <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i> Yenilə
            </button>
        </div>
        <div id="customerOrdersList" class="space-y-3">${renderSkeletonCards(2)}</div>
    `;
    lucide.createIcons();

    if (allMasters.length === 0) {
        try {
            const mRes = await fetch(`${BASE_URL}/api/masters`);
            allMasters = await mRes.json();
        } catch (e) { /* ignore */ }
    }

    const res = await fetch(`${BASE_URL}/api/orders/customer/${currentUser.id}`);
    const orders = await res.json();
    const list = document.getElementById("customerOrdersList");

    if (orders.length === 0) {
        list.innerHTML = `
            <div class="bg-white p-10 rounded-3xl border border-slate-200 text-center space-y-3">
                <i data-lucide="clipboard" class="w-10 h-10 text-slate-300 mx-auto"></i>
                <p class="font-bold text-slate-800">Hələ ki, sifarişiniz yoxdur</p>
                <button onclick="switchTab('masters')" class="px-5 py-2.5 rounded-xl bg-[#2D5A3C] text-white text-xs font-bold">
                    Usta Axtar
                </button>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    list.innerHTML = orders.map(o => {
        const master = allMasters.find(m => m.id === o.masterId);
        const masterTitle = master ? `${master.fullName} (${master.category})` : `Usta #${o.masterId}`;

        return `
            <div class="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                <div class="flex flex-wrap items-center justify-between gap-2">
                    <div class="flex items-center gap-2">
                        ${getStatusBadge(o.status)}
                        <span class="text-xs font-bold text-slate-500">${escapeHtml(masterTitle)}</span>
                    </div>
                    <span class="text-sm font-extrabold text-[#2D5A3C]">
                        ${o.price ? `${o.price} AZN` : "Qiymət gözlənilir"}
                    </span>
                </div>

                <div>
                    <p class="font-bold text-slate-900 text-sm sm:text-base">${escapeHtml(o.description)}</p>
                    <p class="text-xs text-slate-500 mt-1 flex items-center gap-1">
                        <i data-lucide="map-pin" class="w-3.5 h-3.5"></i> ${escapeHtml(o.address)}
                    </p>
                </div>

                <div class="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                    <button onclick="openChat(${o.id}, '${escapeHtml(masterTitle)}', '${escapeHtml(o.description)}')"
                        class="px-4 h-9 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5">
                        <i data-lucide="message-circle" class="w-3.5 h-3.5"></i> Usta ilə Yazış
                    </button>

                    ${master ? `
                        <a href="tel:${escapeHtml(master.phone)}" class="px-3.5 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5">
                            <i data-lucide="phone" class="w-3.5 h-3.5"></i> Zəng
                        </a>
                    ` : ""}

                    ${o.status === "GOZLEMEDE" ? `
                        <button onclick="cancelOrderByCustomer(${o.id})"
                            class="px-3.5 h-9 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold ml-auto">
                            Ləğv et
                        </button>
                    ` : ""}

                    ${o.status === "TAMAMLANDI" && !o.rating ? `
                        <button onclick="openRateModal(${o.id})"
                            class="px-4 h-9 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-1.5 ml-auto">
                            <i data-lucide="star" class="w-3.5 h-3.5"></i> Qiymətləndir & Rəy Yaz
                        </button>
                    ` : ""}
                </div>

                ${o.rating ? `
                    <div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 text-xs space-y-1.5">
                        <div class="font-bold text-amber-600">Sizin qiymətiniz: ${"★".repeat(o.rating)} (${o.rating}/5)</div>
                        ${o.review ? `<p class="text-slate-700">${escapeHtml(o.review)}</p>` : ""}
                        ${o.masterReply ? `
                            <div class="pl-3 py-1 border-l-2 border-[#2D5A3C] text-slate-700 mt-1">
                                <span class="font-bold text-[#2D5A3C]">↳ Ustanın cavabı:</span> ${escapeHtml(o.masterReply)}
                            </div>
                        ` : ""}
                    </div>
                ` : ""}
            </div>
        `;
    }).join("");
    lucide.createIcons();
}

async function cancelOrderByCustomer(orderId) {
    await fetch(`${BASE_URL}/api/orders/${orderId}/status?status=LEGV_EDILDI`, { method: "PUT" });
    showToast("Sifariş ləğv edildi.", "info");
    loadCustomerOrdersView();
}

function openRateModal(orderId) {
    document.getElementById("rateOrderId").value = orderId;
    document.getElementById("rateReviewText").value = "";
    setStarRating(5);
    openModal("rateOrderModal");
}

function setStarRating(val) {
    document.getElementById("selectedStarValue").value = val;
    const container = document.getElementById("starSelector");
    container.innerHTML = [1, 2, 3, 4, 5].map(i => `
        <button type="button" onclick="setStarRating(${i})" class="p-1 transition-transform hover:scale-110">
            <i data-lucide="star" class="w-8 h-8 ${i <= val ? "fill-amber-400 text-amber-400" : "text-slate-300"}"></i>
        </button>
    `).join("");
    lucide.createIcons();
}

async function submitRating(e) {
    e.preventDefault();
    const orderId = document.getElementById("rateOrderId").value;
    const rating = document.getElementById("selectedStarValue").value;
    const review = document.getElementById("rateReviewText").value.trim();

    try {
        const res = await fetch(`${BASE_URL}/api/orders/${orderId}/rate?rating=${rating}&review=${encodeURIComponent(review)}`, {
            method: "POST"
        });

        if (res.ok) {
            closeModal("rateOrderModal");
            showToast("Rəyiniz üçün təşəkkür edirik!", "success");
            loadCustomerOrdersView();
        } else {
            const errText = await res.text();
            showToast(`Xəta (${res.status}): ${errText || "Rəy göndərilmədi"}`, "error");
        }
    } catch (err) {
        showToast("Serverlə əlaqə xətası.", "error");
    }
}

// =========================================================
// BÖLMƏ 3: USTA PANELİ
// =========================================================
async function loadMasterOrdersView() {
    const main = document.getElementById("mainContent");
    main.innerHTML = `
        <div id="masterStatsRow" class="grid grid-cols-2 sm:grid-cols-4 gap-3"></div>
        <div class="flex items-center justify-between pt-2">
            <h2 class="text-lg font-extrabold text-slate-900">Gələn Sifarişlər</h2>
            <button onclick="loadMasterOrdersView()" class="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5">
                <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i> Yenilə
            </button>
        </div>
        <div id="masterOrdersList" class="space-y-3">${renderSkeletonCards(3)}</div>
    `;
    lucide.createIcons();

    const res = await fetch(`${BASE_URL}/api/orders/master/${currentUser.id}`);
    const orders = await res.json();

    const pendingCount = orders.filter(o => o.status === "GOZLEMEDE").length;
    const activeCount = orders.filter(o => o.status === "QEBUL_EDILDI").length;
    const completedOrders = orders.filter(o => o.status === "TAMAMLANDI");
    const totalEarned = completedOrders.reduce((sum, o) => sum + (o.price || 0), 0);

    document.getElementById("masterStatsRow").innerHTML = `
        <div class="bg-white p-4 rounded-2xl border border-slate-200">
            <p class="text-[11px] font-bold text-slate-400 uppercase">Yeni Gözləyən</p>
            <p class="text-2xl font-extrabold text-amber-600 mt-1">${pendingCount}</p>
        </div>
        <div class="bg-white p-4 rounded-2xl border border-slate-200">
            <p class="text-[11px] font-bold text-slate-400 uppercase">İcrada Olan</p>
            <p class="text-2xl font-extrabold text-blue-600 mt-1">${activeCount}</p>
        </div>
        <div class="bg-white p-4 rounded-2xl border border-slate-200">
            <p class="text-[11px] font-bold text-slate-400 uppercase">Tamamlanmış</p>
            <p class="text-2xl font-extrabold text-slate-900 mt-1">${completedOrders.length}</p>
        </div>
        <div class="bg-white p-4 rounded-2xl border border-slate-200">
            <p class="text-[11px] font-bold text-slate-400 uppercase">Ümumi Qazanc</p>
            <p class="text-2xl font-extrabold text-[#2D5A3C] mt-1">${totalEarned} ₼</p>
        </div>
    `;

    const list = document.getElementById("masterOrdersList");
    if (orders.length === 0) {
        list.innerHTML = `
            <div class="bg-white p-10 rounded-3xl border border-slate-200 text-center space-y-2">
                <i data-lucide="inbox" class="w-10 h-10 text-slate-300 mx-auto"></i>
                <p class="font-bold text-slate-800">Hələ yeni sifariş yoxdur</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    list.innerHTML = orders.map(o => `
        <div class="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <div class="flex items-center justify-between">
                ${getStatusBadge(o.status)}
                <span class="text-sm font-extrabold text-[#2D5A3C]">
                    ${o.price ? `${o.price} AZN` : "Qiymət təyin edilməyib"}
                </span>
            </div>

            <div>
                <p class="font-bold text-slate-900 text-sm sm:text-base">${escapeHtml(o.description)}</p>
                <p class="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <i data-lucide="map-pin" class="w-3.5 h-3.5"></i> ${escapeHtml(o.address)}
                </p>
            </div>

            <div class="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                <button onclick="openChat(${o.id}, 'Müştəri ilə Yazışma', '${escapeHtml(o.description)}')"
                    class="px-4 h-9 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5">
                    <i data-lucide="message-circle" class="w-3.5 h-3.5"></i> Chat
                </button>

                ${o.status === "GOZLEMEDE" ? `
                    <button onclick="openAcceptOrderModal(${o.id})"
                        class="flex-1 h-9 rounded-xl bg-[#2D5A3C] hover:bg-[#22452E] text-white text-xs font-bold">
                        Qəbul Et & Qiymət Yaz
                    </button>
                    <button onclick="rejectOrderByMaster(${o.id})"
                        class="px-3.5 h-9 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold">
                        İmtina
                    </button>
                ` : ""}

                ${o.status === "QEBUL_EDILDI" ? `
                    <button onclick="completeOrderByMaster(${o.id})"
                        class="flex-1 h-9 rounded-xl bg-[#2D5A3C] hover:bg-[#22452E] text-white text-xs font-bold flex items-center justify-center gap-1.5">
                        <i data-lucide="check" class="w-4 h-4"></i> İşi Tamamla
                    </button>
                ` : ""}
            </div>
        </div>
    `).join("");
    lucide.createIcons();
}

function openAcceptOrderModal(orderId) {
    document.getElementById("acceptOrderId").value = orderId;
    document.getElementById("acceptOrderPrice").value = "";
    openModal("acceptOrderModal");
}

async function submitAcceptOrder(e) {
    e.preventDefault();
    const orderId = document.getElementById("acceptOrderId").value;
    const price = document.getElementById("acceptOrderPrice").value;

    await fetch(`${BASE_URL}/api/orders/${orderId}/status?status=QEBUL_EDILDI&price=${price}`, { method: "PUT" });
    closeModal("acceptOrderModal");
    showToast("Sifariş qəbul edildi!", "success");
    loadMasterOrdersView();
}

async function rejectOrderByMaster(orderId) {
    await fetch(`${BASE_URL}/api/orders/${orderId}/status?status=IMTINA_EDILDI`, { method: "PUT" });
    showToast("Sifarişdən imtina edildi.", "info");
    loadMasterOrdersView();
}

async function completeOrderByMaster(orderId) {
    await fetch(`${BASE_URL}/api/orders/${orderId}/status?status=TAMAMLANDI`, { method: "PUT" });
    showToast("Təbriklər! Sifariş tamamlandı.", "success");
    loadMasterOrdersView();
}

// =========================================================
// BÖLMƏ 4: PROFİL, PORTFOLİO VƏ RƏYLƏRƏ GERİ DÖNÜŞ
// =========================================================
async function loadProfileView() {
    const main = document.getElementById("mainContent");
    main.innerHTML = renderSkeletonCards(2);

    try {
        const res = await fetch(`${BASE_URL}/api/users/${currentUser.id}`);
        if (res.ok) {
            currentUser = await res.json();
            localStorage.setItem("usta_user", JSON.stringify(currentUser));
            updateNavbarUser();
        }
    } catch (e) { /* ignore */ }

    const isMaster = currentUser.role === "USTA";
    const photos = currentUser.portfolioUrls ? currentUser.portfolioUrls.split("||").filter(Boolean) : [];

    let reviewsBlock = "";
    if (isMaster) {
        let reviews = [];
        try {
            const revRes = await fetch(`${BASE_URL}/api/masters/${currentUser.id}/reviews`);
            if (revRes.ok) reviews = await revRes.json();
        } catch (e) { /* ignore */ }

        reviewsBlock = `
            <div class="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div>
                    <h3 class="font-extrabold text-base text-slate-900">Müştəri Rəyləri və Cavablar</h3>
                    <p class="text-xs text-slate-500">Orta reytinqiniz: ⭐ <b>${currentUser.rating > 0 ? currentUser.rating.toFixed(1) : "0.0"}</b> (${currentUser.ratingCount || 0} rəy)</p>
                </div>

                <div class="space-y-3">
                    ${reviews.length > 0 ? reviews.map(r => `
                        <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                            <div class="flex items-center justify-between">
                                <span class="text-xs font-extrabold text-amber-600">${"★".repeat(r.rating)} (${r.rating}/5)</span>
                                <span class="text-[11px] text-slate-400">İş: ${escapeHtml(r.description)}</span>
                            </div>
                            <p class="text-sm text-slate-800">${escapeHtml(r.review || "Rəy mətni yazılmayıb.")}</p>
                            ${r.masterReply ? `
                                <div class="pl-3 py-1.5 border-l-2 border-[#2D5A3C] bg-white rounded-r-xl text-xs text-slate-700">
                                    <span class="font-bold text-[#2D5A3C]">Sizin cavabınız:</span> ${escapeHtml(r.masterReply)}
                                </div>
                            ` : `
                                <button onclick="openReplyModal(${r.id}, '${escapeHtml(r.review || "Müştəri ulduz verdi")}')"
                                    class="text-xs font-bold text-[#2D5A3C] hover:underline flex items-center gap-1 pt-1">
                                    <i data-lucide="corner-down-right" class="w-3.5 h-3.5"></i> Bu rəyə cavab yaz
                                </button>
                            `}
                        </div>
                    `).join("") : `<p class="text-xs text-slate-400">Hələ ki, sizə rəy yazılmayıb.</p>`}
                </div>
            </div>
        `;
    }

    main.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
                <div class="flex items-center gap-4 pb-4 border-b border-slate-100">
                    <div class="relative">
                        <img src="${getAvatarUrl(currentUser)}" class="w-20 h-20 rounded-2xl object-cover border border-slate-200">
                        <label class="cursor-pointer absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-[#2D5A3C] text-white flex items-center justify-center shadow-md hover:bg-[#22452E] transition" title="Şəkli dəyiş">
                            <i data-lucide="camera" class="w-4 h-4"></i>
                            <input type="file" accept="image/*" class="hidden" onchange="handleAvatarUpload(this)">
                        </label>
                    </div>
                    <div>
                        <h2 class="font-extrabold text-lg text-slate-900">${escapeHtml(currentUser.fullName)}</h2>
                        <p class="text-xs font-semibold text-slate-500">${escapeHtml(currentUser.phone)}</p>
                        <span class="inline-block mt-1 text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-[#2D5A3C]/10 text-[#2D5A3C]">
                            ${isMaster ? escapeHtml(currentUser.category || "Usta") : "Müştəri Hesabı"}
                        </span>
                    </div>
                </div>

                <form onsubmit="saveProfileChanges(event)" class="space-y-4">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-slate-700 mb-1">Ad və Soyad</label>
                            <input id="profFullName" type="text" required value="${escapeHtml(currentUser.fullName)}" class="input-field">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-700 mb-1">Şəhər</label>
                            <input id="profCity" type="text" value="${escapeHtml(currentUser.city || "")}" class="input-field">
                        </div>
                    </div>

                    ${isMaster ? `
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-xs font-bold text-slate-700 mb-1">İxtisas / Sahə</label>
                                <select id="profCategory" class="input-field bg-white">
                                    ${CATEGORIES.filter(c => c !== "Hamısı").map(c => `
                                        <option value="${c}" ${currentUser.category === c ? "selected" : ""}>${c}</option>
                                    `).join("")}
                                </select>
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-700 mb-1">Təcrübə (il)</label>
                                <input id="profExperience" type="number" min="0" value="${currentUser.experience || 0}" class="input-field">
                            </div>
                        </div>

                        <div>
                            <label class="block text-xs font-bold text-slate-700 mb-1">Haqqınızda və Xidmətlər</label>
                            <textarea id="profAbout" rows="3" class="w-full p-3.5 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:border-[#2D5A3C]">${escapeHtml(currentUser.about || "")}</textarea>
                        </div>
                    ` : ""}

                    <button type="submit" class="px-6 h-11 rounded-xl bg-[#2D5A3C] hover:bg-[#22452E] text-white font-bold text-sm transition">
                        Dəyişiklikləri Yadda Saxla
                    </button>
                </form>
            </div>

            ${isMaster ? `
                <div class="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 h-fit">
                    <div class="flex items-center justify-between">
                        <div>
                            <h3 class="font-extrabold text-base text-slate-900">İş Portfoliom</h3>
                            <p class="text-xs text-slate-500">Gördüyünüz işlərin şəkilləri</p>
                        </div>
                        <label class="cursor-pointer px-3 py-2 rounded-xl bg-[#2D5A3C] hover:bg-[#22452E] text-white text-xs font-bold flex items-center gap-1 transition">
                            <i data-lucide="plus" class="w-4 h-4"></i> Əlavə et
                            <input type="file" accept="image/*" class="hidden" onchange="handlePortfolioUpload(this)">
                        </label>
                    </div>

                    ${photos.length > 0 ? `
                        <div class="grid grid-cols-2 gap-2.5">
                            ${photos.map((url, idx) => `
                                <div class="relative group rounded-2xl overflow-hidden border border-slate-200">
                                    <img src="${url}" onclick="openLightbox('${url}')" class="w-full h-28 object-cover cursor-zoom-in">
                                    <button type="button" onclick="deletePortfolioPhoto(${idx})" title="Sil"
                                        class="absolute top-1.5 right-1.5 w-6 h-6 rounded-lg bg-red-600/90 text-white flex items-center justify-center">
                                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                                    </button>
                                </div>
                            `).join("")}
                        </div>
                    ` : `
                        <div class="p-6 rounded-2xl bg-slate-50 border border-dashed border-slate-300 text-center space-y-1">
                            <i data-lucide="image" class="w-7 h-7 text-slate-400 mx-auto"></i>
                            <p class="text-xs font-semibold text-slate-600">Hələ şəkil yoxdur</p>
                        </div>
                    `}
                </div>
            ` : ""}
        </div>

        ${reviewsBlock}
    `;
    lucide.createIcons();
}

async function handleAvatarUpload(input) {
    if (!input.files[0]) return;
    try {
        showToast("Profil şəkli yüklənir...", "info");
        const url = await uploadToSupabase(input.files[0]);
        const res = await fetch(`${BASE_URL}/api/users/${currentUser.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ avatarUrl: url })
        });
        if (!res.ok) throw new Error("Backend profil şəklini yadda saxlamadı.");
        showToast("Profil şəkli yeniləndi!", "success");
        loadProfileView();
    } catch (err) {
        showToast(err.message, "error");
    }
}

async function handlePortfolioUpload(input) {
    if (!input.files[0]) return;
    try {
        showToast("Portfolio şəkli yüklənir...", "info");
        const url = await uploadToSupabase(input.files[0]);
        const existing = currentUser.portfolioUrls ? currentUser.portfolioUrls.split("||").filter(Boolean) : [];
        existing.push(url);

        const res = await fetch(`${BASE_URL}/api/users/${currentUser.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ portfolioUrls: existing.join("||") })
        });
        if (!res.ok) throw new Error("Backend portfolionu yadda saxlamadı.");
        showToast("Şəkil portfolionuzda paylaşıldı!", "success");
        loadProfileView();
    } catch (err) {
        showToast(err.message, "error");
    }
}

async function deletePortfolioPhoto(index) {
    const existing = currentUser.portfolioUrls ? currentUser.portfolioUrls.split("||").filter(Boolean) : [];
    existing.splice(index, 1);

    await fetch(`${BASE_URL}/api/users/${currentUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portfolioUrls: existing.join("||") })
    });
    showToast("Şəkil silindi.", "info");
    loadProfileView();
}

async function saveProfileChanges(e) {
    e.preventDefault();
    const isMaster = currentUser.role === "USTA";
    const payload = {
        fullName: document.getElementById("profFullName").value.trim(),
        city: document.getElementById("profCity").value.trim(),
        category: isMaster ? document.getElementById("profCategory").value : null,
        experience: isMaster ? parseInt(document.getElementById("profExperience").value || "0", 10) : null,
        about: isMaster ? document.getElementById("profAbout").value.trim() : null
    };

    const res = await fetch(`${BASE_URL}/api/users/${currentUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    if (res.ok) {
        showToast("Profil məlumatları yadda saxlanıldı!", "success");
        loadProfileView();
    } else {
        showToast("Profil yenilənərkən backend xətası oldu.", "error");
    }
}

function openReplyModal(orderId, customerQuote) {
    document.getElementById("replyOrderId").value = orderId;
    document.getElementById("replyCustomerQuote").innerText = `Müştəri rəyi: "${customerQuote}"`;
    document.getElementById("replyText").value = "";
    openModal("replyReviewModal");
}

async function submitReply(e) {
    e.preventDefault();
    const orderId = document.getElementById("replyOrderId").value;
    const reply = document.getElementById("replyText").value.trim();

    const res = await fetch(`${BASE_URL}/api/orders/${orderId}/reply?reply=${encodeURIComponent(reply)}`, {
        method: "POST"
    });

    if (res.ok) {
        closeModal("replyReviewModal");
        showToast("Cavabınız rəyin altında paylaşıldı!", "success");
        loadProfileView();
    } else {
        showToast("Cavab göndərilərkən xəta baş verdi.", "error");
    }
}

// =========================================================
// BÖLMƏ 5: SİFARİŞ DAXİLİ CANLI CHAT + ŞƏKİL GÖNDƏRMƏ
// =========================================================
function openChat(orderId, title, subtitle) {
    activeChatOrderId = orderId;
    document.getElementById("chatHeaderTitle").innerText = title;
    document.getElementById("chatHeaderSub").innerText = subtitle;
    document.getElementById("chatMessagesContainer").innerHTML = `<p class="text-center text-xs text-slate-400 py-8">Mesajlar yüklənir...</p>`;
    openModal("chatModal");

    fetchChatMessages(true);
    if (chatPollTimer) clearInterval(chatPollTimer);
    chatPollTimer = setInterval(() => fetchChatMessages(false), 3500);
}

function closeChat() {
    closeModal("chatModal");
    if (chatPollTimer) clearInterval(chatPollTimer);
    activeChatOrderId = null;
}

async function fetchChatMessages(scrollToBottom = false) {
    if (!activeChatOrderId) return;
    const box = document.getElementById("chatMessagesContainer");

    try {
        const res = await fetch(`${BASE_URL}/api/orders/${activeChatOrderId}/messages`);
        if (!res.ok) {
            box.innerHTML = `
                <div class="text-center py-10 px-4 space-y-1">
                    <p class="text-xs font-bold text-red-600">Çat serveri cavab vermir (Xəta ${res.status})</p>
                    <p class="text-[11px] text-slate-500">Render backend-də yeni AppController kodlarının deploy olunduğunu yoxlayın.</p>
                </div>
            `;
            return;
        }

        const messages = await res.json();
        const isNearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 100;

        if (!Array.isArray(messages) || messages.length === 0) {
            box.innerHTML = `
                <div class="text-center py-12 space-y-1">
                    <p class="text-xs font-bold text-slate-500">Hələ mesaj yoxdur</p>
                    <p class="text-[11px] text-slate-400">İşin detallarını dəqiqləşdirmək üçün mesaj və ya şəkil göndərin.</p>
                </div>
            `;
            return;
        }

        box.innerHTML = messages.map(m => {
            const isMe = m.senderId === currentUser.id;
            return `
                <div class="flex flex-col ${isMe ? "items-end" : "items-start"}">
                    <span class="text-[10px] font-semibold text-slate-400 mb-1 px-1">${escapeHtml(m.senderName)}</span>
                    <div class="max-w-[78%] px-3.5 py-2.5 rounded-2xl text-sm shadow-sm ${
                        isMe
                            ? "bg-[#2D5A3C] text-white rounded-br-sm"
                            : "bg-white text-slate-800 border border-slate-200/80 rounded-bl-sm"
                    }">
                        ${m.imageUrl ? `
                            <img src="${m.imageUrl}" onclick="openLightbox('${m.imageUrl}')"
                                class="max-h-52 rounded-xl mb-1.5 cursor-zoom-in object-cover">
                        ` : ""}
                        ${m.text ? `<p class="leading-relaxed break-words">${escapeHtml(m.text)}</p>` : ""}
                    </div>
                </div>
            `;
        }).join("");

        if (scrollToBottom || isNearBottom) {
            box.scrollTop = box.scrollHeight;
        }
    } catch (e) {
        box.innerHTML = `<p class="text-center text-xs text-red-500 py-8">Serverlə əlaqə kəsildi.</p>`;
    }
}

async function sendChatMessage() {
    const input = document.getElementById("chatMessageInput");
    const text = input.value.trim();
    if (!text || !activeChatOrderId) return;

    try {
        const res = await fetch(`${BASE_URL}/api/orders/${activeChatOrderId}/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                senderId: currentUser.id,
                senderName: currentUser.fullName,
                text
            })
        });

        if (!res.ok) {
            throw new Error(`Mesaj göndərilmədi (Server xətası: ${res.status})`);
        }

        input.value = "";
        fetchChatMessages(true);
    } catch (err) {
        showToast(err.message, "error");
    }
}

async function handleChatImageUpload(input) {
    if (!input.files[0] || !activeChatOrderId) return;
    try {
        showToast("Şəkil göndərilir...", "info");
        const imageUrl = await uploadToSupabase(input.files[0]);
        const res = await fetch(`${BASE_URL}/api/orders/${activeChatOrderId}/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                senderId: currentUser.id,
                senderName: currentUser.fullName,
                imageUrl
            })
        });
        if (!res.ok) throw new Error("Şəkil linki mesaja əlavə edilmədi.");
        input.value = "";
        fetchChatMessages(true);
    } catch (err) {
        showToast(err.message, "error");
    }
}