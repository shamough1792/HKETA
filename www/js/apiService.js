class TransportAPI {
    async getKmbRoutes() {
        try {
            const response = await fetch('https://data.etabus.gov.hk/v1/transport/kmb/route/');
            return await response.json();
        } catch (error) {
            console.error('Error fetching KMB routes:', error);
            return null;
        }
    }

    async getKmbRouteStops(route, direction = 'outbound', serviceType = '1') {
        try {
            const response = await fetch(`https://data.etabus.gov.hk/v1/transport/kmb/route-stop/${route}/${direction}/${serviceType}`);
            return await response.json();
        } catch (error) {
            console.error('Error fetching KMB route stops:', error);
            return null;
        }
    }

    async getKmbStopInfo(stopId) {
        try {
            const response = await fetch(`https://data.etabus.gov.hk/v1/transport/kmb/stop/${stopId}`);
            return await response.json();
        } catch (error) {
            console.error('Error fetching KMB stop info:', error);
            return null;
        }
    }

    async getKmbRouteInfo(route, direction = 'outbound', serviceType = '1') {
        try {
            const response = await fetch(`https://data.etabus.gov.hk/v1/transport/kmb/route/${route}/${direction}/${serviceType}`);
            return await response.json();
        } catch (error) {
            console.error('Error fetching KMB route info:', error);
            return null;
        }
    }

    async getKmbEta(stopId, route, serviceType = '1') {
        try {
            const response = await fetch(`https://data.etabus.gov.hk/v1/transport/kmb/eta/${stopId}/${route}/${serviceType}`);
            return await response.json();
        } catch (error) {
            console.error('Error fetching KMB ETA:', error);
            return null;
        }
    }

    async getCtbRoutes(companyId = 'CTB') {
        try {
            const response = await fetch(`https://rt.data.gov.hk/v2/transport/citybus/route/${companyId}`);
            return await response.json();
        } catch (error) {
            console.error('Error fetching CTB routes:', error);
            return null;
        }
    }

    async getCtbRouteStops(route, direction = 'outbound') {
        try {
            const response = await fetch(`https://rt.data.gov.hk/v2/transport/citybus/route-stop/CTB/${route}/${direction}`);
            return await response.json();
        } catch (error) {
            console.error('Error fetching CTB route stops:', error);
            return null;
        }
    }

    async getCtbStopInfo(stopId) {
        try {
            const response = await fetch(`https://rt.data.gov.hk/v2/transport/citybus/stop/${stopId}`);
            return await response.json();
        } catch (error) {
            console.error('Error fetching CTB stop info:', error);
            return null;
        }
    }

    async getCtbRouteInfo(route) {
        try {
            const response = await fetch(`https://rt.data.gov.hk/v2/transport/citybus/route/CTB/${route}`);
            return await response.json();
        } catch (error) {
            console.error('Error fetching CTB route info:', error);
            return null;
        }
    }

    async getCtbEta(stopId, route) {
        try {
            const response = await fetch(`https://rt.data.gov.hk/v2/transport/citybus/eta/CTB/${stopId}/${route}`);
            return await response.json();
        } catch (error) {
            console.error('Error fetching CTB ETA:', error);
            return null;
        }
    }

    async getNlbRoutes() {
        try {
            const response = await fetch('https://rt.data.gov.hk/v2/transport/nlb/route.php?action=list');
            return await response.json();
        } catch (error) {
            console.error('Error fetching NLB routes:', error);
            return null;
        }
    }

    async getNlbRouteStops(routeId) {
        try {
            const response = await fetch(`https://rt.data.gov.hk/v2/transport/nlb/stop.php?action=list&routeId=${routeId}`);
            return await response.json();
        } catch (error) {
            console.error('Error fetching NLB route stops:', error);
            return null;
        }
    }

    async getNlbEta(routeId, stopId, language = 'en') {
        try {
            const response = await fetch(`https://rt.data.gov.hk/v2/transport/nlb/stop.php?action=estimatedArrivals&routeId=${routeId}&stopId=${stopId}&language=${language}`);
            return await response.json();
        } catch (error) {
            console.error('Error fetching NLB ETA:', error);
            return null;
        }
    }

    async getNlbStopInfo(stopId) {
        try {
            return {
                data: {
                    stopId: stopId,
                    name_en: `Stop ${stopId}`,
                    name_tc: `車站 ${stopId}`
                }
            };
        } catch (error) {
            console.error('Error fetching NLB stop info:', error);
            return null;
        }
    }
	
	async getMtrSchedule(line, sta, lang = 'EN') {
    try {
        const response = await fetch(`https://rt.data.gov.hk/v1/transport/mtr/getSchedule.php?line=${line}&sta=${sta}&lang=${lang}`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching MTR schedule:', error);
        return null;
    }
}

async getMtrLines() {
    return {
        lines: [
			{ code: 'TWL', name_en: 'Tsuen Wan Line', name_tc: '荃灣綫' },
			{ code: 'KTL', name_en: 'Kwun Tong Line', name_tc: '觀塘綫' },			
			{ code: 'ISL', name_en: 'Island Line', name_tc: '港島綫' },
			{ code: 'SIL', name_en: 'South Island Line', name_tc: '南港島綫（東段）' },
			{ code: 'TKL', name_en: 'Tseung Kwan O Line', name_tc: '將軍澳綫' },		
			{ code: 'TML', name_en: 'Tuen Ma Line', name_tc: '屯馬綫' },	
			{ code: 'EAL', name_en: 'East Rail Line', name_tc: '東鐵綫' },		
            { code: 'TCL', name_en: 'Tung Chung Line', name_tc: '東涌綫' },				
            { code: 'AEL', name_en: 'Airport Express', name_tc: '機場快綫' },		
			{ code: 'DRL', name_en: 'Disneyland Resort Line', name_tc: '迪士尼綫' },
        ]
    };
}

}