// 차트 관련 유틸리티 함수들
const chartUtils = {
    // 차트 초기화
    initChart: (container) => {
        // 기본 차트 생성
        const chart = LightweightCharts.createChart(container, {
            width: container.offsetWidth,
            height: 400,
            layout: {
                backgroundColor: '#ffffff',
                textColor: '#333333',
            },
            grid: {
                vertLines: { color: '#f0f0f0' },
                horzLines: { color: '#f0f0f0' },
            },
            crosshair: {
                mode: LightweightCharts.CrosshairMode.Normal,
            },
            timeScale: {
                timeVisible: true,
            },
        });

        // 캔들스틱 시리즈 추가
        const candleSeries = chart.addCandlestickSeries();

        // 창 크기 조절 이벤트
        window.addEventListener('resize', () => {
            chart.resize(container.offsetWidth, 400);
        });

        return { chart, candleSeries };
    },

    // 데이터 가져오기
    fetchData: async (candleSeries) => {
        try {
            const response = await fetch('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&limit=24');
            const data = await response.json();
            const candleData = data.map(d => ({
                time: d[0] / 1000,
                open: parseFloat(d[1]),
                high: parseFloat(d[2]),
                low: parseFloat(d[3]),
                close: parseFloat(d[4])
            }));
            
            if (candleData.length > 0) {
                const currentPrice = candleData[candleData.length - 1].close;
                candleSeries.setData(candleData);
                return currentPrice;
            }
            return null;
        } catch (error) {
            console.error('데이터 로드 실패:', error);
            return null;
        }
    }
};

export default chartUtils; 