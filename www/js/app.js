document.addEventListener('deviceready', onDeviceReady, false);

const api = new TransportAPI();
let currentCompany = 'all';

const mtrLineColors = {
    'TWL': '#ff0000', // 荃灣綫
    'KTL': '#1a9431', // 觀塘綫
    'ISL': '#0860a8', // 港島綫
    'TKL': '#6b208b', // 將軍澳綫
    'TCL': '#fe7f1d', // 東涌綫
    'DRL': '#f550a6', // 迪士尼綫
    'AEL': '#1c7670', // 機場快綫
    'EAL': '#53b7e8', // 東鐵綫
    'TML': '#9a3b26', // 屯馬綫
    'SIL': '#b5bd00'  // 南港島綫
};

function onDeviceReady() {
    console.log('Device ready, initializing app...');
    
    initSidebar();
    initCompanySelection();
    initSearch();
    initQuickActions();
    
    loadRoutes(currentCompany);
}

function initSidebar() {
    console.log('Initializing sidebar...');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const closeSidebar = document.getElementById('close-sidebar');

    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.add('active');
            sidebarOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    }

    if (closeSidebar) {
        closeSidebar.addEventListener('click', () => {
            sidebar.classList.remove('active');
            sidebarOverlay.classList.remove('active');
            document.body.style.overflow = '';
        });
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            sidebarOverlay.classList.remove('active');
            document.body.style.overflow = '';
        });
    }
}

function initCompanySelection() {
    console.log('Initializing company selection...');
    const companyItems = document.querySelectorAll('.sidebar-nav [data-company]');
    
    companyItems.forEach(item => {
        item.addEventListener('click', function() {
            console.log('Company selected:', this.dataset.company);
            
            companyItems.forEach(i => i.classList.remove('active'));
            
            this.classList.add('active');
            
            currentCompany = this.dataset.company;
            loadRoutes(currentCompany);
            
            document.getElementById('sidebar').classList.remove('active');
            document.getElementById('sidebar-overlay').classList.remove('active');
            document.body.style.overflow = '';
        });
    });
}

function initSearch() {
    console.log('Initializing search...');
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    
    if (searchBtn) {
        searchBtn.addEventListener('click', handleSearch);
    }
    
    if (searchInput) {
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                handleSearch();
            }
        });
    }
}

function initQuickActions() {
    console.log('Initializing quick actions...');

    const recentBtn = document.getElementById('recent-btn');
    if (recentBtn) {
        recentBtn.addEventListener('click', () => {
            console.log('Recent routes clicked');
            alert('Recent routes feature coming soon!');
        });
    }
    
    const nearbyBtn = document.getElementById('nearby-btn');
    if (nearbyBtn) {
        nearbyBtn.addEventListener('click', () => {
            console.log('Nearby clicked');
            alert('Nearby routes feature coming soon!');
        });
    }
    
}

async function loadRoutes(company) {
    console.log(`Loading routes for company: ${company}`);
    const container = document.getElementById('routes-container');
    if (!container) return;
    
    container.innerHTML = '<div class="loading">Loading routes...</div>';
    
    try {

        const tempContainer = document.createElement('div');
        let hasRoutes = false;
        
        if (company === 'all' || company === 'kmb') {
            const kmbRoutes = await api.getKmbRoutes();
            if (kmbRoutes?.data && kmbRoutes.data.length > 0) {
                displayCompanyRoutes(kmbRoutes.data, 'KMB & LWB', 'kmb', tempContainer);
                hasRoutes = true;
            }
        }
        
        if (company === 'all' || company === 'ctb') {
            const ctbRoutes = await api.getCtbRoutes();
            if (ctbRoutes?.data && ctbRoutes.data.length > 0) {
                displayCompanyRoutes(ctbRoutes.data, 'Citybus', 'ctb', tempContainer);
                hasRoutes = true;
            }
        }
        
        if (company === 'all' || company === 'nlb') {
            const nlbRoutes = await api.getNlbRoutes();
            if (nlbRoutes?.routes && nlbRoutes.routes.length > 0) {
                displayNlbRoutes(nlbRoutes.routes, 'NLB', 'nlb', tempContainer);
                hasRoutes = true;
            }
        }
		
if (company === 'all' || company === 'mtr') {
    const mtrLines = await api.getMtrLines();
    if (mtrLines?.lines && mtrLines.lines.length > 0) {
        mtrLines.lines.forEach(line => {
            const routeElement = document.createElement('div');
            routeElement.className = 'route-card';
            const lineColor = mtrLineColors[line.code] || '#000000'; // default to black if code not found
            
            routeElement.innerHTML = `
                <div class="route-header">
					<div class="route-companys mtr">MTR</div>
					<div class="route-company mtr" style="background-color: ${lineColor}"></div>
                </div>
                <div class="route-details">
                    <div class="route-direction">
                        <div class="chinese-name">${line.name_tc}</div>
                        <div class="english-name">${line.name_en}</div>
                    </div>
                </div>
            `;
            routeElement.addEventListener('click', () => {
                window.location.href = `route-detail.html?company=mtr&route=${line.code}`;
            });
            tempContainer.appendChild(routeElement);
        });
        hasRoutes = true;
    }
}
        

        if (hasRoutes) {
            container.innerHTML = '';
            container.appendChild(tempContainer);
        } else {
            container.innerHTML = '<div class="no-routes">No routes found for this company.</div>';
        }
        
    } catch (error) {
        console.error('Error loading routes:', error);
        container.innerHTML = '<div class="error-message">Failed to load routes. Please try again.</div>';
    }
}

