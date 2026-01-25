// ========== Configuration ==========
// 🔐 ใส่ Google Apps Script Web App URL ที่นี่
//const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbywDP1Bam_v7r0yVwcyr49652Q7qxn4dGD_-unyhdfSxcyI6h-F_i_TS0pUmEMfQlug/exec'; // เช่น: https://script.google.com/macros/s/AKfycby.../exec




//const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby7BngFCyCXiK0OwDAZxGtSU3yTVx5ZIC4u9YBB4uEKTsrCKouW3c1yBaZ2j09xn49Y/exec';
//const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz-ykj7z-gevZKLo25ccbHmHbpoMXijbgMrjRcDgoSBDLwri5jIy7mwaWQ3gUboq-ha/exec';
//const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz-ykj7z-gevZKLo25ccbHmHbpoMXijbgMrjRcDgoSBDLwri5jIy7mwaWQ3gUboq-ha/exec';
//const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyl4CwLqgN8Z7E98REmlvvlxdCJiFbJK2PT9k21ZUoDxZTf2GzdN7YsAeA6jUpCVqjQ/exec';
//const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbynC61e9YMKVL0uBob08luWCYiOe47M2j_I8jo6w2qgrVrBceb7JlWBuKMeMBxQtgY4/exec';
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbynC61e9YMKVL0uBob08luWCYiOe47M2j_I8jo6w2qgrVrBceb7JlWBuKMeMBxQtgY4/exec';





// ========== Pagination Settings ==========
const ITEMS_PER_PAGE = 12; // จำนวนหนังสือต่อหน้า

// ========== Global Variables ==========
let allBooks = [];
let filteredBooks = [];
let currentCategory = 'all';
let currentPage = 1;
let totalPages = 1;
let userIP = 'Unknown';

// ========== User IP Fetching ==========
async function fetchUserIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        userIP = data.ip;
        console.log('User IP:', userIP);
    } catch (e) {
        console.warn('Failed to fetch IP:', e);
    }
}
fetchUserIP();

// ========== DOM Elements ==========
const loading = document.getElementById('loading');
const booksGrid = document.getElementById('booksGrid');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('searchInput');
const filterButtons = document.getElementById('filterButtons');
const bookCount = document.getElementById('bookCount');
const setupBanner = document.getElementById('setupBanner');
const bookModal = document.getElementById('bookModal');
const pagination = document.getElementById('pagination');
const paginationInfo = document.getElementById('paginationInfo');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');

// ========== Fetch Books from Google Apps Script ==========
const CACHE_KEY = 'ebook_library_data';
const CACHE_DURATION = 30 * 60 * 1000; // 30 นาที

// ========== Fetch Books with Caching ==========
async function fetchBooks() {
    // Check if Apps Script URL is configured
    if (APPS_SCRIPT_URL === 'YOUR_APPS_SCRIPT_URL_HERE') {
        loading.style.display = 'none';
        setupBanner.style.display = 'block';
        booksGrid.style.display = 'none';
        return;
    }

    try {
        // 1. Try to load from cache first
        const cachedData = getCachedData();
        if (cachedData) {
            console.log('Using cached data');
            handleDataSuccess(cachedData);

            // แม้จะมี Cache ก็ยังคงต้องไปดึงจำนวนผู้เข้าชมล่าสุดมาแสดง (โดยไม่นับเพิ่ม)
            fetchVisitorCountOnly();
            return;
        }

        // 2. Fetch from API if no cache
        await fetchFromApi();

    } catch (error) {
        console.error('Error fetching books:', error);
        showErrorState(error);
    }
}

