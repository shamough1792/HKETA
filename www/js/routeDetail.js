document.addEventListener('DOMContentLoaded', function() {
    const api = new TransportAPI();
    const urlParams = new URLSearchParams(window.location.search);
    const route = urlParams.get('route');
    const company = urlParams.get('company');
    let currentDirection = urlParams.get('direction') || 'outbound';
    const currentServiceType = '1';

    let currentStopId = null;
    let currentStopName = {
        en: '',
        tc: ''
    };

    const elements = {
        routeNumber: document.getElementById('detail-route-number'),
        routeCompany: document.getElementById('detail-route-company'),
        backBtn: document.getElementById('back-btn'),
        outboundBtn: document.getElementById('outbound-btn'),
        inboundBtn: document.getElementById('inbound-btn'),
        stopsList: document.getElementById('stops-list'),
        pageTitle: document.getElementById('page-title'),
        stopsCount: document.getElementById('route-stops-count'),
        etaModal: document.getElementById('eta-modal'),
        etaModalTitle: document.getElementById('eta-modal-title'),
        etaModalBody: document.getElementById('eta-modal-body'),
        etaRefreshBtn: document.getElementById('eta-refresh-btn'),
        etaCloseBtn: document.getElementById('eta-close-btn')
    };

    if (company === 'nlb') {
        const routeNo = urlParams.get('routeNo') || route;
        elements.routeNumber.textContent = routeNo;
        elements.routeCompany.textContent = 'NLB';
    } else if (company === 'mtr') {
        elements.routeNumber.textContent = route;
        elements.routeCompany.textContent = 'MTR';
    } else {
        elements.routeNumber.textContent = route;
        elements.routeCompany.textContent = company.toUpperCase();
    }
    elements.routeCompany.classList.add(company === 'nlb' ? 'nlb' : company.toLowerCase());

    document.getElementById('close-btn').addEventListener('click', () => {
        window.location.href = 'index.html';
    });


    let routeEndpoints = {
        originEn: urlParams.get('orig_en'),
        originTc: urlParams.get('orig_tc'),
        destEn: urlParams.get('dest_en'),
        destTc: urlParams.get('dest_tc'),
        routeNo: urlParams.get('routeNo')
    };

    async function loadRouteDetails() {
        try {
            elements.stopsList.innerHTML = '<div class="loading">Loading route details...</div>';

            if (company === 'mtr') {
                await handleMtrRoute();
                return;
            }

            if (company === 'nlb') {
                let routeInfo = await api.getNlbRoutes();
                if (!routeInfo?.routes) throw new Error('No NLB route information found');
                const routeData = routeInfo.routes.find(r => r.routeId === route);
                if (!routeData) throw new Error('NLB route not found');
                
                routeEndpoints = {
                    ...routeEndpoints,
                    routeNo: routeData.routeNo,
                    originEn: routeData.orig_en || routeEndpoints.originEn,
                    originTc: routeData.orig_tc || routeEndpoints.originTc,
                    destEn: routeData.dest_en || routeEndpoints.destEn,
                    destTc: routeData.dest_tc || routeEndpoints.destTc
                };
                
                elements.routeNumber.textContent = routeData.routeNo;
            } else {
                let routeInfo = company === 'ctb' 
                    ? await api.getCtbRouteInfo(route)
                    : await api.getKmbRouteInfo(route, currentDirection, currentServiceType);
                
                if (!routeInfo?.data) throw new Error('No route information found');
                
                routeEndpoints = {
                    originEn: routeInfo.data.orig_en,
                    originTc: routeInfo.data.orig_tc,
                    destEn: routeInfo.data.dest_en,
                    destTc: routeInfo.data.dest_tc,
                    routeNo: route
                };
            }
            
            updateDirectionButtons();
            await loadStopsForCurrentDirection();
            
        } catch (error) {
            console.error('Error loading route details:', error);
            elements.stopsList.innerHTML = '<div class="error-message">Failed to load route details. Please try again.</div>';
        }
    }

    async function handleMtrRoute() {
        const lineNames = {
    'AEL': { en: 'Airport Express', tc: '機場快綫' },
    'TCL': { en: 'Tung Chung Line', tc: '東涌綫' },
    'EAL': { en: 'East Rail Line', tc: '東鐵綫' },
    'TML': { en: 'Tuen Ma Line', tc: '屯馬綫' },
    'TKL': { en: 'Tseung Kwan O Line', tc: '將軍澳綫' },
    'SIL': { en: 'South Island Line', tc: '南港島綫（東段）' },
    'TWL': { en: 'Tsuen Wan Line', tc: '荃灣綫' },
    'ISL': { en: 'Island Line', tc: '港島綫' },
    'KTL': { en: 'Kwun Tong Line', tc: '觀塘綫' },
    'DRL': { en: 'Disneyland Resort Line', tc: '迪士尼綫' }
        };
        
        const lineName = lineNames[route] || { en: route, tc: route };
        const line = route;
        
        document.getElementById('page-title').textContent = `${lineName.en} | MTR`;
        
        elements.routeNumber.innerHTML = `
            <div class="route-name">
                <div class="lang-en">${lineName.en}</div>
                <div class="lang-tc">${lineName.tc}</div>
            </div>
        `;
        
        elements.routeCompany.textContent = 'MTR';
        elements.routeCompany.classList.add('mtr');
        
        elements.outboundBtn.style.display = 'none';
        elements.inboundBtn.style.display = 'none';
        
        const stations = getMtrStationsForLine(line);
        
        elements.stopsList.innerHTML = `
            <div class="mtr-station-selector">
                <div class="route-header">
                    <h2 class="lang-en">${lineName.en}</h2>
                    <h2 class="lang-tc">${lineName.tc}</h2>
                </div>
                
                <h3 class="lang-en">Select Station</h3>
                <h3 class="lang-tc">選擇車站</h3>
                
                <div class="station-select-container">
                    <select id="station-select" class="station-select">
                        <option value="">-- Select Station --</option>
                        ${stations.map(station => `
                            <option value="${station.code}">${station.name_en} / ${station.name_tc}</option>
                        `).join('')}
                    </select>
                    <button id="search-station" class="primary-btn">
                        <i class="fas fa-search"></i>
                        <span class="lang-en">Search</span>
                        <span class="lang-tc">搜尋</span>
                    </button>
                </div>
                
                <p class="station-select-hint lang-en">Or select from the station list below</p>
                <p class="station-select-hint lang-tc">或從以下車站列表中選擇</p>
                
                <div class="stations-list">
                    ${stations.map(station => `
                        <div class="station-card" data-station-code="${station.code}">
<div class="station-icon" style="background-color: ${getLineColor(line)}">
</div>
                            <div class="station-info">
                                <div class="station-name-en">${station.name_en}</div>
                                <div class="station-name-tc">${station.name_tc}</div>
                            </div>
                            <i class="fas fa-chevron-right"></i>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

function getLineColor(lineCode) {
    const colors = {
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
    return colors[lineCode] || '#4361ee'; // Default color 
}

        document.getElementById('search-station').addEventListener('click', searchStation);
        
        document.querySelectorAll('.station-card').forEach(card => {
            card.addEventListener('click', () => {
                const stationCode = card.getAttribute('data-station-code');
                document.getElementById('station-select').value = stationCode;
                searchStation();
            });
        });
        
        document.getElementById('station-select').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchStation();
            }
        });

async function searchStation() {
    const station = document.getElementById('station-select').value;
    if (station) {
        const stationName = getMtrStationName(station);
        const stationCard = document.querySelector(`.station-card[data-station-code="${station}"]`);
        
        // Remove existing ETA container if it exists
        const existingEta = stationCard.nextElementSibling;
        if (existingEta && existingEta.classList.contains('station-eta-container')) {
            existingEta.remove();
        }

        const loadingHTML = `
            <div class="station-eta-container loading">
                <div class="lang-en">Loading schedule for ${stationName.name_en}...</div>
                <div class="lang-tc">正在載入 ${stationName.name_tc} 的時間表...</div>
            </div>
        `;
        
        stationCard.insertAdjacentHTML('afterend', loadingHTML);
        
        try {
            const etaData = await api.getMtrSchedule(route, station);
            displayMtrEta(etaData, station, stationCard);
        } catch (error) {
            const loadingElement = stationCard.nextElementSibling;
            if (loadingElement && loadingElement.classList.contains('loading')) {
                loadingElement.outerHTML = `
                    <div class="station-eta-container error-message">
                        <div class="lang-en">Failed to load schedule</div>
                        <div class="lang-tc">無法載入時間表</div>
                    </div>
                `;
            }
            console.error('Error fetching MTR schedule:', error);
        }
    } else {
        document.querySelectorAll('.station-eta-container').forEach(eta => eta.remove());
    }
}

async function displayMtrEta(etaData, station, stationCard) {
    const loadingElement = stationCard.nextElementSibling;
    if (loadingElement && loadingElement.classList.contains('loading')) {
        loadingElement.remove();
    }

    const container = document.createElement('div');
    container.className = 'station-eta-container';
    
    container.innerHTML = `
        <div class="eta-header-container">
            <button class="station-eta-close-btn">
                <i class="fas fa-times"></i>
            </button>
            <div class="station-name">
                <div class="lang-en">${getMtrStationName(station).name_en}</div>
                <div class="lang-tc">${getMtrStationName(station).name_tc}</div>
            </div>
            <button class="station-refresh-eta-btn" data-line="${route}" data-station="${station}">
                <i class="fas fa-sync-alt"></i>
                <span class="lang-en">Refresh</span>
                <span class="lang-tc">刷新</span>
            </button>
        </div>
        <div class="eta-content"></div>
    `;
    
    const etaContent = container.querySelector('.eta-content');
    
    if (!etaData || !etaData.data || etaData.status === 0) {
        etaContent.innerHTML = `
            <div class="error-message">
                <div class="lang-en">No schedule data available</div>
                <div class="lang-tc">沒有班次資料</div>
            </div>
        `;
        stationCard.after(container);
        return;
    }

    const stationKey = `${route}-${station}`;
    const stationData = etaData.data[stationKey];
    
    if (!stationData) {
        etaContent.innerHTML = `
            <div class="error-message">
                <div class="lang-en">No data for this station</div>
                <div class="lang-tc">此車站沒有資料</div>
            </div>
        `;
        stationCard.after(container);
        return;
    }

    const directions = ['UP', 'DOWN'];
    const stationName = getMtrStationName(station);
    
    directions.forEach(dir => {
        if (stationData[dir] && stationData[dir].length > 0) {
            const dirElement = document.createElement('div');
            dirElement.className = 'mtr-direction';
            
            const directionName = getDirectionName(route, dir);
            
            dirElement.innerHTML = `
                <h4>
                    <span class="lang-en">${directionName.en}</span>
                    <span class="lang-tc">${directionName.tc}</span>
                </h4>
                <div class="mtr-eta-list">
                    ${stationData[dir].map(eta => {
                        let timeText;
                        if (eta.ttnt < 0) {
                            timeText = `<span class="lang-en">Departed </span><span class="lang-tc">已開出</span>`;
                        } else if (eta.ttnt <= 1) {
                            timeText = `<span class="lang-en">Arriving soon </span><span class="lang-tc">即將到達</span>`;
                        } else {
                            timeText = `<span class="lang-en">${eta.ttnt} min </span><span class="lang-tc">${eta.ttnt} 分鐘</span>`;
                        }
                        
                        const platformText = eta.plat 
                            ? `<div class="eta-platform">
                                   <span class="lang-en">Platform ${eta.plat}</span>
                                   <span class="lang-tc">月台 ${eta.plat}</span>
                               </div>`
                            : '';
                        
                        const itemClass = eta.ttnt < 0 ? 'departed' : '';
                        
                        return `
                        <div class="eta-item ${itemClass}">
                            <div class="eta-dest">
                                <span class="lang-en">To ${getMtrStationName(eta.dest).name_en}</span>
                                <span class="lang-tc">往 ${getMtrStationName(eta.dest).name_tc}</span>
                            </div>
                            <div class="eta-ttnt">
                                ${timeText}
                            </div>
                            ${platformText}
                        </div>
                        `;
                    }).join('')}
                </div>
            `;
            etaContent.appendChild(dirElement);
        }
    });

    // Refresh button functionality
    const refreshBtn = container.querySelector('.station-refresh-eta-btn');
    refreshBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        refreshBtn.classList.add('refreshing');
        
        try {
            const newEtaData = await api.getMtrSchedule(route, station);
            container.remove();
            
            // Show loading state
            const loadingHTML = `
                <div class="station-eta-container loading">
                    <div class="lang-en">Loading updated times...</div>
                    <div class="lang-tc">正在載入更新時間...</div>
                </div>
            `;
            stationCard.insertAdjacentHTML('afterend', loadingHTML);
            
            // Small delay for better UX
            setTimeout(() => {
                displayMtrEta(newEtaData, station, stationCard);
            }, 300);
        } catch (error) {
            console.error('Refresh failed:', error);
            etaContent.innerHTML = `
                <div class="error-message">
                    <div class="lang-en">Failed to refresh</div>
                    <div class="lang-tc">更新失敗</div>
                </div>
            `;
        } finally {
            refreshBtn.classList.remove('refreshing');
        }
    });

    // Close button functionality
    const closeBtn = container.querySelector('.station-eta-close-btn');
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        container.remove();
    });

    stationCard.after(container);
    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
    }

    function getMtrStationsForLine(line) {
const stationData = {
    'AEL': [
        { code: 'HOK', name_en: 'Hong Kong', name_tc: '香港' },
        { code: 'KOW', name_en: 'Kowloon', name_tc: '九龍' },
        { code: 'TSY', name_en: 'Tsing Yi', name_tc: '青衣' },
        { code: 'AIR', name_en: 'Airport', name_tc: '機場' },
        { code: 'AWE', name_en: 'AsiaWorld-Expo', name_tc: '博覽館' }
    ],
    'TCL': [
        { code: 'HOK', name_en: 'Hong Kong', name_tc: '香港' },
        { code: 'KOW', name_en: 'Kowloon', name_tc: '九龍' },
        { code: 'OLY', name_en: 'Olympic', name_tc: '奧運' },
        { code: 'NAC', name_en: 'Nam Cheong', name_tc: '南昌' },
        { code: 'LAK', name_en: 'Lai King', name_tc: '荔景' },
        { code: 'TSY', name_en: 'Tsing Yi', name_tc: '青衣' },
        { code: 'SUN', name_en: 'Sunny Bay', name_tc: '欣澳' },
        { code: 'TUC', name_en: 'Tung Chung', name_tc: '東涌' }
    ],
    'TML': [
        { code: 'WKS', name_en: 'Wu Kai Sha', name_tc: '烏溪沙' },
        { code: 'MOS', name_en: 'Ma On Shan', name_tc: '馬鞍山' },
        { code: 'HEO', name_en: 'Heng On', name_tc: '恆安' },
        { code: 'TSH', name_en: 'Tai Shui Hang', name_tc: '大水坑' },
        { code: 'SHM', name_en: 'Shek Mun', name_tc: '石門' },
        { code: 'CIO', name_en: 'City One', name_tc: '第一城' },
        { code: 'STW', name_en: 'Sha Tin Wai', name_tc: '沙田圍' },
        { code: 'CKT', name_en: 'Che Kung Temple', name_tc: '車公廟' },
        { code: 'TAW', name_en: 'Tai Wai', name_tc: '大圍' },
        { code: 'HIK', name_en: 'Hin Keng', name_tc: '顯徑' },
        { code: 'DIH', name_en: 'Diamond Hill', name_tc: '鑽石山' },
        { code: 'KAT', name_en: 'Kai Tak', name_tc: '啟德' },
        { code: 'SUW', name_en: 'Sung Wong Toi', name_tc: '宋皇臺' },
        { code: 'TKW', name_en: 'To Kwa Wan', name_tc: '土瓜灣' },
        { code: 'HOM', name_en: 'Ho Man Tin', name_tc: '何文田' },
        { code: 'HUH', name_en: 'Hung Hom', name_tc: '紅磡' },
        { code: 'ETS', name_en: 'East Tsim Sha Tsui', name_tc: '尖東' },
        { code: 'AUS', name_en: 'Austin', name_tc: '柯士甸' },
        { code: 'NAC', name_en: 'Nam Cheong', name_tc: '南昌' },
        { code: 'MEF', name_en: 'Mei Foo', name_tc: '美孚' },
        { code: 'TWW', name_en: 'Tsuen Wan West', name_tc: '荃灣西' },
        { code: 'KSR', name_en: 'Kam Sheung Road', name_tc: '錦上路' },
        { code: 'YUL', name_en: 'Yuen Long', name_tc: '元朗' },
        { code: 'LOP', name_en: 'Long Ping', name_tc: '朗屏' },
        { code: 'TIS', name_en: 'Tin Shui Wai', name_tc: '天水圍' },
        { code: 'SIH', name_en: 'Siu Hong', name_tc: '兆康' },
        { code: 'TUM', name_en: 'Tuen Mun', name_tc: '屯門' }
    ],
    'TKL': [
        { code: 'NOP', name_en: 'North Point', name_tc: '北角' },
        { code: 'QUB', name_en: 'Quarry Bay', name_tc: '鰂魚涌' },
        { code: 'YAT', name_en: 'Yau Tong', name_tc: '油塘' },
        { code: 'TIK', name_en: 'Tiu Keng Leng', name_tc: '調景嶺' },
        { code: 'TKO', name_en: 'Tseung Kwan O', name_tc: '將軍澳' },
        { code: 'LHP', name_en: 'LOHAS Park', name_tc: '康城' },
        { code: 'HAH', name_en: 'Hang Hau', name_tc: '坑口' },
        { code: 'POA', name_en: 'Po Lam', name_tc: '寶琳' }
    ],
    'EAL': [
        { code: 'ADM', name_en: 'Admiralty', name_tc: '金鐘' },
        { code: 'EXC', name_en: 'Exhibition Centre', name_tc: '會展' },
        { code: 'HUH', name_en: 'Hung Hom', name_tc: '紅磡' },
        { code: 'MKK', name_en: 'Mong Kok East', name_tc: '旺角東' },
        { code: 'KOT', name_en: 'Kowloon Tong', name_tc: '九龍塘' },
        { code: 'TAW', name_en: 'Tai Wai', name_tc: '大圍' },
        { code: 'SHT', name_en: 'Sha Tin', name_tc: '沙田' },
        { code: 'FOT', name_en: 'Fo Tan', name_tc: '火炭' },
        { code: 'RAC', name_en: 'Racecourse', name_tc: '馬場' },
        { code: 'UNI', name_en: 'University', name_tc: '大學' },
        { code: 'TAP', name_en: 'Tai Po Market', name_tc: '大埔墟' },
        { code: 'TWO', name_en: 'Tai Wo', name_tc: '太和' },
        { code: 'FAN', name_en: 'Fanling', name_tc: '粉嶺' },
        { code: 'SHS', name_en: 'Sheung Shui', name_tc: '上水' },
        { code: 'LOW', name_en: 'Lo Wu', name_tc: '羅湖' },
        { code: 'LMC', name_en: 'Lok Ma Chau', name_tc: '落馬洲' }
    ],
    'SIL': [
        { code: 'ADM', name_en: 'Admiralty', name_tc: '金鐘' },
        { code: 'OCP', name_en: 'Ocean Park', name_tc: '海洋公園' },
        { code: 'WCH', name_en: 'Wong Chuk Hang', name_tc: '黃竹坑' },
        { code: 'LET', name_en: 'Lei Tung', name_tc: '利東' },
        { code: 'SOH', name_en: 'South Horizons', name_tc: '海怡半島' }
    ],
    'TWL': [
        { code: 'CEN', name_en: 'Central', name_tc: '中環' },
        { code: 'ADM', name_en: 'Admiralty', name_tc: '金鐘' },
        { code: 'TST', name_en: 'Tsim Sha Tsui', name_tc: '尖沙咀' },
        { code: 'JOR', name_en: 'Jordan', name_tc: '佐敦' },
        { code: 'YMT', name_en: 'Yau Ma Tei', name_tc: '油麻地' },
        { code: 'MOK', name_en: 'Mong Kok', name_tc: '旺角' },
        { code: 'PRE', name_en: 'Prince Edward', name_tc: '太子' },
        { code: 'SSP', name_en: 'Sham Shui Po', name_tc: '深水埗' },
        { code: 'CSW', name_en: 'Cheung Sha Wan', name_tc: '長沙灣' },
        { code: 'LCK', name_en: 'Lai Chi Kok', name_tc: '荔枝角' },
        { code: 'MEF', name_en: 'Mei Foo', name_tc: '美孚' },
        { code: 'LAK', name_en: 'Lai King', name_tc: '荔景' },
        { code: 'KWF', name_en: 'Kwai Fong', name_tc: '葵芳' },
        { code: 'KWH', name_en: 'Kwai Hing', name_tc: '葵興' },
        { code: 'TWH', name_en: 'Tai Wo Hau', name_tc: '大窩口' },
        { code: 'TSW', name_en: 'Tsuen Wan', name_tc: '荃灣' }
    ],
    'ISL': [
        { code: 'KET', name_en: 'Kennedy Town', name_tc: '堅尼地城' },
        { code: 'HKU', name_en: 'HKU', name_tc: '香港大學' },
        { code: 'SYP', name_en: 'Sai Ying Pun', name_tc: '西營盤' },
        { code: 'SHW', name_en: 'Sheung Wan', name_tc: '上環' },
        { code: 'CEN', name_en: 'Central', name_tc: '中環' },
        { code: 'ADM', name_en: 'Admiralty', name_tc: '金鐘' },
        { code: 'WAC', name_en: 'Wan Chai', name_tc: '灣仔' },
        { code: 'CAB', name_en: 'Causeway Bay', name_tc: '銅鑼灣' },
        { code: 'TIH', name_en: 'Tin Hau', name_tc: '天后' },
        { code: 'FOH', name_en: 'Fortress Hill', name_tc: '炮台山' },
        { code: 'NOP', name_en: 'North Point', name_tc: '北角' },
        { code: 'QUB', name_en: 'Quarry Bay', name_tc: '鰂魚涌' },
        { code: 'TAK', name_en: 'Tai Koo', name_tc: '太古' },
        { code: 'SWH', name_en: 'Sai Wan Ho', name_tc: '西灣河' },
        { code: 'SKW', name_en: 'Shau Kei Wan', name_tc: '筲箕灣' },
        { code: 'HFC', name_en: 'Heng Fa Chuen', name_tc: '杏花邨' },
        { code: 'CHW', name_en: 'Chai Wan', name_tc: '柴灣' }
    ],
    'KTL': [
        { code: 'WHA', name_en: 'Whampoa', name_tc: '黃埔' },
        { code: 'HOM', name_en: 'Ho Man Tin', name_tc: '何文田' },
        { code: 'YMT', name_en: 'Yau Ma Tei', name_tc: '油麻地' },
        { code: 'MOK', name_en: 'Mong Kok', name_tc: '旺角' },
        { code: 'PRE', name_en: 'Prince Edward', name_tc: '太子' },
        { code: 'SKM', name_en: 'Shek Kip Mei', name_tc: '石硤尾' },
        { code: 'KOT', name_en: 'Kowloon Tong', name_tc: '九龍塘' },
        { code: 'LOF', name_en: 'Lok Fu', name_tc: '樂富' },
        { code: 'WTS', name_en: 'Wong Tai Sin', name_tc: '黃大仙' },
        { code: 'DIH', name_en: 'Diamond Hill', name_tc: '鑽石山' },
        { code: 'CHH', name_en: 'Choi Hung', name_tc: '彩虹' },
        { code: 'KOB', name_en: 'Kowloon Bay', name_tc: '九龍灣' },
        { code: 'NTK', name_en: 'Ngau Tau Kok', name_tc: '牛頭角' },
        { code: 'KWT', name_en: 'Kwun Tong', name_tc: '觀塘' },
        { code: 'LAT', name_en: 'Lam Tin', name_tc: '藍田' },
        { code: 'YAT', name_en: 'Yau Tong', name_tc: '油塘' },
        { code: 'TIK', name_en: 'Tiu Keng Leng', name_tc: '調景嶺' }
    ],
	    'DRL': [
        { code: 'SUN', name_en: 'Sunny Bay', name_tc: '欣澳' },
        { code: 'DIS', name_en: 'Disneyland Resort', name_tc: '迪士尼' }
    ]
};
        
        return stationData[line] || [];
    }

    function getDirectionName(line, direction) {
        const directionNames = {
            'AEL': {
                'UP': { en: 'To Airport/AsiaWorld-Expo', tc: '往機場/博覽館' },
                'DOWN': { en: 'To Hong Kong', tc: '往香港' }
            },
            'TCL': {
                'UP': { en: 'To Tung Chung', tc: '往東涌' },
                'DOWN': { en: 'To Hong Kong', tc: '往香港' }
            },
            'EAL': {
                'UP': { en: 'To Lo Wu/Lok Ma Chau', tc: '往羅湖/落馬洲' },
                'DOWN': { en: 'To Admiralty', tc: '往金鐘' }
            },
			'TML': {
        'UP': { en: 'To Tuen Mun', tc: '往屯門' },
        'DOWN': { en: 'To Wu Kai Sha', tc: '往烏溪沙' }
    },
	'TKL': {
        'UP': { en: 'To Po Lam', tc: '往寶琳' },
        'DOWN': { en: 'To North Point', tc: '往北角' }
    },
	'SIL': {
        'UP': { en: 'To South Horizons', tc: '往海怡半島' },
        'DOWN': { en: 'To Admiralty', tc: '往金鐘' }
    },
    'TWL': {
        'UP': { en: 'To Tsuen Wan', tc: '往荃灣' },
        'DOWN': { en: 'To Central', tc: '往中環' }
    },
    'ISL': {
        'UP': { en: 'To Chai Wan', tc: '往柴灣' },
        'DOWN': { en: 'To Kennedy Town', tc: '往堅尼地城' }
    },
    'KTL': {
        'UP': { en: 'To Tiu Keng Leng', tc: '往調景嶺' },
        'DOWN': { en: 'To Whampoa', tc: '往黃埔' }
    },
    'DRL': {
        'UP': { en: 'To Sunny Bay', tc: '往欣澳' },
        'DOWN': { en: 'To Disneyland Resort', tc: '往迪士尼' }
    },
            'default': {
                'UP': { en: 'Up Direction', tc: '上行方向' },
                'DOWN': { en: 'Down Direction', tc: '下行方向' }
            }
        };
        
        return directionNames[line]?.[direction] || directionNames['default'][direction];
    }

    function getMtrStationName(code) {
const allStations = {
    'HOK': { name_en: 'Hong Kong', name_tc: '香港' },
    'KOW': { name_en: 'Kowloon', name_tc: '九龍' },
    'TSY': { name_en: 'Tsing Yi', name_tc: '青衣' },
    'AIR': { name_en: 'Airport', name_tc: '機場' },
    'AWE': { name_en: 'AsiaWorld-Expo', name_tc: '博覽館' },

    'OLY': { name_en: 'Olympic', name_tc: '奧運' },
    'NAC': { name_en: 'Nam Cheong', name_tc: '南昌' },
    'LAK': { name_en: 'Lai King', name_tc: '荔景' },
    'SUN': { name_en: 'Sunny Bay', name_tc: '欣澳' },
    'TUC': { name_en: 'Tung Chung', name_tc: '東涌' },

    'WKS': { name_en: 'Wu Kai Sha', name_tc: '烏溪沙' },
    'MOS': { name_en: 'Ma On Shan', name_tc: '馬鞍山' },
    'HEO': { name_en: 'Heng On', name_tc: '恆安' },
    'TSH': { name_en: 'Tai Shui Hang', name_tc: '大水坑' },
    'SHM': { name_en: 'Shek Mun', name_tc: '石門' },
    'CIO': { name_en: 'City One', name_tc: '第一城' },
    'STW': { name_en: 'Sha Tin Wai', name_tc: '沙田圍' },
    'CKT': { name_en: 'Che Kung Temple', name_tc: '車公廟' },
    'TAW': { name_en: 'Tai Wai', name_tc: '大圍' },
    'HIK': { name_en: 'Hin Keng', name_tc: '顯徑' },
    'DIH': { name_en: 'Diamond Hill', name_tc: '鑽石山' },
    'KAT': { name_en: 'Kai Tak', name_tc: '啟德' },
    'SUW': { name_en: 'Sung Wong Toi', name_tc: '宋皇臺' },
    'TKW': { name_en: 'To Kwa Wan', name_tc: '土瓜灣' },
    'HOM': { name_en: 'Ho Man Tin', name_tc: '何文田' },
    'ETS': { name_en: 'East Tsim Sha Tsui', name_tc: '尖東' },
    'AUS': { name_en: 'Austin', name_tc: '柯士甸' },
    'MEF': { name_en: 'Mei Foo', name_tc: '美孚' },
    'TWW': { name_en: 'Tsuen Wan West', name_tc: '荃灣西' },
    'KSR': { name_en: 'Kam Sheung Road', name_tc: '錦上路' },
    'YUL': { name_en: 'Yuen Long', name_tc: '元朗' },
    'LOP': { name_en: 'Long Ping', name_tc: '朗屏' },
    'TIS': { name_en: 'Tin Shui Wai', name_tc: '天水圍' },
    'SIH': { name_en: 'Siu Hong', name_tc: '兆康' },
    'TUM': { name_en: 'Tuen Mun', name_tc: '屯門' },

    'NOP': { name_en: 'North Point', name_tc: '北角' },
    'QUB': { name_en: 'Quarry Bay', name_tc: '鰂魚涌' },
    'YAT': { name_en: 'Yau Tong', name_tc: '油塘' },
    'TIK': { name_en: 'Tiu Keng Leng', name_tc: '調景嶺' },
    'TKO': { name_en: 'Tseung Kwan O', name_tc: '將軍澳' },
    'LHP': { name_en: 'LOHAS Park', name_tc: '康城' },
    'HAH': { name_en: 'Hang Hau', name_tc: '坑口' },
    'POA': { name_en: 'Po Lam', name_tc: '寶琳' },

    'ADM': { name_en: 'Admiralty', name_tc: '金鐘' },
    'EXC': { name_en: 'Exhibition Centre', name_tc: '會展' },
    'MKK': { name_en: 'Mong Kok East', name_tc: '旺角東' },
    'KOT': { name_en: 'Kowloon Tong', name_tc: '九龍塘' },
    'SHT': { name_en: 'Sha Tin', name_tc: '沙田' },
    'FOT': { name_en: 'Fo Tan', name_tc: '火炭' },
    'RAC': { name_en: 'Racecourse', name_tc: '馬場' },
    'UNI': { name_en: 'University', name_tc: '大學' },
    'TAP': { name_en: 'Tai Po Market', name_tc: '大埔墟' },
    'TWO': { name_en: 'Tai Wo', name_tc: '太和' },
    'FAN': { name_en: 'Fanling', name_tc: '粉嶺' },
    'SHS': { name_en: 'Sheung Shui', name_tc: '上水' },
    'LOW': { name_en: 'Lo Wu', name_tc: '羅湖' },
    'LMC': { name_en: 'Lok Ma Chau', name_tc: '落馬洲' },

    'OCP': { name_en: 'Ocean Park', name_tc: '海洋公園' },
    'WCH': { name_en: 'Wong Chuk Hang', name_tc: '黃竹坑' },
    'LET': { name_en: 'Lei Tung', name_tc: '利東' },
    'SOH': { name_en: 'South Horizons', name_tc: '海怡半島' },

    'CEN': { name_en: 'Central', name_tc: '中環' },
    'TST': { name_en: 'Tsim Sha Tsui', name_tc: '尖沙咀' },
    'JOR': { name_en: 'Jordan', name_tc: '佐敦' },
    'YMT': { name_en: 'Yau Ma Tei', name_tc: '油麻地' },
    'MOK': { name_en: 'Mong Kok', name_tc: '旺角' },
    'PRE': { name_en: 'Prince Edward', name_tc: '太子' },
    'SSP': { name_en: 'Sham Shui Po', name_tc: '深水埗' },
    'CSW': { name_en: 'Cheung Sha Wan', name_tc: '長沙灣' },
    'LCK': { name_en: 'Lai Chi Kok', name_tc: '荔枝角' },
    'KWF': { name_en: 'Kwai Fong', name_tc: '葵芳' },
    'KWH': { name_en: 'Kwai Hing', name_tc: '葵興' },
    'TWH': { name_en: 'Tai Wo Hau', name_tc: '大窩口' },
    'TSW': { name_en: 'Tsuen Wan', name_tc: '荃灣' },

    'KET': { name_en: 'Kennedy Town', name_tc: '堅尼地城' },
    'HKU': { name_en: 'HKU', name_tc: '香港大學' },
    'SYP': { name_en: 'Sai Ying Pun', name_tc: '西營盤' },
    'SHW': { name_en: 'Sheung Wan', name_tc: '上環' },
    'WAC': { name_en: 'Wan Chai', name_tc: '灣仔' },
    'CAB': { name_en: 'Causeway Bay', name_tc: '銅鑼灣' },
    'TIH': { name_en: 'Tin Hau', name_tc: '天后' },
    'FOH': { name_en: 'Fortress Hill', name_tc: '炮台山' },
    'TAK': { name_en: 'Tai Koo', name_tc: '太古' },
    'SWH': { name_en: 'Sai Wan Ho', name_tc: '西灣河' },
    'SKW': { name_en: 'Shau Kei Wan', name_tc: '筲箕灣' },
    'HFC': { name_en: 'Heng Fa Chuen', name_tc: '杏花邨' },
    'CHW': { name_en: 'Chai Wan', name_tc: '柴灣' },

    'WHA': { name_en: 'Whampoa', name_tc: '黃埔' },
    'SKM': { name_en: 'Shek Kip Mei', name_tc: '石硤尾' },
    'LOF': { name_en: 'Lok Fu', name_tc: '樂富' },
    'WTS': { name_en: 'Wong Tai Sin', name_tc: '黃大仙' },
    'CHH': { name_en: 'Choi Hung', name_tc: '彩虹' },
    'KOB': { name_en: 'Kowloon Bay', name_tc: '九龍灣' },
    'NTK': { name_en: 'Ngau Tau Kok', name_tc: '牛頭角' },
    'KWT': { name_en: 'Kwun Tong', name_tc: '觀塘' },
    'LAT': { name_en: 'Lam Tin', name_tc: '藍田' },
	
    'SUN': { name_en: 'Sunny Bay', name_tc: '欣澳' },
    'DIS': { name_en: 'Disneyland Resort', name_tc: '迪士尼' }
};
        return allStations[code] || { name_en: code, name_tc: code };
    }

    function formatMtrTime(timeString) {
        if (!timeString) return '';
        return timeString.split(' ')[1].substring(0, 5);
    }

    function updateDirectionButtons() {
        if (company === 'nlb') {
            const originEn = routeEndpoints.originEn;
            const destEn = routeEndpoints.destEn;
            const originTc = routeEndpoints.originTc;
            const destTc = routeEndpoints.destTc;

            elements.outboundBtn.innerHTML = `
                <div class="direction-content">
                    <div class="lang-en">${originEn} → ${destEn}</div>
                    <div class="lang-tc">${originTc} → ${destTc}</div>
                </div>
            `;
            
            elements.inboundBtn.innerHTML = `
                <div class="direction-content">
                    <div class="lang-en">${destEn} → ${originEn}</div>
                    <div class="lang-tc">${destTc} → ${originTc}</div>
                </div>
            `;
        } else {
            elements.outboundBtn.innerHTML = `
                <div class="direction-content">
                    <div class="lang-en">${routeEndpoints.originEn} → ${routeEndpoints.destEn}</div>
                    <div class="lang-tc">${routeEndpoints.originTc} → ${routeEndpoints.destTc}</div>
                </div>
            `;
            elements.inboundBtn.innerHTML = `
                <div class="direction-content">
                    <div class="lang-en">${routeEndpoints.destEn} → ${routeEndpoints.originEn}</div>
                    <div class="lang-tc">${routeEndpoints.destTc} → ${routeEndpoints.originTc}</div>
                </div>
            `;
        }

        elements.outboundBtn.classList.toggle('active', currentDirection === 'outbound');
        elements.inboundBtn.classList.toggle('active', currentDirection === 'inbound');
    }

    async function loadStopsForCurrentDirection() {
        try {
            elements.stopsList.innerHTML = '<div class="loading">Loading stops...</div>';
            
            let routeStops;
            if (company === 'ctb') {
                routeStops = await api.getCtbRouteStops(route, currentDirection);
            } else if (company === 'nlb') {
                routeStops = await api.getNlbRouteStops(route);
                
                if (currentDirection === 'inbound') {
                    routeStops.stops = [...routeStops.stops].reverse();
                    routeStops.stops.forEach((stop, index) => {
                        stop.seq = index + 1;
                        stop.stopId = stop.stopId || stop.stop;
                    });
                } else {
                    routeStops.stops.forEach((stop, index) => {
                        stop.seq = index + 1;
                        stop.stopId = stop.stopId || stop.stop;
                    });
                }
            } else {
                routeStops = await api.getKmbRouteStops(route, currentDirection, currentServiceType);
            }

            if (!routeStops?.data && !routeStops?.stops) throw new Error('No stops information found');
            
            const stopsData = company === 'nlb' ? routeStops.stops : routeStops.data;
            
            const stopsWithDetails = await Promise.all(stopsData.map(async (stop) => {
                let stopInfo;
                if (company === 'ctb') {
                    stopInfo = await api.getCtbStopInfo(stop.stop);
                } else if (company === 'nlb') {
                    stopInfo = {
                        data: {
                            name_en: stop.stopName_e,
                            name_tc: stop.stopName_c,
                            lat: stop.latitude,
                            long: stop.longitude
                        }
                    };
                } else {
                    stopInfo = await api.getKmbStopInfo(stop.stop);
                }
                
                return {
                    seq: stop.seq,
                    stopId: stop.stopId || stop.stop,
                    name_en: stopInfo?.data?.name_en || stop.stopName_e || 'Unknown Stop',
                    name_tc: stopInfo?.data?.name_tc || stop.stopName_c || '未知車站',
                    lat: stopInfo?.data?.lat || stop.latitude,
                    long: stopInfo?.data?.long || stop.longitude
                };
            }));
            
            displayStops(stopsWithDetails);
            elements.stopsCount.textContent = stopsWithDetails.length;
            
        } catch (error) {
            console.error('Error loading stops:', error);
            elements.stopsList.innerHTML = '<div class="error-message">Failed to load stops. Please try again.</div>';
        }
    }

    function displayStops(stops) {
        elements.stopsList.innerHTML = '';
        stops.forEach(stop => {
            const stopElement = document.createElement('div');
            stopElement.className = 'stop-item';
            stopElement.innerHTML = `
                <div class="stop-seq">${stop.seq}</div>
                <div class="stop-info">
                    <div class="stop-name lang-en">${stop.name_en}</div>
                    <div class="stop-name lang-tc">${stop.name_tc}</div>
                </div>
                <div class="stop-actions">
                    <button class="eta-btn" data-stop-id="${stop.stopId}">
                        <i class="fas fa-clock"></i> <span class="lang-en">ETA</span><span class="lang-tc">到站時間</span>
                    </button>
                    <button class="map-btn" data-lat="${stop.lat}" data-long="${stop.long}">
                        <i class="fas fa-map-marker-alt"></i> <span class="lang-en">Map</span><span class="lang-tc">地圖</span>
                    </button>
                </div>
            `;
            
            stopElement.querySelector('.eta-btn').addEventListener('click', () => {
                currentStopName = { en: stop.name_en, tc: stop.name_tc };
                showETA(stop.stopId, currentStopName);
            });
            
            stopElement.querySelector('.map-btn').addEventListener('click', () => {
                showMap(stop.lat, stop.long, stop.name_en);
            });
            
            elements.stopsList.appendChild(stopElement);
        });
    }

    elements.outboundBtn.addEventListener('click', async () => {
        if (currentDirection !== 'outbound') {
            currentDirection = 'outbound';
            updateDirectionButtons();
            elements.stopsList.innerHTML = '<div class="loading">Loading stops...</div>';
            await loadStopsForCurrentDirection();
        }
    });

    elements.inboundBtn.addEventListener('click', async () => {
        if (currentDirection !== 'inbound') {
            currentDirection = 'inbound';
            updateDirectionButtons();
            elements.stopsList.innerHTML = '<div class="loading">Loading stops...</div>';
            await loadStopsForCurrentDirection();
        }
    });

    async function showETA(stopId, stopName) {
        currentStopId = stopId;
        currentStopName = stopName;
        await fetchAndDisplayETA();
        elements.etaModal.style.display = 'flex';
    }

    async function fetchAndDisplayETA() {
        try {
            elements.etaRefreshBtn.classList.add('refreshing');
            elements.etaModalBody.innerHTML = `
                <div class="loading">
                    <div class="lang-en">Fetching arrival times...</div>
                    <div class="lang-tc">正在獲取到站時間...</div>
                </div>
            `;
            
            let etaData;
            if (company === 'ctb') {
                etaData = await api.getCtbEta(currentStopId, route);
            } else if (company === 'nlb') {
                etaData = await api.getNlbEta(route, currentStopId, 'en');
            } else {
                etaData = await api.getKmbEta(currentStopId, route, currentServiceType);
            }
            
            if ((!etaData?.data || etaData.data.length === 0) && 
                (!etaData?.estimatedArrivals || etaData.estimatedArrivals.length === 0)) {
                showNoETAData();
                return;
            }
            
            displayETAData(etaData);
            
        } catch (error) {
            console.error('Error fetching ETA:', error);
            showETAError();
        } finally {
            elements.etaRefreshBtn.classList.remove('refreshing');
        }
    }

    function showNoETAData() {
        elements.etaModalTitle.innerHTML = `
            <div class="lang-en">${currentStopName.en}</div>
            <div class="lang-tc">${currentStopName.tc}</div>
        `;
        
        let routeInfoHtml = '';
        if (company !== 'nlb') {
            routeInfoHtml = `
                <div class="eta-route-info">
                    <div class="lang-en">Route ${route} (${company.toUpperCase()})</div>
                    <div class="lang-tc">路線 ${route} (${company.toUpperCase()})</div>
                </div>
            `;
        }
        
        elements.etaModalBody.innerHTML = `
            ${routeInfoHtml}
            <div class="eta-no-data">
                <div class="lang-en">No ETA data available</div>
                <div class="lang-tc">沒有到站時間資料</div>
            </div>
        `;
    }

    function showETAError() {
        elements.etaModalTitle.textContent = 'Error';
        elements.etaModalBody.innerHTML = `
            <div class="eta-no-data">
                <div class="lang-en">Failed to get ETA data</div>
                <div class="lang-tc">無法獲得到站時間資料</div>
            </div>
        `;
    }

    function displayETAData(etaData) {
        const now = new Date();
        elements.etaModalTitle.innerHTML = `
            <div class="lang-en">${currentStopName.en}</div>
            <div class="lang-tc">${currentStopName.tc}</div>
        `;
        
        const etaItems = company === 'ctb' 
            ? processCtbEtaData(etaData.data, now)
            : company === 'nlb'
                ? processNlbEtaData(etaData, now)
                : processKmbEtaData(etaData.data, now);
        
        let routeInfoHtml = '';
        if (company !== 'nlb') {
            routeInfoHtml = `
                <div class="eta-route-info">
                    <div class="lang-en">Route ${route} (${company.toUpperCase()}) - ${currentDirection === 'outbound' ? 'Outbound' : 'Inbound'}</div>
                    <div class="lang-tc">路線 ${route} (${company.toUpperCase()}) - ${currentDirection === 'outbound' ? '去程' : '回程'}</div>
                </div>
            `;
        }
        
        elements.etaModalBody.innerHTML = `
            ${routeInfoHtml}
            <div class="last-updated">
                <div class="lang-en">Last updated: ${new Date().toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'})}</div>
                <div class="lang-tc">最後更新: ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
            </div>
            ${etaItems.join('')}
        `;
    }

    function processKmbEtaData(etaData, now) {
        return etaData.map(eta => {
            const etaDirection = eta.dir === 'O' ? 'outbound' : 'inbound';
            if (etaDirection !== currentDirection) return '';
            
            const etaTime = eta.eta ? new Date(eta.eta) : null;
            if (!etaTime) {
                return `
                    <div class="eta-item eta-no-eta">
                        <div>
                            <div class="lang-en">${eta.rmk_en || 'No ETA available'}</div>
                            <div class="lang-tc">${eta.rmk_tc || '沒有到站時間資料'}</div>
                        </div>
                        <div class="eta-remaining">
                            <div class="lang-en">--</div>
                            <div class="lang-tc">--</div>
                        </div>
                    </div>
                `;
            }
            
            const minutesRemaining = Math.floor((etaTime - now) / 60000);
            
            let timeClass = '';
            if (minutesRemaining <= 3) timeClass = 'eta-soon';
            if (minutesRemaining < 0) timeClass = 'eta-departed';
            
            return `
                <div class="eta-item ${timeClass}">
                    <div class="eta-destination">
                        <div class="lang-en">
                            <span class="eta-time">${etaTime.toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'})}</span>
                            to ${eta.dest_en}
                        </div>
                        <div class="lang-tc">
                            <span class="eta-time">${etaTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            往 ${eta.dest_tc}
                        </div>
                        ${eta.rmk_en ? `<div class="eta-remark lang-en">${eta.rmk_en}</div>` : ''}
                        ${eta.rmk_tc ? `<div class="eta-remark lang-tc">${eta.rmk_tc}</div>` : ''}
                    </div>
                    <div class="eta-remaining">
                        <div class="lang-en">${getRemainingTimeText(minutesRemaining, 'en')}</div>
                        <div class="lang-tc">${getRemainingTimeText(minutesRemaining, 'tc')}</div>
                    </div>
                </div>
            `;
        }).filter(item => item !== '');
    }

    function processCtbEtaData(etaData, now) {
        return etaData.map(eta => {
            const etaTime = new Date(eta.eta);
            const minutesRemaining = Math.floor((etaTime - now) / 60000);
            
            let timeClass = '';
            if (minutesRemaining <= 3) timeClass = 'eta-soon';
            if (minutesRemaining < 0) timeClass = 'eta-departed';
            
            return `
                <div class="eta-item ${timeClass}">
                    <div class="eta-time">
                        <div class="lang-en">${etaTime.toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'})}</div>
                        <div class="lang-tc">${etaTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                    </div>
                    <div class="eta-remaining">
                        <div class="lang-en">${getRemainingTimeText(minutesRemaining, 'en')}</div>
                        <div class="lang-tc">${getRemainingTimeText(minutesRemaining, 'tc')}</div>
                    </div>
                </div>
            `;
        });
    }

    function processNlbEtaData(etaData, now) {
        if (!etaData.estimatedArrivals) return ['<div class="eta-no-data">No ETA data available</div>'];
        
        return etaData.estimatedArrivals.map(eta => {
            const etaTime = new Date(eta.estimatedArrivalTime);
            const minutesRemaining = Math.floor((etaTime - now) / 60000);
            
            let timeClass = '';
            if (minutesRemaining <= 3) timeClass = 'eta-soon';
            if (minutesRemaining < 0) timeClass = 'eta-departed';
            
            return `
                <div class="eta-item ${timeClass}">
                    <div class="eta-time">
                        <div class="lang-en">${etaTime.toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'})}</div>
                        <div class="lang-tc">${etaTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                    </div>
                    <div class="eta-remaining">
                        <div class="lang-en">${getRemainingTimeText(minutesRemaining, 'en')}</div>
                        <div class="lang-tc">${getRemainingTimeText(minutesRemaining, 'tc')}</div>
                    </div>
                    ${eta.routeVariantName ? `<div class="eta-remark">${eta.routeVariantName}</div>` : ''}
                </div>
            `;
        });
    }

    function getRemainingTimeText(minutes, lang) {
        if (lang === 'en') {
            if (minutes > 0) return `${minutes} min`;
            if (minutes < 0) return 'Departed';
            return 'Arriving';
        } else {
            if (minutes > 0) return `${minutes} 分鐘`;
            if (minutes < 0) return '已開出';
            return '即將到站';
        }
    }

