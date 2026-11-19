// =========================================================
// KONFİQURASİYA VƏ QLOBAL DƏYİŞƏNLƏR
// =========================================================
const BASE_URL = "https://usta-platform.onrender.com";
const SUPABASE_URL = "https://jbtazoqcjvrcnnedgxne.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpidGF6b3FjanZyY25uZWRneG5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ3NDQ4MjMsImV4cCI6MjExMDMyMDgyM30.0dnwuMPvMlRCAdIg6F9NIENmqxJoiyxATwQ3W9tOQ-o";
const SUPABASE_BUCKET = "usta-images";

const CATEGORIES = [
    { name: "Hamısı", icon: "layout-grid" },
    { name: "Santexnik", icon: "wrench" },
    { name: "Elektrik", icon: "zap" },
    { name: "Mebel ustası", icon: "hammer" },
    { name: "Kombi/Kondisioner", icon: "thermometer" },
    { name: "Təmir-tikinti", icon: "paint-roller" },
    { name: "Avto usta", icon: "car" }
];

let currentUser = null;
let allMasters = [];
let selectedCategory = "Hamısı";
let activeTab = "";
let activeChatOrderId = null;
let chatPollTimer = null;
let customerOrderFilter = "ALL";
let masterOrderFilter = "ALL";

// =========================================================
// İŞƏ DÜŞMƏ VƏ MODALLARIN BAĞLANMASI
// =========================================================
document.addEventListener("DOMContentLoaded", () => {
    lucide.createIcons();

    document.querySelectorAll(".modal-backdrop").forEach(backdrop => {
        backdrop.addEventListener("click", (e) => {
            if (e.target === backdrop) {
                if (backdrop.id === "chatModal") closeChat();
                else closeModal(backdrop.id);
            }
        });
    });

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
        info: "bg-[#1F563D] text-white border-[#184430]"
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
    if (el) el.classList.add("hidden");
}

function openLightbox(url) {
    document.getElementById("lightboxImage").src = url;
    openModal("lightboxModal");
}

function getAvatarUrl(user) {
    if (user && user.avatarUrl) return user.avatarUrl;
    const name = user && user.fullName ? user.fullName : "Usta";
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1F563D&color=fff&bold=true`;
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
        GOZLEMEDE: { label: "Gözləmədə", cls: "bg-amber-50 text-amber-700 border-amber-200/80" },
        QEBUL_EDILDI: { label: "Qəbul edildi", cls: "bg-[#EBF2EE] text-[#1F563D] border-[#DCE4DF]" },
        TAMAMLANDI: { label: "Tamamlandı", cls: "bg-slate-100 text-slate-700 border-slate-200" },
        IMTINA_EDILDI: { label: "İmtina edildi", cls: "bg-red-50 text-red-600 border-red-200/80" },
        LEGV_EDILDI: { label: "Ləğv edildi", cls: "bg-slate-100 text-slate-500 border-slate-200" }
    };
    const item = map[status] || { label: status, cls: "bg-slate-100 text-slate-700 border-slate-200" };
    return `<span class="text-[11px] font-bold px-2.5 py-1 rounded-full border ${item.cls}">${item.label}</span>`;
}

// =========================================================
// SEVİMLİ USTALAR (SAVED PROS - LOCALSTORAGE)
// =========================================================
function getSavedMasterIds() {
    if (!currentUser) return [];
    try {
        return JSON.parse(localStorage.getItem(`saved_masters_${currentUser.id}`) || "[]");
    } catch (e) {
        return [];
    }
}

function toggleSaveMaster(masterId) {
    if (!currentUser) return;
    let saved = getSavedMasterIds();
    const exists = saved.includes(masterId);
    if (exists) {
        saved = saved.filter(id => id !== masterId);
        showToast("Usta seçilmişlərdən çıxarıldı.", "info");
    } else {
        saved.push(masterId);
        showToast("Usta seçilmişlərə əlavə edildi!", "success");
    }
    localStorage.setItem(`saved_masters_${currentUser.id}`, JSON.stringify(saved));

    if (activeTab === "savedPros") loadSavedMastersView();
    else if (activeTab === "masters") applyMasterFilters();

    const saveBtn = document.getElementById(`saveProBtn_${masterId}`);
    if (saveBtn) {
        const nowSaved = saved.includes(masterId);
        saveBtn.innerHTML = `<i data-lucide="heart" class="w-4 h-4 ${nowSaved ? "fill-red-500 text-red-500" : ""}"></i><span>${nowSaved ? "Yadda saxlanılıb" : "Yadda saxla"}</span>`;
        lucide.createIcons();
    }
}

// =========================================================
// SUPABASE STORAGE ŞƏKİL YÜKLƏMƏ
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

    const headers = {
        "apikey": key,
        "Content-Type": file.type || "image/jpeg"
    };
    if (key.startsWith("eyJ")) {
        headers["Authorization"] = `Bearer ${key}`;
    }

    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${filePath}`, {
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

    return `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${filePath}`;
}

// =========================================================
// AUTH: GİRİŞ VƏ QEYDİYYAT
// =========================================================
function switchAuthMode(mode) {
    const isLogin = mode === "login";
    document.getElementById("loginBox").classList.toggle("hidden", !isLogin);
    document.getElementById("registerBox").classList.toggle("hidden", isLogin);

    const topAction = document.getElementById("authTopAction");
    const heroTitle = document.getElementById("authHeroTitle");
    const heroSub = document.getElementById("authHeroSub");

    if (isLogin) {
        topAction.innerHTML = `
            <span class="text-slate-500 hidden sm:inline">Hələ hesabınız yoxdur?</span>
            <button type="button" onclick="switchAuthMode('register')" class="font-bold text-[#1F563D] hover:underline flex items-center gap-1">
                <span>Qeydiyyat</span>
                <i data-lucide="arrow-up-right" class="w-3.5 h-3.5"></i>
            </button>
        `;
        if (heroTitle) heroTitle.innerHTML = "Kiçik bir kömək.<br>Daha xoşbəxt bir ev.";
        if (heroSub) heroSub.innerText = "Su sızmasından son tamamlama işlərinə qədər — etibar edə biləcəyiniz peşəkar ustaları tapın.";
    } else {
        topAction.innerHTML = `
            <span class="text-slate-500 hidden sm:inline">Artıq üzvsünüz?</span>
            <button type="button" onclick="switchAuthMode('login')" class="font-bold text-[#1F563D] hover:underline flex items-center gap-1">
                <span>Daxil ol</span>
                <i data-lucide="arrow-up-right" class="w-3.5 h-3.5"></i>
            </button>
        `;
        if (heroTitle) heroTitle.innerHTML = "Yaxşı insanlar.<br>Böyük işlər görülür.";
        if (heroSub) heroSub.innerText = "Yerli peşəkar dəstək evinizdəki hər bir işi daha rahat və sürətli edir.";
    }
    lucide.createIcons();
}

function setLoginRoleHint(role) {
    const btnC = document.getElementById("loginRoleCustomer");
    const btnM = document.getElementById("loginRoleMaster");
    const hint = document.getElementById("loginRoleHintText");

    if (role === "MUSTERI") {
        btnC.className = "py-2 text-xs font-bold rounded-lg bg-white text-slate-900 shadow-sm transition-all";
        btnM.className = "py-2 text-xs font-bold rounded-lg text-slate-500 hover:text-slate-800 transition-all";
        hint.innerText = "Sifarişlərinizi idarə edin və etibarlı ustalar tapın.";
    } else {
        btnM.className = "py-2 text-xs font-bold rounded-lg bg-white text-slate-900 shadow-sm transition-all";
        btnC.className = "py-2 text-xs font-bold rounded-lg text-slate-500 hover:text-slate-800 transition-all";
        hint.innerText = "Gələn sifarişləri qəbul edin, portfolionuzu və rəylərinizi idarə edin.";
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
        btn.innerHTML = `<span>Daxil ol</span><i data-lucide="arrow-right" class="w-4 h-4"></i>`;
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
        btn.innerHTML = `<span>Hesab yarat</span><i data-lucide="arrow-right" class="w-4 h-4"></i>`;
        lucide.createIcons();
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
// DASHBOARD NAVİQASİYASI (FIGMA TOP UNDERLINE TABS)
// =========================================================
function initDashboard() {
    document.getElementById("authSection").classList.add("hidden");
    document.getElementById("dashboardSection").classList.remove("hidden");

    updateNavbarUser();

    const isMaster = currentUser.role === "USTA";
    const tabs = isMaster
        ? [
              { id: "masterOrders", label: "Sifarişlər", icon: "clipboard-list" },
              { id: "profile", label: "Profilim", icon: "user-cog" }
          ]
        : [
              { id: "masters", label: "Usta tap", icon: "search" },
              { id: "customerOrders", label: "Sifarişlərim", icon: "clipboard-list" },
              { id: "savedPros", label: "Seçilmişlər", icon: "heart" }
          ];

    document.getElementById("desktopNav").innerHTML = tabs.map(t => `
        <button onclick="switchTab('${t.id}')" data-tab="${t.id}"
            class="nav-btn h-full px-1 border-b-2 text-xs font-bold flex items-center gap-1.5 transition">
            <span>${t.label}</span>
        </button>
    `).join("");

    document.getElementById("mobileNav").innerHTML = tabs.map(t => `
        <button onclick="switchTab('${t.id}')" data-tab="${t.id}"
            class="mobile-nav-btn flex-1 py-1.5 flex flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-bold transition">
            <i data-lucide="${t.icon}" class="w-4 h-4"></i>
            <span>${t.label}</span>
        </button>
    `).join("");

    switchTab(isMaster ? "masterOrders" : "masters");
}

function updateNavbarUser() {
    document.getElementById("navAvatar").src = getAvatarUrl(currentUser);
    document.getElementById("navUserName").innerText = currentUser.fullName;
    document.getElementById("navUserCity").innerText = currentUser.city || "Azərbaycan";
    document.getElementById("rolePill").innerText = currentUser.role === "USTA" ? "Usta paneli" : "Müştəri paneli";
}

function resetToHome() {
    switchTab(currentUser.role === "USTA" ? "masterOrders" : "masters");
}

function switchTab(tabId) {
    activeTab = tabId;

    document.querySelectorAll(".nav-btn").forEach(btn => {
        const active = btn.dataset.tab === tabId;
        btn.className = active
            ? "nav-btn h-full px-1 border-b-2 border-[#1F563D] text-slate-900 text-xs font-bold flex items-center gap-1.5 transition"
            : "nav-btn h-full px-1 border-b-2 border-transparent text-slate-500 hover:text-slate-900 text-xs font-semibold flex items-center gap-1.5 transition";
    });

    document.querySelectorAll(".mobile-nav-btn").forEach(btn => {
        const active = btn.dataset.tab === tabId;
        btn.className = active
            ? "mobile-nav-btn flex-1 py-1.5 flex flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-bold text-[#1F563D] bg-[#EBF2EE] transition"
            : "mobile-nav-btn flex-1 py-1.5 flex flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-bold text-slate-400 transition";
    });

    if (tabId === "masters") loadMastersView();
    if (tabId === "savedPros") loadSavedMastersView();
    if (tabId === "customerOrders") loadCustomerOrdersView();
    if (tabId === "masterOrders") loadMasterOrdersView();
    if (tabId === "profile") loadProfileView();
}

// =========================================================
// BÖLMƏ 1: USTA TAP (FIGMA 03)
// =========================================================
async function loadMastersView() {
    const main = document.getElementById("mainContent");
    main.innerHTML = `
        <!-- Figma Hero Axtarış Banneri -->
        <div class="bg-[#EBF2EE] p-6 sm:p-8 rounded-[28px] border border-[#DCE4DF] space-y-5">
            <div class="flex flex-wrap items-center justify-between gap-2">
                <span class="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#1F563D]">YERLİ TƏCRÜBƏ. DAHA AZ İŞ.</span>
                <div class="flex flex-wrap items-center gap-4 text-[11px] font-semibold text-[#1F563D]">
                    <span class="inline-flex items-center gap-1"><i data-lucide="check" class="w-3.5 h-3.5"></i> Yoxlanılmış ustalar</span>
                    <span class="inline-flex items-center gap-1"><i data-lucide="check" class="w-3.5 h-3.5"></i> Real rəylər</span>
                    <span class="inline-flex items-center gap-1"><i data-lucide="check" class="w-3.5 h-3.5"></i> Sizin əraziniz</span>
                </div>
            </div>

            <div>
                <h1 class="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Eviniz etibarlı əllərdədir.</h1>
                <p class="text-xs sm:text-sm text-slate-600 mt-1.5">Kiçik təmir işlərindən böyük layihələrə qədər etibarlı yerli mütəxəssisləri tapın.</p>
            </div>

            <!-- Birləşdirilmiş Ağ Axtarış Çubuğu -->
            <div class="bg-white p-2 rounded-2xl border border-[#DCE4DF] shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div class="flex-1 flex items-center gap-2.5 px-3">
                    <i data-lucide="search" class="w-4 h-4 text-slate-400 shrink-0"></i>
                    <input id="masterSearchInput" type="text" oninput="applyMasterFilters()"
                        placeholder="Nə işdə kömək lazımdır? (məs: kran, kombi, mebel)..."
                        class="w-full h-10 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none">
                </div>

                <div class="hidden sm:block w-px h-7 bg-[#E6EAE7]"></div>

                <div class="sm:w-48 flex items-center gap-2 px-3 border-t sm:border-t-0 pt-2 sm:pt-0 border-[#E6EAE7]">
                    <i data-lucide="map-pin" class="w-4 h-4 text-[#1F563D] shrink-0"></i>
                    <input id="masterCityInput" type="text" oninput="applyMasterFilters()"
                        placeholder="Şəhər (məs: Bakı)"
                        class="w-full h-10 text-xs font-semibold text-slate-700 placeholder:text-slate-400 focus:outline-none">
                </div>

                <button type="button" onclick="applyMasterFilters()"
                    class="h-10 px-6 rounded-xl bg-[#1F563D] hover:bg-[#184430] text-white text-xs font-bold transition shrink-0">
                    Usta tap
                </button>
            </div>
        </div>

        <!-- Kateqoriya Pill-ləri -->
        <div id="categoryPills" class="flex gap-2 overflow-x-auto pb-1">
            ${CATEGORIES.map(cat => `
                <button onclick="selectCategory('${cat.name}')"
                    class="cat-pill ${selectedCategory === cat.name ? "active" : ""}">
                    <i data-lucide="${cat.icon}" class="w-3.5 h-3.5"></i>
                    <span>${cat.name}</span>
                </button>
            `).join("")}
        </div>

        <!-- Başlıq və Sıralama -->
        <div class="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div>
                <h2 class="text-lg font-extrabold text-slate-900">Tövsiyə olunan ustalar</h2>
                <p id="mastersCountLabel" class="text-xs text-slate-500">Yüklənir...</p>
            </div>
            <div class="flex items-center gap-2">
                <span class="text-xs text-slate-400">Sırala:</span>
                <select id="masterSortSelect" onchange="applyMasterFilters()"
                    class="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer">
                    <option value="rating">Ən yüksək reytinq</option>
                    <option value="experience">Ən çox təcrübə</option>
                    <option value="reviews">Ən çox rəy</option>
                </select>
            </div>
        </div>

        <!-- 3 Sütunlu Usta Kartları -->
        <div id="mastersGrid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            ${renderSkeletonCards(6)}
        </div>
    `;
    lucide.createIcons();

    try {
        const res = await fetch(`${BASE_URL}/api/masters`);
        allMasters = await res.json();
        applyMasterFilters();
    } catch (err) {
        document.getElementById("mastersGrid").innerHTML = `
            <div class="col-span-full bg-white p-8 rounded-2xl border border-[#E6EAE7] text-center">
                <p class="text-sm font-bold text-red-600">Ustalar yüklənərkən xəta baş verdi.</p>
            </div>
        `;
    }
}

function selectCategory(cat) {
    selectedCategory = cat;
    document.querySelectorAll(".cat-pill").forEach(btn => {
        const label = btn.querySelector("span")?.innerText.trim();
        btn.classList.toggle("active", label === cat);
    });
    applyMasterFilters();
}

function applyMasterFilters() {
    const query = (document.getElementById("masterSearchInput")?.value || "").toLowerCase().trim();
    const cityQuery = (document.getElementById("masterCityInput")?.value || "").toLowerCase().trim();
    const sortBy = document.getElementById("masterSortSelect")?.value || "rating";

    let filtered = allMasters.filter(m => {
        const matchCat = selectedCategory === "Hamısı" || (m.category && m.category.toLowerCase() === selectedCategory.toLowerCase());
        const matchCity = !cityQuery || (m.city && m.city.toLowerCase().includes(cityQuery));
        const matchText = !query ||
            (m.fullName && m.fullName.toLowerCase().includes(query)) ||
            (m.category && m.category.toLowerCase().includes(query)) ||
            (m.about && m.about.toLowerCase().includes(query));
        return matchCat && matchCity && matchText;
    });

    filtered.sort((a, b) => {
        if (sortBy === "experience") return (b.experience || 0) - (a.experience || 0);
        if (sortBy === "reviews") return (b.ratingCount || 0) - (a.ratingCount || 0);
        return (b.rating || 0) - (a.rating || 0);
    });

    const countLabel = document.getElementById("mastersCountLabel");
    if (countLabel) countLabel.innerText = `${filtered.length} etibarlı usta mövcuddur`;

    renderMasterCardsGrid(filtered, "mastersGrid");
}

async function loadSavedMastersView() {
    const main = document.getElementById("mainContent");
    main.innerHTML = `
        <div>
            <h1 class="text-2xl font-extrabold text-slate-900 tracking-tight">Seçilmiş ustalar</h1>
            <p class="text-xs sm:text-sm text-slate-500 mt-1">Gələcək işlər üçün yadda saxladığınız etibarlı ustalar.</p>
        </div>
        <div id="savedMastersGrid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            ${renderSkeletonCards(3)}
        </div>
    `;

    if (allMasters.length === 0) {
        try {
            const res = await fetch(`${BASE_URL}/api/masters`);
            allMasters = await res.json();
        } catch (e) { /* ignore */ }
    }

    const savedIds = getSavedMasterIds();
    const savedList = allMasters.filter(m => savedIds.includes(m.id));
    renderMasterCardsGrid(savedList, "savedMastersGrid", true);
}

function renderMasterCardsGrid(list, containerId, isSavedView = false) {
    const grid = document.getElementById(containerId);
    if (!grid) return;

    if (list.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full bg-white p-12 rounded-2xl border border-[#E6EAE7] text-center space-y-2.5">
                <i data-lucide="${isSavedView ? "heart" : "search-x"}" class="w-9 h-9 text-slate-300 mx-auto"></i>
                <p class="font-bold text-slate-800">${isSavedView ? "Hələ seçilmiş ustanız yoxdur" : "Uyğun usta tapılmadı"}</p>
                <p class="text-xs text-slate-500">${isSavedView ? "Ustaların profilindən 'Yadda saxla' düyməsinə basaraq siyahı yarada bilərsiniz." : "Axtarış sözünü və ya kateqoriyanı dəyişərək yenidən yoxlayın."}</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    const savedIds = getSavedMasterIds();

    grid.innerHTML = list.map(m => {
        const isSaved = savedIds.includes(m.id);
        return `
            <div class="bg-white p-5 rounded-2xl border border-[#E6EAE7] hover:border-[#1F563D]/40 hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                    <div class="flex items-start justify-between gap-2">
                        <div class="flex items-center gap-3.5 min-w-0">
                            <img src="${getAvatarUrl(m)}" onclick="openMasterProfile(${m.id})"
                                class="w-14 h-14 rounded-full object-cover border border-[#DCE2DE] cursor-pointer shrink-0">
                            <div class="min-w-0">
                                <h3 onclick="openMasterProfile(${m.id})"
                                    class="font-bold text-base text-slate-900 hover:text-[#1F563D] cursor-pointer truncate">
                                    ${escapeHtml(m.fullName)}
                                </h3>
                                <p class="text-xs font-semibold text-[#1F563D] mt-0.5">${escapeHtml(m.category || "Usta")}</p>
                            </div>
                        </div>
                        <button type="button" onclick="toggleSaveMaster(${m.id})" title="Yadda saxla"
                            class="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition shrink-0">
                            <i data-lucide="heart" class="w-4 h-4 ${isSaved ? "fill-red-500 text-red-500" : ""}"></i>
                        </button>
                    </div>

                    <p class="text-xs text-slate-500 mt-3.5">
                        ${escapeHtml(m.city || "Bakı")} <span class="mx-1">·</span> ${m.experience || 0} il təcrübə
                    </p>

                    <div class="flex items-center justify-between mt-2 text-xs">
                        <span class="inline-flex items-center gap-1 font-bold text-slate-800">
                            <i data-lucide="star" class="w-3.5 h-3.5 fill-amber-400 text-amber-400"></i>
                            ${m.rating > 0 ? m.rating.toFixed(1) : "Yeni"}
                            <span class="font-normal text-slate-400">(${m.ratingCount || 0} rəy)</span>
                        </span>
                        <span class="font-bold text-slate-700">Zəmanətli iş</span>
                    </div>

                    <div class="flex items-center gap-1.5 text-[11px] font-semibold text-[#1F563D] mt-2.5">
                        <span class="w-1.5 h-1.5 rounded-full bg-[#1F563D]"></span>
                        <span>Bu gün aktivdir</span>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-2.5 mt-4 pt-4 border-t border-[#F0F3F1]">
                    <button onclick="openMasterProfile(${m.id})"
                        class="h-9 rounded-xl bg-[#EBF2EE] hover:bg-[#DCE7E1] text-[#1F563D] text-xs font-bold transition">
                        Profilə bax
                    </button>
                    <button onclick="openCreateOrderModal(${m.id})"
                        class="h-9 rounded-xl bg-[#1F563D] hover:bg-[#184430] text-white text-xs font-bold flex items-center justify-center gap-1 transition">
                        <span>Sifariş ver</span>
                        <i data-lucide="arrow-up-right" class="w-3.5 h-3.5"></i>
                    </button>
                </div>
            </div>
        `;
    }).join("");
    lucide.createIcons();
}

function renderSkeletonCards(count) {
    return Array.from({ length: count }).map(() => `
        <div class="bg-white p-5 rounded-2xl border border-[#E6EAE7] animate-pulse space-y-3">
            <div class="flex items-center gap-3">
                <div class="w-14 h-14 rounded-full bg-slate-200"></div>
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
// DETALLI USTA PROFİLİ SƏHİFƏSİ (FIGMA 04)
// =========================================================
async function openMasterProfile(masterId) {
    const master = allMasters.find(m => m.id === masterId);
    if (!master) return;

    const main = document.getElementById("mainContent");
    main.innerHTML = renderSkeletonCards(2);
    window.scrollTo({ top: 0, behavior: "smooth" });

    let reviews = [];
    try {
        const res = await fetch(`${BASE_URL}/api/masters/${masterId}/reviews`);
        if (res.ok) reviews = await res.json();
    } catch (e) { /* ignore */ }

    const photos = master.portfolioUrls ? master.portfolioUrls.split("||").filter(Boolean) : [];
    const isSaved = getSavedMasterIds().includes(master.id);

    main.innerHTML = `
        <!-- Geri Qayıt Zolağı -->
        <div class="flex items-center gap-2 text-xs text-slate-500">
            <button onclick="loadMastersView()" class="hover:text-[#1F563D] font-bold flex items-center gap-1">
                <i data-lucide="arrow-left" class="w-3.5 h-3.5"></i> Bütün ustalara qayıt
            </button>
            <span>/</span>
            <span>${escapeHtml(master.category || "Usta")}</span>
            <span>/</span>
            <span class="text-slate-900 font-semibold">${escapeHtml(master.fullName)}</span>
        </div>

        <!-- Üst Profil Başlıq Kartı -->
        <div class="bg-white p-6 rounded-2xl border border-[#E6EAE7] flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div class="flex items-center gap-5">
                <img src="${getAvatarUrl(master)}" class="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border border-[#DCE2DE] shrink-0">
                <div class="space-y-1">
                    <div class="flex flex-wrap items-center gap-2.5">
                        <h1 class="text-xl sm:text-2xl font-extrabold text-slate-900">${escapeHtml(master.fullName)}</h1>
                        <span class="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#EBF2EE] text-[#1F563D]">
                            <i data-lucide="check" class="w-3 h-3"></i> Təsdiqlənmiş usta
                        </span>
                    </div>
                    <p class="text-sm font-bold text-[#1F563D]">${escapeHtml(master.category || "Peşəkar usta")}</p>
                    <p class="text-xs text-slate-500">${escapeHtml(master.city || "Bakı")} · ${master.experience || 0} il təcrübə</p>
                    <div class="flex items-center gap-1.5 text-xs font-bold text-slate-800 pt-1">
                        <i data-lucide="star" class="w-4 h-4 fill-amber-400 text-amber-400"></i>
                        <span>${master.rating > 0 ? master.rating.toFixed(1) : "Yeni"}</span>
                        <span class="text-slate-400 font-normal">· ${master.ratingCount || 0} müştəri rəyi</span>
                    </div>
                </div>
            </div>

            <div class="flex flex-wrap items-center gap-6 lg:border-l lg:border-[#E6EAE7] lg:pl-6">
                <div>
                    <p class="text-xl font-extrabold text-slate-900">${master.experience || 0} il</p>
                    <p class="text-[11px] text-slate-500">İş təcrübəsi</p>
                </div>
                <div>
                    <p class="text-xl font-extrabold text-slate-900">${master.ratingCount || 0}</p>
                    <p class="text-[11px] text-slate-500">Rəy sayı</p>
                </div>
                <div class="flex flex-col items-end gap-2 ml-auto lg:ml-2">
                    <button id="saveProBtn_${master.id}" onclick="toggleSaveMaster(${master.id})"
                        class="px-3.5 py-2 rounded-xl border border-[#DCE2DE] hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-1.5 transition">
                        <i data-lucide="heart" class="w-3.5 h-3.5 ${isSaved ? "fill-red-500 text-red-500" : ""}"></i>
                        <span>${isSaved ? "Yadda saxlanılıb" : "Yadda saxla"}</span>
                    </button>
                    <span class="text-[11px] font-bold text-[#1F563D] flex items-center gap-1.5">
                        <span class="w-2 h-2 rounded-full bg-[#1F563D]"></span> Bu gün aktivdir
                    </span>
                </div>
            </div>
        </div>

        <!-- 2 Sütunlu Profil Bədəni + Sağ Sifariş Paneli -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            
            <!-- Sol 2 Sütun: Haqqında, Portfolio, Rəylər -->
            <div class="lg:col-span-2 space-y-6">
                <div class="bg-white p-6 rounded-2xl border border-[#E6EAE7] space-y-6">
                    <div>
                        <h2 class="text-base font-extrabold text-slate-900 mb-2">Haqqımda</h2>
                        <p class="text-sm text-slate-600 leading-relaxed">
                            ${escapeHtml(master.about || "Peşəkar, səliqəli və zəmanətli xidmət göstərilir. Hər növ təmir və quraşdırma işləri üçün müraciət edə bilərsiniz.")}
                        </p>
                    </div>

                    <div class="pt-5 border-t border-[#F0F3F1]">
                        <div class="flex items-center justify-between mb-3">
                            <h2 class="text-base font-extrabold text-slate-900">Son işlər (${photos.length})</h2>
                        </div>
                        ${photos.length > 0 ? `
                            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                ${photos.map(url => `
                                    <img src="${url}" onclick="openLightbox('${url}')"
                                        class="w-full h-36 rounded-2xl object-cover border border-[#E6EAE7] cursor-zoom-in hover:opacity-90 transition">
                                `).join("")}
                            </div>
                        ` : `<p class="text-xs text-slate-400 bg-[#FAFBF9] p-4 rounded-xl border border-[#E6EAE7]">Usta hələ portfolio şəkli yükləməyib.</p>`}
                    </div>

                    <div class="pt-5 border-t border-[#F0F3F1] space-y-3">
                        <div class="flex items-center justify-between">
                            <h2 class="text-base font-extrabold text-slate-900">Müştəri rəyləri</h2>
                            <span class="text-xs font-bold text-slate-600">⭐ ${master.rating > 0 ? master.rating.toFixed(1) : "0.0"} · ${reviews.length} rəy</span>
                        </div>

                        ${reviews.length > 0 ? reviews.map(r => `
                            <div class="p-4 rounded-2xl bg-[#FAFBF9] border border-[#E6EAE7] space-y-2">
                                <div class="flex items-center justify-between">
                                    <span class="text-xs font-extrabold text-amber-500">
                                        ${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}
                                    </span>
                                    <span class="text-[11px] text-slate-400 truncate max-w-[200px]">${escapeHtml(r.description)}</span>
                                </div>
                                <p class="text-xs sm:text-sm text-slate-700 leading-relaxed">"${escapeHtml(r.review || "Rəy mətni qeyd edilməyib.")}"</p>
                                ${r.masterReply ? `
                                    <div class="p-3 rounded-xl bg-[#EBF2EE] text-xs text-slate-700 mt-2">
                                        <p class="font-bold text-[#1F563D] mb-0.5">${escapeHtml(master.fullName)} cavabı:</p>
                                        <p>${escapeHtml(r.masterReply)}</p>
                                    </div>
                                ` : ""}
                            </div>
                        `).join("") : `<p class="text-xs text-slate-400 bg-[#FAFBF9] p-4 rounded-xl border border-[#E6EAE7]">Bu usta üçün hələ rəy yazılmayıb.</p>`}
                    </div>
                </div>
            </div>

            <!-- Sağ Sütun: Birbaşa Sifariş Kartı -->
            <div class="space-y-4 lg:sticky lg:top-24">
                <div class="bg-white p-6 rounded-2xl border border-[#E6EAE7] shadow-sm space-y-4">
                    <div>
                        <h3 class="text-lg font-extrabold text-slate-900">Gəlin həll edək.</h3>
                        <p class="text-xs text-slate-500 mt-0.5">Ustaya birbaşa sifariş göndərin və qiymət təklifi alın.</p>
                    </div>

                    <form onsubmit="submitInlineOrder(event, ${master.id})" class="space-y-3">
                        <div>
                            <label class="block text-[11px] font-bold text-slate-700 mb-1">Nə işdə kömək lazımdır? *</label>
                            <textarea id="inlineOrderDesc" rows="3" required placeholder="Problemi qısaca təsvir edin..."
                                class="w-full p-3 rounded-xl border border-[#DCE2DE] text-xs focus:outline-none focus:border-[#1F563D]"></textarea>
                        </div>
                        <div>
                            <label class="block text-[11px] font-bold text-slate-700 mb-1">Uyğun vaxt</label>
                            <select id="inlineOrderUrgency" class="input-field bg-white text-xs">
                                <option value="Bu gün təcili">Bu gün təcili</option>
                                <option value="Sabah gün ərzində">Sabah gün ərzində</option>
                                <option value="Həftəsonu">Həftəsonu</option>
                                <option value="Razılaşma yolu ilə">Razılaşma yolu ilə</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-[11px] font-bold text-slate-700 mb-1">Ünvanınız *</label>
                            <input id="inlineOrderAddress" type="text" required value="${escapeHtml(currentUser.city ? currentUser.city + ", " : "")}"
                                placeholder="Ünvanı qeyd edin" class="input-field text-xs">
                        </div>
                        <button type="submit" id="btnInlineOrder"
                            class="w-full h-11 rounded-xl bg-[#1F563D] hover:bg-[#184430] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition">
                            <span>${escapeHtml(master.fullName.split(" ")[0])} ustaya sifariş ver</span>
                            <i data-lucide="arrow-up-right" class="w-4 h-4"></i>
                        </button>
                    </form>

                    <a href="tel:${escapeHtml(master.phone)}"
                        class="w-full h-10 rounded-xl bg-[#EBF2EE] hover:bg-[#DCE7E1] text-[#1F563D] text-xs font-bold flex items-center justify-center gap-1.5 transition">
                        <i data-lucide="phone" class="w-3.5 h-3.5"></i> Zəng et (${escapeHtml(master.phone)})
                    </a>
                </div>

                <div class="bg-[#EBF2EE] p-5 rounded-2xl border border-[#DCE4DF] space-y-2.5">
                    <p class="text-xs font-extrabold text-[#1F563D]">Keyfiyyətli iş. Təxminlərə yer yoxdur.</p>
                    <ul class="space-y-1.5 text-[11px] text-[#1F563D]/90 font-medium">
                        <li class="flex items-center gap-1.5"><i data-lucide="check" class="w-3.5 h-3.5"></i> Şəxsiyyəti yoxlanılmış peşəkar</li>
                        <li class="flex items-center gap-1.5"><i data-lucide="check" class="w-3.5 h-3.5"></i> İş başlamazdan əvvəl dəqiq qiymət</li>
                        <li class="flex items-center gap-1.5"><i data-lucide="check" class="w-3.5 h-3.5"></i> Sifariş daxili təhlükəsiz yazışma</li>
                    </ul>
                </div>
            </div>
        </div>
    `;
    lucide.createIcons();
}

async function submitInlineOrder(e, masterId) {
    e.preventDefault();
    const desc = document.getElementById("inlineOrderDesc").value.trim();
    const urgency = document.getElementById("inlineOrderUrgency").value;
    const address = document.getElementById("inlineOrderAddress").value.trim();
    const btn = document.getElementById("btnInlineOrder");

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
        showToast("Sifarişiniz ustaya göndərildi!", "success");
        switchTab("customerOrders");
    } catch (err) {
        showToast(err.message, "error");
        btn.disabled = false;
        btn.innerText = "Sifariş ver";
    }
}

// =========================================================
// BÖLMƏ 2: MÜŞTƏRİNİN SİFARİŞLƏRİ (FIGMA 05)
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
    main.innerHTML = renderSkeletonCards(3);

    if (allMasters.length === 0) {
        try {
            const mRes = await fetch(`${BASE_URL}/api/masters`);
            allMasters = await mRes.json();
        } catch (e) { /* ignore */ }
    }

    const res = await fetch(`${BASE_URL}/api/orders/customer/${currentUser.id}`);
    const orders = await res.json();

    const activeCount = orders.filter(o => o.status === "QEBUL_EDILDI").length;
    const pendingCount = orders.filter(o => o.status === "GOZLEMEDE").length;
    const completedCount = orders.filter(o => o.status === "TAMAMLANDI").length;

    const filteredOrders = orders.filter(o => {
        if (customerOrderFilter === "PENDING") return o.status === "GOZLEMEDE";
        if (customerOrderFilter === "ACCEPTED") return o.status === "QEBUL_EDILDI";
        if (customerOrderFilter === "COMPLETED") return o.status === "TAMAMLANDI";
        return true;
    });

    const nextVisit = orders.find(o => o.status === "QEBUL_EDILDI") || orders.find(o => o.status === "GOZLEMEDE");
    const nextMaster = nextVisit ? allMasters.find(m => m.id === nextVisit.masterId) : null;

    main.innerHTML = `
        <!-- Üst Başlıq -->
        <div class="flex flex-wrap items-center justify-between gap-4">
            <div>
                <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Ev işləriniz bir arada.</h1>
                <p class="text-xs sm:text-sm text-slate-500 mt-1">Bütün sifarişlərinizi, yazışmalarınızı və qiymətləndirmələrinizi izləyin.</p>
            </div>
            <div class="flex items-center gap-2">
                <button onclick="loadCustomerOrdersView()" class="h-10 px-3.5 rounded-xl bg-white border border-[#DCE2DE] text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5">
                    <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i> Yenilə
                </button>
                <button onclick="switchTab('masters')" class="h-10 px-4 rounded-xl bg-[#1F563D] hover:bg-[#184430] text-white text-xs font-bold flex items-center gap-1.5">
                    <i data-lucide="plus" class="w-4 h-4"></i> Yeni sifariş
                </button>
            </div>
        </div>

        <!-- 2 Sütunlu Layout (Figma 05) -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            
            <!-- Sol 2 Sütun -->
            <div class="lg:col-span-2 space-y-5">
                <!-- 3 Statistika Kartı -->
                <div class="grid grid-cols-3 gap-3.5">
                    <div class="bg-white p-4 sm:p-5 rounded-2xl border border-[#E6EAE7]">
                        <p class="text-2xl font-extrabold text-slate-900">${activeCount}</p>
                        <p class="text-xs text-slate-500 mt-1">Aktiv sifarişlər</p>
                    </div>
                    <div class="bg-white p-4 sm:p-5 rounded-2xl border border-[#E6EAE7]">
                        <p class="text-2xl font-extrabold text-slate-900">${pendingCount}</p>
                        <p class="text-xs text-slate-500 mt-1">Təsdiq gözləyir</p>
                    </div>
                    <div class="bg-white p-4 sm:p-5 rounded-2xl border border-[#E6EAE7]">
                        <p class="text-2xl font-extrabold text-slate-900">${completedCount}</p>
                        <p class="text-xs text-slate-500 mt-1">Tamamlanmış</p>
                    </div>
                </div>

                <!-- Filtr Tabları -->
                <div class="flex items-center gap-6 border-b border-[#E6EAE7] text-xs font-bold overflow-x-auto">
                    <button onclick="customerOrderFilter='ALL'; loadCustomerOrdersView()" class="pb-3 border-b-2 ${customerOrderFilter === "ALL" ? "border-[#1F563D] text-slate-900" : "border-transparent text-slate-400"}">
                        Hamısı (${orders.length})
                    </button>
                    <button onclick="customerOrderFilter='PENDING'; loadCustomerOrdersView()" class="pb-3 border-b-2 ${customerOrderFilter === "PENDING" ? "border-[#1F563D] text-slate-900" : "border-transparent text-slate-400"}">
                        Gözləmədə (${pendingCount})
                    </button>
                    <button onclick="customerOrderFilter='ACCEPTED'; loadCustomerOrdersView()" class="pb-3 border-b-2 ${customerOrderFilter === "ACCEPTED" ? "border-[#1F563D] text-slate-900" : "border-transparent text-slate-400"}">
                        Qəbul edildi (${activeCount})
                    </button>
                    <button onclick="customerOrderFilter='COMPLETED'; loadCustomerOrdersView()" class="pb-3 border-b-2 ${customerOrderFilter === "COMPLETED" ? "border-[#1F563D] text-slate-900" : "border-transparent text-slate-400"}">
                        Tamamlandı (${completedCount})
                    </button>
                </div>

                <!-- Sifariş Kartları -->
                <div class="space-y-4">
                    ${filteredOrders.length === 0 ? `
                        <div class="bg-white p-10 rounded-2xl border border-[#E6EAE7] text-center space-y-3">
                            <i data-lucide="clipboard" class="w-9 h-9 text-slate-300 mx-auto"></i>
                            <p class="font-bold text-slate-800">Bu bölmədə sifariş yoxdur</p>
                            <button onclick="switchTab('masters')" class="px-5 py-2.5 rounded-xl bg-[#1F563D] text-white text-xs font-bold">Usta tap</button>
                        </div>
                    ` : filteredOrders.map(o => {
                        const master = allMasters.find(m => m.id === o.masterId);
                        const masterTitle = master ? `${master.fullName} (${master.category})` : `Usta #${o.masterId}`;
                        const masterAvatar = getAvatarUrl(master);
                        const masterPhone = master ? master.phone : "";

                        return `
                            <div class="bg-white p-5 rounded-2xl border border-[#E6EAE7] space-y-4">
                                <div class="flex items-start justify-between gap-4">
                                    <div class="space-y-1.5">
                                        <div class="flex items-center gap-2">
                                            <span class="text-[11px] font-bold text-slate-400">#SİF-${o.id}</span>
                                            ${getStatusBadge(o.status)}
                                        </div>
                                        <h3 class="font-extrabold text-base text-slate-900">${escapeHtml(o.description)}</h3>
                                        <p class="text-xs text-slate-500">
                                            Usta: <span class="font-bold text-slate-700">${escapeHtml(masterTitle)}</span> · ${escapeHtml(o.address)}
                                        </p>
                                    </div>
                                    <div class="text-right shrink-0">
                                        <p class="text-lg font-extrabold text-slate-900">${o.price ? `${o.price} AZN` : "—"}</p>
                                        <p class="text-[10px] text-slate-400">${o.price ? "Razılaşdırılmış qiymət" : "Qiymət gözlənilir"}</p>
                                    </div>
                                </div>

                                <div class="flex flex-wrap items-center gap-2 pt-3 border-t border-[#F0F3F1]">
                                    ${master ? `
                                        <a href="tel:${escapeHtml(master.phone)}" class="px-3.5 h-9 rounded-xl bg-[#EBF2EE] hover:bg-[#DCE7E1] text-[#1F563D] text-xs font-bold flex items-center gap-1.5">
                                            <i data-lucide="phone" class="w-3.5 h-3.5"></i> Zəng
                                        </a>
                                    ` : ""}

                                    <button onclick="openChat(${o.id}, '${escapeHtml(masterTitle)}', '${escapeHtml(o.description)}', '${escapeHtml(masterAvatar)}', '${escapeHtml(masterPhone)}')"
                                        class="px-3.5 h-9 rounded-xl bg-[#EBF2EE] hover:bg-[#DCE7E1] text-[#1F563D] text-xs font-bold flex items-center gap-1.5">
                                        <i data-lucide="message-square" class="w-3.5 h-3.5"></i> Mesaj
                                    </button>

                                    ${o.status === "GOZLEMEDE" ? `
                                        <button onclick="cancelOrderByCustomer(${o.id})"
                                            class="px-3.5 h-9 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold ml-auto">
                                            Ləğv et
                                        </button>
                                    ` : ""}

                                    ${o.status === "TAMAMLANDI" && !o.rating ? `
                                        <button onclick="openRateModal(${o.id})"
                                            class="px-4 h-9 rounded-xl bg-[#1F563D] hover:bg-[#184430] text-white text-xs font-bold flex items-center gap-1.5 ml-auto">
                                            <span>Qiymətləndir</span>
                                            <i data-lucide="arrow-up-right" class="w-3.5 h-3.5"></i>
                                        </button>
                                    ` : ""}
                                </div>

                                ${o.rating ? `
                                    <div class="p-3.5 rounded-xl bg-[#FAFBF9] border border-[#E6EAE7] text-xs space-y-1.5">
                                        <div class="flex items-center gap-2">
                                            <span class="font-bold text-slate-700">Sizin rəyiniz:</span>
                                            <span class="text-amber-500 font-bold">${"★".repeat(o.rating)} (${o.rating}/5)</span>
                                        </div>
                                        ${o.review ? `<p class="text-slate-600 italic">"${escapeHtml(o.review)}"</p>` : ""}
                                        ${o.masterReply ? `
                                            <div class="pl-3 py-1.5 border-l-2 border-[#1F563D] text-slate-700 mt-1">
                                                <span class="font-bold text-[#1F563D]">Ustanın cavabı:</span> ${escapeHtml(rReply = o.masterReply)}
                                            </div>
                                        ` : ""}
                                    </div>
                                ` : ""}
                            </div>
                        `;
                    }).join("")}
                </div>
            </div>

            <!-- Sağ Sütun: Növbəti Görüş və Məsləhət Kartı -->
            <div class="space-y-4">
                ${nextVisit ? `
                    <div class="bg-[#EBF2EE] p-6 rounded-2xl border border-[#DCE4DF] space-y-4">
                        <div>
                            <p class="text-[10px] font-extrabold uppercase tracking-wider text-[#1F563D]">NÖVBƏTİ İŞİNİZ</p>
                            <h3 class="text-lg font-extrabold text-slate-900 mt-1">${escapeHtml(nextVisit.description)}</h3>
                            <p class="text-xs text-slate-600 mt-0.5">${nextMaster ? escapeHtml(nextMaster.fullName + " · " + nextMaster.category) : "Usta təyin edilib"}</p>
                        </div>
                        <div class="pt-3 border-t border-[#DCE4DF] text-xs text-slate-700 space-y-1">
                            <p class="font-bold">${nextVisit.price ? `${nextVisit.price} AZN razılaşdırılmış qiymət` : "Qiymət təsdiqi gözlənilir"}</p>
                            <p class="text-slate-500">${escapeHtml(nextVisit.address)}</p>
                        </div>
                        <button onclick="openChat(${nextVisit.id}, '${escapeHtml(nextMaster ? nextMaster.fullName : "Usta")}', '${escapeHtml(nextVisit.description)}', '${escapeHtml(getAvatarUrl(nextMaster))}', '${escapeHtml(nextMaster ? nextMaster.phone : "")}')"
                            class="w-full h-10 rounded-xl bg-[#1F563D] hover:bg-[#184430] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition">
                            <span>Yazışmanı aç</span>
                            <i data-lucide="arrow-up-right" class="w-3.5 h-3.5"></i>
                        </button>
                    </div>
                ` : ""}

                <div class="bg-white p-6 rounded-2xl border border-[#E6EAE7] space-y-2">
                    <h4 class="text-sm font-extrabold text-slate-900">Daha rahat xidmət üçün</h4>
                    <p class="text-xs text-slate-500 leading-relaxed">
                        Usta gəlməzdən əvvəl çatda problemin şəklini və dəqiq konumunuzu paylaşın ki, usta lazım olan bütün alətləri özü ilə gətirsin.
                    </p>
                </div>
            </div>
        </div>
    `;
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
// BÖLMƏ 3: USTA PANELİ (FIGMA 06)
// =========================================================
async function loadMasterOrdersView() {
    const main = document.getElementById("mainContent");
    main.innerHTML = renderSkeletonCards(3);

    const res = await fetch(`${BASE_URL}/api/orders/master/${currentUser.id}`);
    const orders = await res.json();

    const pendingCount = orders.filter(o => o.status === "GOZLEMEDE").length;
    const activeCount = orders.filter(o => o.status === "QEBUL_EDILDI").length;
    const completedOrders = orders.filter(o => o.status === "TAMAMLANDI");
    const totalEarned = completedOrders.reduce((sum, o) => sum + (o.price || 0), 0);

    const filteredOrders = orders.filter(o => {
        if (masterOrderFilter === "PENDING") return o.status === "GOZLEMEDE";
        if (masterOrderFilter === "ACCEPTED") return o.status === "QEBUL_EDILDI";
        if (masterOrderFilter === "COMPLETED") return o.status === "TAMAMLANDI";
        return true;
    });

    const firstName = currentUser.fullName ? currentUser.fullName.split(" ")[0] : "Usta";

    main.innerHTML = `
        <!-- Üst Salamlama -->
        <div class="flex flex-wrap items-center justify-between gap-4">
            <div>
                <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Xoş gördük, ${escapeHtml(firstName)}.</h1>
                <p class="text-xs sm:text-sm text-slate-500 mt-1">Kiçik təmir işləri kiminsə gününü daha rahat edir.</p>
            </div>
            <div class="flex items-center gap-2.5">
                <button onclick="loadMasterOrdersView()" class="h-9 px-3.5 rounded-xl bg-white border border-[#DCE2DE] text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5">
                    <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i> Yenilə
                </button>
                <span class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#EBF2EE] text-[#1F563D] text-xs font-bold">
                    <span class="w-2 h-2 rounded-full bg-[#1F563D]"></span> Sifariş qəbuluna aktiv
                </span>
            </div>
        </div>

        <!-- 2 Sütunlu Layout (Figma 06) -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            
            <!-- Sol 2 Sütun -->
            <div class="lg:col-span-2 space-y-5">
                <!-- 3 Statistika Kartı -->
                <div class="grid grid-cols-3 gap-3.5">
                    <div class="bg-white p-4 sm:p-5 rounded-2xl border border-[#E6EAE7]">
                        <p class="text-2xl font-extrabold text-slate-900">${pendingCount}</p>
                        <p class="text-xs text-slate-500 mt-1">Yeni sorğular</p>
                    </div>
                    <div class="bg-white p-4 sm:p-5 rounded-2xl border border-[#E6EAE7]">
                        <p class="text-2xl font-extrabold text-slate-900">${activeCount}</p>
                        <p class="text-xs text-slate-500 mt-1">İcrada olan işlər</p>
                    </div>
                    <div class="bg-white p-4 sm:p-5 rounded-2xl border border-[#E6EAE7]">
                        <p class="text-2xl font-extrabold text-[#1F563D]">${totalEarned} ₼</p>
                        <p class="text-xs text-slate-500 mt-1">Ümumi qazanc</p>
                    </div>
                </div>

                <!-- Filtr Tabları -->
                <div class="flex items-center gap-6 border-b border-[#E6EAE7] text-xs font-bold overflow-x-auto">
                    <button onclick="masterOrderFilter='ALL'; loadMasterOrdersView()" class="pb-3 border-b-2 ${masterOrderFilter === "ALL" ? "border-[#1F563D] text-slate-900" : "border-transparent text-slate-400"}">
                        Bütün sifarişlər (${orders.length})
                    </button>
                    <button onclick="masterOrderFilter='PENDING'; loadMasterOrdersView()" class="pb-3 border-b-2 ${masterOrderFilter === "PENDING" ? "border-[#1F563D] text-slate-900" : "border-transparent text-slate-400"}">
                        Gözləmədə (${pendingCount})
                    </button>
                    <button onclick="masterOrderFilter='ACCEPTED'; loadMasterOrdersView()" class="pb-3 border-b-2 ${masterOrderFilter === "ACCEPTED" ? "border-[#1F563D] text-slate-900" : "border-transparent text-slate-400"}">
                        Qəbul edildi (${activeCount})
                    </button>
                    <button onclick="masterOrderFilter='COMPLETED'; loadMasterOrdersView()" class="pb-3 border-b-2 ${masterOrderFilter === "COMPLETED" ? "border-[#1F563D] text-slate-900" : "border-transparent text-slate-400"}">
                        Tamamlandı (${completedOrders.length})
                    </button>
                </div>

                <!-- Sifariş Kartları -->
                <div class="space-y-4">
                    ${filteredOrders.length === 0 ? `
                        <div class="bg-white p-10 rounded-2xl border border-[#E6EAE7] text-center space-y-2">
                            <i data-lucide="inbox" class="w-9 h-9 text-slate-300 mx-auto"></i>
                            <p class="font-bold text-slate-800">Bu bölmədə sifariş yoxdur</p>
                        </div>
                    ` : filteredOrders.map(o => `
                        <div class="bg-white p-5 rounded-2xl border border-[#E6EAE7] space-y-4">
                            <div class="flex items-start justify-between gap-4">
                                <div class="space-y-1.5">
                                    <div class="flex items-center gap-2">
                                        <span class="text-[11px] font-bold text-slate-400">#SİF-${o.id}</span>
                                        ${getStatusBadge(o.status)}
                                    </div>
                                    <h3 class="font-extrabold text-base text-slate-900">${escapeHtml(o.description)}</h3>
                                    <p class="text-xs text-slate-500 flex items-center gap-1">
                                        <i data-lucide="map-pin" class="w-3.5 h-3.5 text-[#1F563D]"></i>
                                        <span>Müştəri #${o.customerId} · ${escapeHtml(o.address)}</span>
                                    </p>
                                </div>
                                <div class="text-right shrink-0">
                                    <p class="text-lg font-extrabold text-slate-900">${o.price ? `${o.price} AZN` : "—"}</p>
                                    <p class="text-[10px] text-slate-400">${o.price ? "Təklif edilən qiymət" : "Qiymət təyin edilməyib"}</p>
                                </div>
                            </div>

                            <div class="flex flex-wrap items-center gap-2 pt-3 border-t border-[#F0F3F1]">
                                <button onclick="openChat(${o.id}, 'Müştəri ilə Yazışma', '${escapeHtml(o.description)}', '${escapeHtml(getAvatarUrl({ fullName: "Müştəri" }))}', '')"
                                    class="px-3.5 h-9 rounded-xl bg-[#EBF2EE] hover:bg-[#DCE7E1] text-[#1F563D] text-xs font-bold flex items-center gap-1.5">
                                    <i data-lucide="message-square" class="w-3.5 h-3.5"></i> Mesaj
                                </button>

                                ${o.status === "GOZLEMEDE" ? `
                                    <div class="flex items-center gap-2 ml-auto">
                                        <button onclick="rejectOrderByMaster(${o.id})"
                                            class="px-3.5 h-9 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600 text-xs font-bold">
                                            İmtina
                                        </button>
                                        <button onclick="openAcceptOrderModal(${o.id})"
                                            class="px-4 h-9 rounded-xl bg-[#1F563D] hover:bg-[#184430] text-white text-xs font-bold">
                                            Qəbul et & Qiymət yaz
                                        </button>
                                    </div>
                                ` : ""}

                                ${o.status === "QEBUL_EDILDI" ? `
                                    <button onclick="completeOrderByMaster(${o.id})"
                                        class="px-4 h-9 rounded-xl bg-[#1F563D] hover:bg-[#184430] text-white text-xs font-bold flex items-center gap-1.5 ml-auto">
                                        <i data-lucide="check" class="w-4 h-4"></i> İşi tamamla
                                    </button>
                                ` : ""}
                            </div>

                            ${o.rating ? `
                                <div class="p-3.5 rounded-xl bg-[#FAFBF9] border border-[#E6EAE7] text-xs flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <span class="font-bold text-slate-700">Müştəri rəyi: </span>
                                        <span class="text-amber-500 font-bold">${"★".repeat(o.rating)}</span>
                                        ${o.review ? `<p class="text-slate-600 italic mt-1">"${escapeHtml(o.review)}"</p>` : ""}
                                    </div>
                                    ${!o.masterReply ? `
                                        <button onclick="openReplyModal(${o.id}, '${escapeHtml(o.review || "Müştəri ulduz verdi")}')"
                                            class="px-3 py-1.5 rounded-lg bg-[#EBF2EE] text-[#1F563D] font-bold hover:bg-[#DCE7E1]">
                                            Rəyə cavab yaz
                                        </button>
                                    ` : `<span class="text-[11px] font-bold text-[#1F563D]">✓ Cavablandırılıb</span>`}
                                </div>
                            ` : ""}
                        </div>
                    `).join("")}
                </div>
            </div>

            <!-- Sağ Sütun: Qazanc Xülasəsi və Məsləhət -->
            <div class="space-y-4">
                <div class="bg-[#EBF2EE] p-6 rounded-2xl border border-[#DCE4DF] space-y-4">
                    <div>
                        <p class="text-[10px] font-extrabold uppercase tracking-wider text-[#1F563D]">QAZANC XÜLASƏSİ</p>
                        <p class="text-3xl font-extrabold text-slate-900 mt-1.5">${totalEarned} AZN</p>
                        <p class="text-xs text-slate-600 mt-0.5">${completedOrders.length} tamamlanmış iş üzrə</p>
                    </div>
                    <div class="pt-3 border-t border-[#DCE4DF] text-xs text-[#1F563D] font-semibold">
                        Orta reytinqiniz: ⭐ ${currentUser.rating > 0 ? currentUser.rating.toFixed(1) : "Yeni"} (${currentUser.ratingCount || 0} rəy)
                    </div>
                    <button onclick="switchTab('profile')"
                        class="w-full h-10 rounded-xl bg-[#1F563D] hover:bg-[#184430] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition">
                        <span>Profil və portfolionu yenilə</span>
                        <i data-lucide="arrow-up-right" class="w-3.5 h-3.5"></i>
                    </button>
                </div>

                <div class="bg-white p-6 rounded-2xl border border-[#E6EAE7] space-y-2">
                    <h4 class="text-sm font-extrabold text-slate-900">Yaxşı ilk təəssürat yaradın</h4>
                    <p class="text-xs text-slate-500 leading-relaxed">
                        Müştərilərin sorğularına çatda tez cavab vermək və portfolionuzda gördüyünüz işlərin şəkillərini paylaşmaq sifariş sayını artırır.
                    </p>
                </div>
            </div>
        </div>
    `;
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
// BÖLMƏ 4: PROFİL VƏ PORTFOLİO AYARLARI (FIGMA 08)
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

    // Profil tamamlanma faizi hesabı
    let completeness = 45;
    if (currentUser.avatarUrl) completeness += 20;
    if (currentUser.city) completeness += 10;
    if (!isMaster) completeness = currentUser.avatarUrl ? 100 : 75;
    else {
        if (currentUser.about && currentUser.about.length > 10) completeness += 15;
        if (photos.length > 0) completeness += 10;
    }

    let reviewsBlock = "";
    if (isMaster) {
        let reviews = [];
        try {
            const revRes = await fetch(`${BASE_URL}/api/masters/${currentUser.id}/reviews`);
            if (revRes.ok) reviews = await revRes.json();
        } catch (e) { /* ignore */ }

        reviewsBlock = `
            <div id="secReviews" class="bg-white p-6 rounded-2xl border border-[#E6EAE7] space-y-4">
                <div>
                    <h3 class="font-extrabold text-base text-slate-900">Müştəri rəyləri və cavablar</h3>
                    <p class="text-xs text-slate-500">Orta reytinqiniz: ⭐ <b>${currentUser.rating > 0 ? currentUser.rating.toFixed(1) : "0.0"}</b> (${currentUser.ratingCount || 0} rəy)</p>
                </div>

                <div class="space-y-3">
                    ${reviews.length > 0 ? reviews.map(r => `
                        <div class="p-4 rounded-xl bg-[#FAFBF9] border border-[#E6EAE7] space-y-2">
                            <div class="flex items-center justify-between">
                                <span class="text-xs font-extrabold text-amber-500">${"★".repeat(r.rating)} (${r.rating}/5)</span>
                                <span class="text-[11px] text-slate-400">İş: ${escapeHtml(r.description)}</span>
                            </div>
                            <p class="text-sm text-slate-800">${escapeHtml(r.review || "Rəy mətni yazılmayıb.")}</p>
                            ${r.masterReply ? `
                                <div class="pl-3 py-1.5 border-l-2 border-[#1F563D] bg-white rounded-r-lg text-xs text-slate-700">
                                    <span class="font-bold text-[#1F563D]">Sizin cavabınız:</span> ${escapeHtml(r.masterReply)}
                                </div>
                            ` : `
                                <button onclick="openReplyModal(${r.id}, '${escapeHtml(r.review || "Müştəri ulduz verdi")}')"
                                    class="text-xs font-bold text-[#1F563D] hover:underline flex items-center gap-1 pt-1">
                                    <i data-lucide="corner-down-right" class="w-3.5 h-3.5"></i> Bu rəyə cavab yaz
                                </button>
                            `}
                        </div>
                    `).join("") : `<p class="text-xs text-slate-400">Hələ ki, sizə rəy yazılmayıb.</p>`}
                </div>
            </div>
        `;
    }

    const firstName = currentUser.fullName ? currentUser.fullName.split(" ")[0] : "İstifadəçi";

    main.innerHTML = `
        <div>
            <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Profilinizi sizin üçün işlək edin.</h1>
            <p class="text-xs sm:text-sm text-slate-500 mt-1">Dəqiq məlumatlar və iş şəkilləri müştərilərin sizi seçməsini asanlaşdırır.</p>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
            
            <!-- Sol Yan Menyu + Tamamlanma Kartı (Figma 08) -->
            <div class="lg:col-span-1 space-y-4">
                <div class="bg-white p-2 rounded-2xl border border-[#E6EAE7] space-y-1 text-xs font-bold">
                    <a href="#secPublicProfile" class="block px-3.5 py-2.5 rounded-xl bg-[#EBF2EE] text-[#1F563D]">
                        Profil və məlumatlar
                    </a>
                    ${isMaster ? `
                        <a href="#secPortfolio" class="block px-3.5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-50">
                            İş portfoliosu
                        </a>
                        <a href="#secReviews" class="block px-3.5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-50">
                            Müştəri rəyləri
                        </a>
                    ` : ""}
                </div>

                <div class="bg-[#EBF2EE] p-5 rounded-2xl border border-[#DCE4DF] space-y-2.5">
                    <p class="text-xs font-extrabold text-[#1F563D]">Əla görünür, ${escapeHtml(firstName)}.</p>
                    <p class="text-[11px] text-slate-600">Profiliniz ${completeness}% tamamlanıb.</p>
                    <div class="w-full h-1.5 rounded-full bg-[#DCE4DF] overflow-hidden">
                        <div class="h-full bg-[#1F563D] rounded-full" style="width: ${completeness}%"></div>
                    </div>
                </div>
            </div>

            <!-- Sağ Əsas Ayarlar Kartları -->
            <div class="lg:col-span-3 space-y-6">
                
                <!-- Kart 1: İctimai Profil -->
                <div id="secPublicProfile" class="bg-white p-6 rounded-2xl border border-[#E6EAE7] space-y-6">
                    <div>
                        <h2 class="text-base font-extrabold text-slate-900">İctimai profil</h2>
                        <p class="text-xs text-slate-500">Müştərilər sizi axtararkən bu məlumatları görəcəklər.</p>
                    </div>

                    <!-- Avatar Yüklə və Sil -->
                    <div class="flex flex-wrap items-center gap-4 pb-5 border-b border-[#F0F3F1]">
                        <img src="${getAvatarUrl(currentUser)}" class="w-16 h-16 rounded-full object-cover border border-[#DCE2DE]">
                        <div class="space-y-1.5">
                            <div class="flex items-center gap-3">
                                <label class="cursor-pointer px-3.5 py-2 rounded-xl bg-[#EBF2EE] hover:bg-[#DCE7E1] text-[#1F563D] text-xs font-bold transition">
                                    Yeni şəkil yüklə
                                    <input type="file" accept="image/*" class="hidden" onchange="handleAvatarUpload(this)">
                                </label>
                                ${currentUser.avatarUrl ? `
                                    <button type="button" onclick="deleteAvatar()" class="text-xs font-bold text-red-600 hover:underline">
                                        Şəkli sil
                                    </button>
                                ` : ""}
                            </div>
                            <p class="text-[11px] text-slate-400">JPG və ya PNG. Maksimum 5 MB.</p>
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
                                        ${CATEGORIES.filter(c => c.name !== "Hamısı").map(c => `
                                            <option value="${c.name}" ${currentUser.category === c.name ? "selected" : ""}>${c.name}</option>
                                        `).join("")}
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-slate-700 mb-1">Təcrübə (il)</label>
                                    <input id="profExperience" type="number" min="0" value="${currentUser.experience || 0}" class="input-field">
                                </div>
                            </div>

                            <div>
                                <label class="block text-xs font-bold text-slate-700 mb-1">Haqqınızda</label>
                                <textarea id="profAbout" rows="3" class="w-full p-3.5 rounded-xl border border-[#DCE2DE] text-sm focus:outline-none focus:border-[#1F563D]">${escapeHtml(currentUser.about || "")}</textarea>
                            </div>
                        ` : ""}

                        <div class="pt-3 border-t border-[#F0F3F1] flex items-center justify-between gap-3">
                            <span class="text-[11px] text-slate-400">Dəyişikliklər ictimai profilinizdə əks olunacaq.</span>
                            <button type="submit" class="px-5 h-10 rounded-xl bg-[#1F563D] hover:bg-[#184430] text-white font-bold text-xs transition shrink-0">
                                Dəyişiklikləri yadda saxla
                            </button>
                        </div>
                    </form>
                </div>

                <!-- Kart 2: İş Portfoliosu (Figma 08 Grid) -->
                ${isMaster ? `
                    <div id="secPortfolio" class="bg-white p-6 rounded-2xl border border-[#E6EAE7] space-y-4">
                        <div>
                            <h3 class="font-extrabold text-base text-slate-900">Gördüyünüz işlər</h3>
                            <p class="text-xs text-slate-500">Ən yaxşı işlərinizin şəkillərini yükləyin (${photos.length} şəkil əlavə edilib).</p>
                        </div>

                        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            ${photos.map((url, idx) => `
                                <div class="relative h-32 rounded-2xl overflow-hidden border border-[#E6EAE7]">
                                    <img src="${url}" onclick="openLightbox('${url}')" class="w-full h-full object-cover cursor-zoom-in">
                                    <button type="button" onclick="deletePortfolioPhoto(${idx})" title="Şəkli sil"
                                        class="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/95 text-slate-700 hover:text-red-600 shadow flex items-center justify-center">
                                        <i data-lucide="x" class="w-3.5 h-3.5"></i>
                                    </button>
                                </div>
                            `).join("")}

                            <label class="cursor-pointer h-32 rounded-2xl border-2 border-dashed border-[#DCE2DE] hover:border-[#1F563D] bg-[#FAFBF9] flex flex-col items-center justify-center gap-1.5 text-center p-2 transition">
                                <i data-lucide="plus" class="w-5 h-5 text-slate-500"></i>
                                <span class="text-xs font-bold text-slate-700">İş şəkli yüklə</span>
                                <span class="text-[10px] text-slate-400">JPG, PNG · 5 MB</span>
                                <input type="file" accept="image/*" class="hidden" onchange="handlePortfolioUpload(this)">
                            </label>
                        </div>
                    </div>
                ` : ""}

                ${reviewsBlock}
            </div>
        </div>
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

async function deleteAvatar() {
    try {
        showToast("Profil şəkli silinir...", "info");
        const res = await fetch(`${BASE_URL}/api/users/${currentUser.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ avatarUrl: "" })
        });
        if (!res.ok) throw new Error("Profil şəkli silinmədi.");
        showToast("Profil şəkli silindi!", "success");
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
// BÖLMƏ 5: SİFARİŞ DAXİLİ CANLI CHAT (FIGMA 07)
// =========================================================
function openChat(orderId, title, subtitle, avatarUrl = "", phone = "") {
    activeChatOrderId = orderId;
    document.getElementById("chatHeaderTitle").innerText = title;
    document.getElementById("chatHeaderSub").innerText = `#SİF-${orderId} · ${subtitle}`;
    document.getElementById("chatHeaderAvatar").src = avatarUrl || getAvatarUrl({ fullName: title });

    const callLink = document.getElementById("chatCallLink");
    if (callLink) {
        if (phone) {
            callLink.href = `tel:${phone}`;
            callLink.classList.remove("hidden");
        } else {
            callLink.classList.add("hidden");
        }
    }

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
            box.innerHTML = `<p class="text-center text-xs text-red-600 py-8">Çat serveri cavab vermir (Xəta ${res.status})</p>`;
            return;
        }

        const messages = await res.json();
        const isNearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 100;

        if (!Array.isArray(messages) || messages.length === 0) {
            box.innerHTML = `
                <div class="text-center py-12 space-y-1">
                    <p class="text-xs font-bold text-slate-500">Hələ mesaj yoxdur</p>
                    <p class="text-[11px] text-slate-400">İşin detallarını dəqiqləşdirmək üçün mesaj, şəkil və ya konum göndərin.</p>
                </div>
            `;
            return;
        }

        box.innerHTML = messages.map(m => {
            const isMe = m.senderId === currentUser.id;
            return `
                <div class="flex flex-col ${isMe ? "items-end" : "items-start"}">
                    <span class="text-[10px] font-semibold text-slate-400 mb-1 px-1">${escapeHtml(m.senderName)}</span>
                    <div class="max-w-[78%] px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm shadow-sm ${
                        isMe
                            ? "bg-[#1F563D] text-white rounded-br-sm"
                            : "bg-[#F0F3F1] text-slate-800 border border-[#E2E7E4] rounded-bl-sm"
                    }">
                        ${m.imageUrl ? `
                            <img src="${m.imageUrl}" onclick="openLightbox('${m.imageUrl}')"
                                class="max-h-52 rounded-xl mb-1.5 cursor-zoom-in object-cover">
                        ` : ""}
                        ${m.text && m.text.startsWith("[LOCATION]") ? `
                            <a href="${escapeHtml(m.text.replace("[LOCATION]", ""))}" target="_blank" rel="noopener noreferrer"
                                class="block p-2.5 rounded-xl ${isMe ? "bg-white/15 hover:bg-white/25 text-white" : "bg-white hover:bg-slate-50 text-slate-800 border border-[#DCE2DE]"} transition space-y-1">
                                <div class="flex items-center gap-1.5 font-bold text-xs">
                                    <span class="w-2 h-2 rounded-full ${isMe ? "bg-emerald-300" : "bg-[#1F563D]"}"></span>
                                    <span>Canlı konum paylaşıldı</span>
                                </div>
                                <p class="text-[11px] opacity-80 flex items-center gap-1">
                                    <span>Google Maps-də aç</span>
                                    <i data-lucide="arrow-up-right" class="w-3 h-3"></i>
                                </p>
                            </a>
                        ` : (m.text ? `<p class="leading-relaxed break-words">${escapeHtml(m.text)}</p>` : "")}
                    </div>
                </div>
            `;
        }).join("");
        lucide.createIcons();

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

        if (!res.ok) throw new Error(`Mesaj göndərilmədi (Server xətası: ${res.status})`);

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

function sendChatLocation() {
    if (!activeChatOrderId || !currentUser) return;
    if (!navigator.geolocation) {
        showToast("Brauzeriniz konum xidmətini dəstəkləmir.", "error");
        return;
    }

    showToast("Konum müəyyən edilir...", "info");

    navigator.geolocation.getCurrentPosition(
        async (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            const mapUrl = `https://www.google.com/maps?q=${lat},${lng}`;

            try {
                const res = await fetch(`${BASE_URL}/api/orders/${activeChatOrderId}/messages`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        senderId: currentUser.id,
                        senderName: currentUser.fullName,
                        text: `[LOCATION]${mapUrl}`
                    })
                });
                if (!res.ok) throw new Error("Konum göndərilmədi.");
                fetchChatMessages(true);
            } catch (err) {
                showToast(err.message, "error");
            }
        },
        () => {
            showToast("Konum icazəsi verilmədi və ya tapılmadı.", "error");
        },
        { enableHighAccuracy: true, timeout: 10000 }
    );
}