async function fetchFromApi(isBackgroundUpdate = false) {
    if (!isBackgroundUpdate) {
        loading.style.display = 'flex';
        loading.innerHTML = '<div class="spinner"></div><div class="loading-text">กำลังดาวน์โหลดข้อมูลล่าสุด...</div>';
    }

    // ตรวจสอบว่าในเซสชันนี้เคยนับยอดผู้เข้าชมไปหรือยัง
    const hasBeenCounted = sessionStorage.getItem('v_counted');
    const shouldInc = !hasBeenCounted;

    // ส่งพารามิเตอร์ inc=1 เพื่อสั่งให้ฝั่ง Server เพิ่มยอด (เฉพาะครั้งแรกของเซสชัน)
    // เพิ่มการส่ง IP และ User Agent ไปบันทึก
    const url = `${APPS_SCRIPT_URL}${APPS_SCRIPT_URL.includes('?') ? '&' : '?'}inc=${shouldInc ? '1' : '0'}&ip=${userIP}&ua=${encodeURIComponent(navigator.userAgent)}`;
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error('Failed to fetch data from Google Apps Script');
    }

    const result = await response.json();

    if (!result.success) {
        throw new Error(result.error || result.message || 'Unknown error from server');
    }

    if (!result.data || result.data.length === 0) {
        showEmptyState();
        return;
    }

    // Display visitor count
    if (result.visitorCount !== undefined && result.visitorCount !== null) {
        console.log('Visitor Count:', result.visitorCount);
        document.getElementById('visitorCountVal').textContent = result.visitorCount.toLocaleString();
        // บันทึกว่านับแล้วในเซสชันนี้
        if (shouldInc) {
            sessionStorage.setItem('v_counted', 'true');
        }
    } else {
        console.warn('visitorCount is missing in API response');
    }

    // Save to cache
    saveToCache(result.data);

    // Update UI
    handleDataSuccess(result.data);
}

/**
 * ดึงเฉพาะจำนวนผู้เข้าชมมาแสดง (ใช้เมื่อโหลดหนังสือจาก Cache)
 */
async function fetchVisitorCountOnly() {
    try {
        // ส่ง inc=0 เพื่อไม่อัปเดตยอด (นับเฉพาะ Read)
        const url = `${APPS_SCRIPT_URL}${APPS_SCRIPT_URL.includes('?') ? '&' : '?'}inc=0&ip=${userIP}`;
        const response = await fetch(url);
        if (response.ok) {
            const result = await response.json();
            if (result.success && (result.visitorCount !== undefined && result.visitorCount !== null)) {
                document.getElementById('visitorCountVal').textContent = result.visitorCount.toLocaleString();
            }
        }
    } catch (e) {
        console.warn('Failed to fetch visitor count only', e);
    }
}

function handleDataSuccess(data) {
    // Data already comes as objects from Apps Script
    allBooks = data;
    filteredBooks = [...allBooks];

    // Create category filters
    createCategoryFilters();

    // Reset to first page
    currentPage = 1;

    // Display books
    displayBooks();

    // Update book count
    updateBookCount();

    // Hide loading, show grid
    loading.style.display = 'none';
    booksGrid.style.display = 'grid';
    pagination.style.display = 'flex';
}

// ========== Cache Helpers ==========
function getCachedData() {
    const json = localStorage.getItem(CACHE_KEY);
    if (!json) return null;

    try {
        const { data, timestamp } = JSON.parse(json);
        const now = new Date().getTime();

        // Check if cache is expired
        if (now - timestamp > CACHE_DURATION) {
            console.log('Cache expired');
            localStorage.removeItem(CACHE_KEY);
            return null;
        }

        return data;
    } catch (e) {
        console.error('Error parsing cache', e);
        return null;
    }
}

function saveToCache(data) {
    const cacheObject = {
        data: data,
        timestamp: new Date().getTime()
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheObject));
}

function showErrorState(error) {
    loading.innerHTML = `
        <div style="color: white; text-align: center;">
            <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
            <h3>เกิดข้อผิดพลาด</h3>
            <p>ไม่สามารถโหลดข้อมูลได้ กรุณาตรวจสอบ Apps Script URL หรือ การเชื่อมต่ออินเทอร์เน็ต</p>
            <p style="font-size: 0.9rem; margin-top: 1rem; opacity: 0.8;">${error.message}</p>
            <button onclick="localStorage.removeItem(CACHE_KEY); location.reload();" class="btn btn-secondary" style="margin-top: 1rem;">ลองใหม่อีกครั้ง</button>
        </div>
    `;
}