function showMap(lat, long, stopName) {
    
    const googleMapsUrl = `https://www.google.com/maps?q=${lat},${long}`;
    const appleMapsUrl = `http://maps.apple.com/?ll=${lat},${long}`;
    const geoUrl = `geo:${lat},${long}`;
    
    
    if (window.cordova) {
        
        const isAndroid = /Android/i.test(navigator.userAgent);
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        
        if (isAndroid) {
            
            window.location.href = geoUrl;
            
            
            setTimeout(() => {
                window.open(googleMapsUrl, '_system');
            }, 500);
        } else if (isIOS) {
            
            window.open(appleMapsUrl, '_system');
            
            
            setTimeout(() => {
                window.open(googleMapsUrl, '_system');
            }, 500);
        } else {
            
            window.open(googleMapsUrl, '_system');
        }
    } else {
        
        window.open(googleMapsUrl, '_blank');
    }
}

    elements.etaRefreshBtn.addEventListener('click', async () => {
        if (currentStopId && currentStopName) {
            await fetchAndDisplayETA();
        }
    });

    elements.etaCloseBtn.addEventListener('click', () => {
        elements.etaModal.style.display = 'none';
    });

    elements.etaModal.addEventListener('click', (e) => {
        if (e.target === elements.etaModal) {
            elements.etaModal.style.display = 'none';
        }
    });

    loadRouteDetails();
});