function displayCompanyRoutes(routes, companyName, companyCode, container = document.getElementById('routes-container')) {
    console.log(`Displaying routes for ${companyName}`);
    if (!container) return;
    
    if (!routes || routes.length === 0) {
        return;
    }
    
    routes.forEach((route) => {
        const routeNum = route.route || route.route;
        const origTc = route.orig_tc || route.orig_ic;
        const origEn = route.orig_en || route.orig_en;
        const destTc = route.dest_tc || route.dest_ic;
        const destEn = route.dest_en || route.dest_en;
        
        const routeElement = document.createElement('div');
        routeElement.className = 'route-card';
        routeElement.innerHTML = `
            <div class="route-header">
                <div class="route-number">${routeNum}</div>
                <div class="route-company ${companyCode}">${companyName}</div>
            </div>
            <div class="route-details">
                <div class="route-direction">
                    <div class="route-origin">
                        <div class="chinese-name">${origTc}</div>
                        <div class="english-name">${origEn}</div>
                    </div>
                </div>
                <div class="route-arrow"><i class="fas fa-arrow-right"></i></div>
                <div class="route-direction">
                    <div class="route-destination">
                        <div class="chinese-name">${destTc}</div>
                        <div class="english-name">${destEn}</div>
                    </div>
                </div>
            </div>
            <div class="route-meta">
                <button class="view-details-btn">View Details</button>
            </div>
        `;
        
        routeElement.addEventListener('click', () => {
            window.location.href = `route-detail.html?route=${routeNum}&company=${companyCode}&orig_tc=${encodeURIComponent(origTc)}&dest_tc=${encodeURIComponent(destTc)}&orig_en=${encodeURIComponent(origEn)}&dest_en=${encodeURIComponent(destEn)}`;
        });
        
        container.appendChild(routeElement);
    });
}

function displayNlbRoutes(routes, companyName, companyCode, container = document.getElementById('routes-container')) {
    console.log(`Displaying routes for ${companyName}`);
    if (!container) return;
    
    if (!routes || routes.length === 0) {
        return;
    }
    
    routes.forEach((route) => {
        const [origTc, destTc] = route.routeName_c.split('>').map(s => s.trim());
        const [origEn, destEn] = route.routeName_e.split('>').map(s => s.trim());
        
        const routeElement = document.createElement('div');
        routeElement.className = 'route-card';
        routeElement.innerHTML = `
            <div class="route-header">
                <div class="route-number">${route.routeNo}</div>
                <div class="route-company ${companyCode}">${companyName}</div>
            </div>
            <div class="route-details">
                <div class="route-direction">
                    <div class="route-origin">
                        <div class="chinese-name">${origTc}</div>
                        <div class="english-name">${origEn}</div>
                    </div>
                </div>
                <div class="route-arrow"><i class="fas fa-arrow-right"></i></div>
                <div class="route-direction">
                    <div class="route-destination">
                        <div class="chinese-name">${destTc}</div>
                        <div class="english-name">${destEn}</div>
                    </div>
                </div>
            </div>
            <div class="route-meta">
                <button class="view-details-btn">View Details</button>
            </div>
        `;
        
        routeElement.addEventListener('click', () => {
            window.location.href = `route-detail.html?route=${route.routeId}&company=${companyCode}&orig_tc=${encodeURIComponent(origTc)}&dest_tc=${encodeURIComponent(destTc)}&orig_en=${encodeURIComponent(origEn)}&dest_en=${encodeURIComponent(destEn)}`;
        });
        
        container.appendChild(routeElement);
    });
}

function handleSearch() {
    const searchTerm = document.getElementById('search-input')?.value?.toLowerCase()?.trim();
    const container = document.getElementById('routes-container');
    
    if (!container) return;
    
    console.log('Searching for:', searchTerm || '[empty]');
    
    if (!searchTerm) {
        loadRoutes(currentCompany);
        return;
    }
    
    const routeCards = document.querySelectorAll('.route-card');
    
    if (routeCards.length === 0) {
        loadRoutes(currentCompany).then(() => {
            setTimeout(() => handleSearch(), 100);
        });
        return;
    }
    
    let hasResults = false;
    
    routeCards.forEach(card => {
        card.style.display = 'flex';
    });
    
    routeCards.forEach(card => {
        const text = card.textContent.toLowerCase();
        if (!text.includes(searchTerm)) {
            card.style.display = 'none';
        } else {
            hasResults = true;
        }
    });
    
    const noResultsElement = container.querySelector('.no-results');
    if (!hasResults) {
        if (!noResultsElement) {
            const noResultsDiv = document.createElement('div');
            noResultsDiv.className = 'no-results';
            noResultsDiv.innerHTML = `
                <i class="fas fa-search"></i>
                <p>No routes found matching "${searchTerm}"</p>
            `;
            container.appendChild(noResultsDiv);
        } else {
            noResultsElement.querySelector('p').textContent = `No routes found matching "${searchTerm}"`;
            noResultsElement.style.display = 'block';
        }
    } else if (noResultsElement) {
        noResultsElement.style.display = 'none';
    }
}