// ========== Check & Refresh Data ==========
function refreshData() {
    const reloadBtn = document.getElementById('reloadBtn');

    // Animate button
    reloadBtn.style.transform = 'rotate(360deg)';

    // Clear cache
    localStorage.removeItem(CACHE_KEY);

    // Clear current data & show loading
    allBooks = [];
    filteredBooks = [];
    booksGrid.innerHTML = '';
    booksGrid.style.display = 'none';
    loading.style.display = 'flex';
    bookCount.textContent = '📖 กำลังโหลด...';

    // Fetch new data
    setTimeout(() => {
        fetchBooks();
        // Reset rotation after animation
        setTimeout(() => {
            reloadBtn.style.transform = '';
        }, 500);
    }, 300); // Small delay for visual effect
}

// ========== Create Category Filter Buttons ==========
function createCategoryFilters() {
    const categories = ['all', ...new Set(allBooks.map(book => book.category))];

    filterButtons.innerHTML = categories.map(cat => `
        <button class="filter-btn ${cat === 'all' ? 'active' : ''}" 
                data-category="${cat}"
                onclick="filterByCategory('${cat}')">
            ${cat === 'all' ? 'ทั้งหมด' : cat}
        </button>
    `).join('');
}

// ========== Display Books with Pagination ==========
function displayBooks() {
    if (filteredBooks.length === 0) {
        showEmptyState();
        return;
    }

    booksGrid.style.display = 'grid';
    emptyState.style.display = 'none';
    pagination.style.display = 'flex';

    // Calculate pagination
    totalPages = Math.ceil(filteredBooks.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const booksToDisplay = filteredBooks.slice(startIndex, endIndex);

    // Display books for current page
    booksGrid.innerHTML = booksToDisplay.map((book, index) => {
        const globalIndex = startIndex + index;
        return `
        <div class="book-card" onclick="openModal(${globalIndex})">
            <img class="book-cover" src="${book.coverUrl}" alt="${book.title}" 
                 onerror="this.src='https://via.placeholder.com/280x380?text=No+Cover'">
            <div class="book-info">
                <span class="book-category">${book.category}</span>
                <h3 class="book-title">${book.title}</h3>
                <div class="book-author">
                    <span>✍️</span>
                    <span>${book.author}</span>
                </div>
                <p class="book-description">${book.description}</p>
                <div class="book-actions">
                    <button class="btn btn-primary" onclick="event.stopPropagation(); handleDownload('${book.title}', '${book.linkdownload}')">
                        📥 ดาวน์โหลด
                    </button>
                    <button class="btn btn-secondary" onclick="event.stopPropagation(); openModal(${globalIndex})">
                        📖 รายละเอียด
                    </button>
                </div>
            </div>
        </div>
    `}).join('');

    // Update pagination info
    updatePagination();

    // Scroll to top smoothly
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ========== Update Pagination Controls ==========
function updatePagination() {
    paginationInfo.textContent = `หน้า ${currentPage} / ${totalPages}`;
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
}

// ========== Change Page ==========
function changePage(direction) {
    const newPage = currentPage + direction;

    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        displayBooks();
    }
}

// ========== Filter by Category ==========
function filterByCategory(category) {
    currentCategory = category;

    // Update active button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.category === category);
    });

    // Filter books
    if (category === 'all') {
        filteredBooks = [...allBooks];
    } else {
        filteredBooks = allBooks.filter(book => book.category === category);
    }

    // Apply search if exists
    const searchTerm = searchInput.value.trim();
    if (searchTerm) {
        searchBooks(searchTerm);
    } else {
        currentPage = 1; // Reset to first page
        displayBooks();
        updateBookCount();
    }
}

// ========== Search Books ==========
function searchBooks(term) {
    const searchTerm = term.toLowerCase();

    let booksToSearch = currentCategory === 'all'
        ? allBooks
        : allBooks.filter(book => book.category === currentCategory);

    filteredBooks = booksToSearch.filter(book =>
        book.title.toLowerCase().includes(searchTerm) ||
        book.author.toLowerCase().includes(searchTerm) ||
        book.category.toLowerCase().includes(searchTerm) ||
        book.description.toLowerCase().includes(searchTerm)
    );

    currentPage = 1; // Reset to first page
    displayBooks();
    updateBookCount();
}

// ========== Search Input Event with Debounce ==========
let searchTimeout;
searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        searchBooks(e.target.value);
    }, 300); // รอ 300ms หลังพิมพ์เสร็จ
});

// ========== Update Book Count ==========
function updateBookCount() {
    const total = currentCategory === 'all'
        ? allBooks.length
        : allBooks.filter(b => b.category === currentCategory).length;
    bookCount.textContent = `📖 ${filteredBooks.length} / ${total} เล่ม`;
}

// ========== Show Empty State ==========
function showEmptyState() {
    booksGrid.style.display = 'none';
    emptyState.style.display = 'block';
    loading.style.display = 'none';
    pagination.style.display = 'none';
}

// ========== Open Modal ==========
function openModal(index) {
    const book = filteredBooks[index];

    document.getElementById('modalTitle').textContent = book.title;
    document.getElementById('modalCover').src = book.coverUrl;
    document.getElementById('modalAuthor').textContent = book.author;
    document.getElementById('modalCategory').textContent = book.category;
    document.getElementById('modalDescription').textContent = book.description;

    // Update Modal Download Button
    const dlBtn = document.getElementById('modalDownloadBtn');
    dlBtn.href = book.linkdownload; // Fallback
    dlBtn.onclick = (e) => {
        e.preventDefault();
        handleDownload(book.title, book.linkdownload);
    };

    bookModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// ========== Close Modal ==========
function closeModal() {
    bookModal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

// Close modal when clicking outside
bookModal.addEventListener('click', (e) => {
    if (e.target === bookModal) {
        closeModal();
    }
});

// Close modal with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && bookModal.classList.contains('active')) {
        closeModal();
    }
});

// ========== Keyboard Navigation for Pagination ==========
document.addEventListener('keydown', (e) => {
    // Don't trigger if modal is open or user is typing in search
    if (bookModal.classList.contains('active') || document.activeElement === searchInput) {
        return;
    }

    if (e.key === 'ArrowLeft' && currentPage > 1) {
        changePage(-1);
    } else if (e.key === 'ArrowRight' && currentPage < totalPages) {
        changePage(1);
    }
});

// ========== Handle Download Logging ==========
function handleDownload(title, link) {
    // 1. Open link immediately to avoid popup blockers
    window.open(link, '_blank');

    // 2. Log download to backend in background
    const url = `${APPS_SCRIPT_URL}${APPS_SCRIPT_URL.includes('?') ? '&' : '?'}action=download&title=${encodeURIComponent(title)}&ip=${userIP}&ua=${encodeURIComponent(navigator.userAgent)}`;
    fetch(url).catch(e => console.error('Download logging failed:', e));
}

// ========== Doughnut Menu Logic ==========
const menuOverlay = document.getElementById('menuOverlay');
const fabBtn = document.getElementById('fabBtn');

function toggleMenu() {
    menuOverlay.classList.toggle('active');
    if (menuOverlay.classList.contains('active')) {
        searchInput.focus();
        fabBtn.style.display = 'none';
    } else {
        fabBtn.style.display = 'flex';
    }
}

// Close menu when clicking outside content
menuOverlay.addEventListener('click', (e) => {
    if (e.target === menuOverlay) {
        toggleMenu();
    }
});

// Close menu with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menuOverlay.classList.contains('active')) {
        toggleMenu();
    }
});

// ========== Initialize App ==========
fetchBooks();
