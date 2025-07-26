import tkinter as tk
from tkinter import ttk, messagebox
import time
import logging
import requests
import ccxt

def percent_from_price(avg, price):
    try:
        return (abs(avg - price) / avg) * 100
    except ZeroDivisionError:
        return 0

def price_from_percent(avg, percent, is_sl=True):
    if is_sl:
        return avg - (percent/100) * avg
    else:
        return avg + (percent/100) * avg

def get_max_str_length(data_list, key, extra=0):
    max_len = len(str(key))
    for item in data_list:
        value = item.get(key, "")
        if isinstance(value, (int, float)) and (
            "Price" in key or "Current" in key or "Average" in key or "Ant" in key
        ):
            value = f"{value:,}"
        elif key == "sl(p/%)":
            avg = item["Average"]
            sl_price = item["SL_Price"]
            sl_perc = percent_from_price(avg, sl_price)
            value = f"{sl_price:,} / {sl_perc:.2f}%"
        elif key == "tp(p/%)":
            avg = item["Average"]
            tp_price = item["TP_Price"]
            tp_perc = percent_from_price(avg, tp_price)
            value = f"{tp_price:,} / {tp_perc:.2f}%"
        else:
            value = str(value)
        max_len = max(max_len, len(value))
    return (max_len + extra) * 8

class UpbitCommander(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Upbit Crypto Commander")
        self.geometry("1400x650")
        self.resizable(True, True)

        self.update_interval = 3  # seconds (3초마다 업데이트)
        self.countdown = self.update_interval
        
        # CCXT 업비트 연결
        self.exchange = None
        self.is_connected = False
        
        # API 키 설정
        self.upbit_access_key = "g7JUiKuR2HfxSU4CDFi1yC2QiwIjQ8m3aKKI1hXt"
        self.upbit_secret_key = "Jl4FZDGX8zlP6eHaC0D5T7kis1eWmxfygf5vuTYT"
        
        # 실시간 데이터 수집을 위한 변수들
        self.real_ticker_data = []
        self.account_balance = {}
        self.current_prices = {}  # 현재가 캐시
        
        # 로깅 설정
        logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
        self.logger = logging.getLogger(__name__)

        # API Key Frame
        self.api_frame = tk.Frame(self)
        self.api_frame.pack(pady=(20, 10), padx=40, anchor='w')
        tk.Label(self.api_frame, text="Api key").grid(row=0, column=0, sticky='w', padx=(0, 8), pady=4)
        self.api_key_var = tk.StringVar(value=self.upbit_access_key)
        tk.Entry(self.api_frame, textvariable=self.api_key_var, width=40).grid(row=0, column=1, padx=(0, 8), pady=4, sticky='w')
        tk.Label(self.api_frame, text="Secret key").grid(row=1, column=0, sticky='w', padx=(0, 8), pady=4)
        self.secret_key_var = tk.StringVar(value=self.upbit_secret_key)
        tk.Entry(self.api_frame, textvariable=self.secret_key_var, show="*", width=40).grid(row=1, column=1, padx=(0, 8), pady=4, sticky='w')
        self.start_button = tk.Button(self.api_frame, text="Start", command=self.on_start)
        self.start_button.grid(row=2, column=0, columnspan=2, pady=(12, 4), sticky='w')
        
        # 자동 매도 활성화 체크박스
        self.auto_sell_enabled = tk.BooleanVar(value=False)
        self.sell_checkbox = tk.Checkbutton(
            self.api_frame, 
            text="자동 매도 활성화", 
            variable=self.auto_sell_enabled
        )
        self.sell_checkbox.grid(row=3, column=0, columnspan=2, pady=4, sticky='w')

        # Account Info Frame
        self.account_frame = tk.Frame(self)
        self.account_frame.pack(pady=8, padx=40, anchor='w')
        self.init_var = tk.StringVar(value="100,000   won")
        self.total_var = tk.StringVar(value="100,000 won")
        self.free_var = tk.StringVar(value="80,000   won")
        self.used_var = tk.StringVar(value="20,000   won")
        tk.Label(self.account_frame, text="Init :", width=10, anchor='w').grid(row=0, column=0, sticky='w')
        tk.Label(self.account_frame, textvariable=self.init_var, width=14, anchor='w').grid(row=0, column=1, sticky='w')
        tk.Label(self.account_frame, text="Total:", width=10, anchor='w').grid(row=1, column=0, sticky='w')
        tk.Label(self.account_frame, textvariable=self.total_var, width=14, anchor='w').grid(row=1, column=1, sticky='w')
        tk.Label(self.account_frame, text="Free:", width=10, anchor='w').grid(row=2, column=0, sticky='w')
        tk.Label(self.account_frame, textvariable=self.free_var, width=14, anchor='w').grid(row=2, column=1, sticky='w')
        tk.Label(self.account_frame, text="Used:", width=10, anchor='w').grid(row=3, column=0, sticky='w')
        tk.Label(self.account_frame, textvariable=self.used_var, width=14, anchor='w').grid(row=3, column=1, sticky='w')

        # Table frame
        self.table_frame = tk.Frame(self)
        self.table_frame.pack(padx=40, pady=20, anchor='w', fill="x", expand=False)

        # Countdown label above the Treeview
        self.update_label = tk.Label(self.table_frame, text="", fg="gray")
        self.update_label.pack(anchor='nw', padx=(2,0), pady=(2,0))

        columns = [
            "Ticker", "Current", "Average", "c%", "n%", "x%", "Qty", "Ant",
            "sl(p/%)", "tp(p/%)", "tr%", "min_x%"
        ]
        self.ticker_data = [
            {
                "Ticker": "BTC/KRW", "Current": 50000000, "Average": 49000000,
                "c%": 2.0, "n%": 2.0, "x%": 2.0, "Qty": 0.02, "Ant": 1000000,
                "SL_Price": 48000000, "TP_Price": 52000000, "tr%": 3, "min_x%": 2.0
            },
            {
                "Ticker": "ETH/KRW", "Current": 3200000, "Average": 3100000,
                "c%": 3.2, "n%": 3.2, "x%": 2.0, "Qty": 0.5, "Ant": 1600000,
                "SL_Price": 2900000, "TP_Price": 3500000, "tr%": 2, "min_x%": 2.0
            },
            {
                "Ticker": "XRP/KRW", "Current": 1020, "Average": 1000,
                "c%": 2.0, "n%": 2.0, "x%": 2.0, "Qty": 300, "Ant": 306000,
                "SL_Price": 980, "TP_Price": 1200, "tr%": 5, "min_x%": 2.0
            }
        ]

        # Initialize c%, n%, x% for each ticker
        for item in self.ticker_data:
            current_roe = self.get_current_roe(item)
            item["c%"] = current_roe
            item["n%"] = current_roe  # 초기 최저수익률은 현재 수익률
            item["x%"] = current_roe  # 초기 최대수익률은 현재 수익률

        col_widths = {}
        for col in columns:
            col_widths[col] = get_max_str_length(self.ticker_data, col, extra=4)

        self.tree = ttk.Treeview(self.table_frame, columns=columns, show='headings', height=8)
        for col in columns:
            self.tree.heading(col, text=col)
            self.tree.column(col, width=col_widths[col], anchor='center')
        self.tree.pack(anchor='w', fill="x")

        self.refresh_table()

        # Start countdown timer
        self.update_countdown()

        # Bind selection
        self.tree.bind('<<TreeviewSelect>>', self.on_row_select)

        # Editable fields panel
        self.edit_frame = tk.LabelFrame(self, text="Edit Selected Row (SL/TP/tr%) fields", padx=10, pady=10)
        self.edit_frame.pack(padx=40, pady=(0,10), anchor='w')
        self.selected_index = None

        tk.Label(self.edit_frame, text="Stoploss Price:").grid(row=0, column=0, sticky='e')
        self.sl_price_var = tk.DoubleVar()
        self.sl_price_entry = tk.Entry(self.edit_frame, textvariable=self.sl_price_var, width=14)
        self.sl_price_entry.grid(row=0, column=1, padx=5)

        tk.Label(self.edit_frame, text="Stoploss %:").grid(row=0, column=2, sticky='e')
        self.sl_percent_var = tk.DoubleVar()
        self.sl_percent_entry = tk.Entry(self.edit_frame, textvariable=self.sl_percent_var, width=8)
        self.sl_percent_entry.grid(row=0, column=3, padx=5)

        tk.Label(self.edit_frame, text="Target Price:").grid(row=0, column=4, sticky='e')
        self.tp_price_var = tk.DoubleVar()
        self.tp_price_entry = tk.Entry(self.edit_frame, textvariable=self.tp_price_var, width=14)
        self.tp_price_entry.grid(row=0, column=5, padx=5)

        tk.Label(self.edit_frame, text="Target %:").grid(row=0, column=6, sticky='e')
        self.tp_percent_var = tk.DoubleVar()
        self.tp_percent_entry = tk.Entry(self.edit_frame, textvariable=self.tp_percent_var, width=8)
        self.tp_percent_entry.grid(row=0, column=7, padx=5)

        tk.Label(self.edit_frame, text="Trailing % (tr%)").grid(row=0, column=8, sticky='e')
        self.tr_percent_var = tk.DoubleVar()
        self.tr_percent_entry = tk.Entry(self.edit_frame, textvariable=self.tr_percent_var, width=8)
        self.tr_percent_entry.grid(row=0, column=9, padx=5)

        tk.Label(self.edit_frame, text="Min X%").grid(row=0, column=10, sticky='e')
        self.min_x_percent_var = tk.DoubleVar()
        self.min_x_percent_entry = tk.Entry(self.edit_frame, textvariable=self.min_x_percent_var, width=8)
        self.min_x_percent_entry.grid(row=0, column=11, padx=5)

        self.apply_btn = tk.Button(self.edit_frame, text="Apply", command=self.apply_edit)
        self.apply_btn.grid(row=0, column=12, padx=(15, 0))

    def update_countdown(self):
        if self.is_connected:
            self.update_label.config(text=f"실시간 업데이트 중... {self.countdown}초 후 갱신")
        else:
            self.update_label.config(text="연결되지 않음")
            
        if self.countdown > 0:
            self.countdown -= 1
            self.after(1000, self.update_countdown)
        else:
            self.countdown = self.update_interval
            if self.is_connected:
                # 실제 데이터 업데이트
                self.update_real_time_data()
            else:
                # 시뮬레이션 모드 - 가격 변동 추가
                self.simulate_price_movement()
            self.simulate_trailing_stop()
            self.refresh_table()
            self.after(1000, self.update_countdown)

    def get_current_roe(self, ticker_row):
        avg = ticker_row["Average"]
        cur = ticker_row["Current"]
        try:
            return round(((cur - avg) / avg) * 100, 2)
        except ZeroDivisionError:
            return 0

    def simulate_price_movement(self):
        """시뮬레이션을 위한 가격 변동"""
        import random
        for item in self.ticker_data:
            # 랜덤한 가격 변동 (-2% ~ +3%)
            change_percent = random.uniform(-2.0, 3.0)
            current_price = item["Current"]
            new_price = current_price * (1 + change_percent / 100)
            item["Current"] = round(new_price, 2)
            
            # 평가금액 업데이트
            qty = float(item["Qty"])
            item["Ant"] = round(qty * new_price, 0)

    def simulate_trailing_stop(self):
        # Trailing stop logic: x% is maxROE%, n% is minROE%
        for item in self.ticker_data:
            cur_roe = self.get_current_roe(item)
            
            # Update x% (최대수익률) if new peak
            current_max = item.get("x%", cur_roe)
            if cur_roe > current_max:
                item["x%"] = cur_roe
                self.logger.info(f"새로운 최대수익률: {item['Ticker']} = {cur_roe:.2f}% (이전: {current_max:.2f}%)")
            
            # Update n% (최저수익률) if new low
            current_min = item.get("n%", cur_roe)
            if cur_roe < current_min:
                item["n%"] = cur_roe
                self.logger.info(f"새로운 최저수익률: {item['Ticker']} = {cur_roe:.2f}% (이전: {current_min:.2f}%)")
            
            # Trailing stop logic with min_x% condition
            max_roe = item["x%"]
            tr_percent = item.get("tr%", 0)
            min_x_percent = item.get("min_x%", 2.0)
            
            # 최소 기준 충족 시에만 트레일링 스탑 적용
            if max_roe >= min_x_percent:
                new_sl_percent = round(max_roe - tr_percent, 2)
                avg = item["Average"]
                current_sl_price = item["SL_Price"]
                current_sl_percent = percent_from_price(avg, current_sl_price)
                # If new trailing stop is higher than current stoploss%, update it
                if new_sl_percent > current_sl_percent:
                    item["SL_Price"] = round(price_from_percent(avg, new_sl_percent, is_sl=True), 2)
                    self.logger.info(f"트레일링 스탑 업데이트: {item['Ticker']} = {new_sl_percent:.2f}% (최대수익률: {max_roe:.2f}%, 기준: {min_x_percent:.2f}%)")
                else:
                    self.logger.debug(f"트레일링 스탑 비활성화: {item['Ticker']} (최대수익률: {max_roe:.2f}% < 기준: {min_x_percent:.2f}%)")

    def refresh_table(self):
        for row in self.tree.get_children():
            self.tree.delete(row)
        for item in self.ticker_data:
            avg = item["Average"]
            sl_price = item["SL_Price"]
            tp_price = item["TP_Price"]
            sl_perc = percent_from_price(avg, sl_price)
            tp_perc = percent_from_price(avg, tp_price)
            
            # 현재 수익률 계산 (c% 업데이트)
            current_roe = self.get_current_roe(item)
            item["c%"] = current_roe
            
            values = [
                item["Ticker"], 
                f"{item['Current']:,.2f}", 
                f"{avg:,.2f}", 
                f"{current_roe:.2f}", 
                f"{item['n%']:.2f}",
                f"{item['x%']:.2f}", 
                f"{float(item['Qty']):.8f}", 
                f"{item['Ant']}",
                f"{sl_price:,.2f} / {sl_perc:.2f}%", 
                f"{tp_price:,.2f} / {tp_perc:.2f}%", 
                f"{item.get('tr%', 0):.2f}",
                f"{item.get('min_x%', 2.0):.2f}"
            ]
            self.tree.insert('', 'end', values=values)

    def on_row_select(self, event):
        selected = self.tree.selection()
        if selected:
            index = self.tree.index(selected[0])
            self.selected_index = index
            ticker_row = self.ticker_data[index]
            avg = ticker_row["Average"]
            self.sl_price_var.set(ticker_row["SL_Price"])
            self.sl_percent_var.set(round(percent_from_price(avg, ticker_row["SL_Price"]), 2))
            self.tp_price_var.set(ticker_row["TP_Price"])
            self.tp_percent_var.set(round(percent_from_price(avg, ticker_row["TP_Price"]), 2))
            self.tr_percent_var.set(ticker_row.get("tr%", 0))
            self.min_x_percent_var.set(ticker_row.get("min_x%", 2.0))

    def apply_edit(self):
        if self.selected_index is None:
            return
        ticker_row = self.ticker_data[self.selected_index]
        avg = ticker_row["Average"]

        sl_price_input = self.sl_price_var.get()
        sl_percent_input = self.sl_percent_var.get()
        orig_sl_price = ticker_row["SL_Price"]
        orig_sl_percent = round(percent_from_price(avg, orig_sl_price), 2)

        if sl_price_input != orig_sl_price:
            ticker_row["SL_Price"] = sl_price_input
            self.sl_percent_var.set(round(percent_from_price(avg, sl_price_input), 2))
        elif sl_percent_input != orig_sl_percent:
            new_price = price_from_percent(avg, sl_percent_input, is_sl=True)
            ticker_row["SL_Price"] = round(new_price, 2)
            self.sl_price_var.set(round(new_price, 2))

        tp_price_input = self.tp_price_var.get()
        tp_percent_input = self.tp_percent_var.get()
        orig_tp_price = ticker_row["TP_Price"]
        orig_tp_percent = round(percent_from_price(avg, orig_tp_price), 2)

        if tp_price_input != orig_tp_price:
            ticker_row["TP_Price"] = tp_price_input
            self.tp_percent_var.set(round(percent_from_price(avg, tp_price_input), 2))
        elif tp_percent_input != orig_tp_percent:
            new_price = price_from_percent(avg, tp_percent_input, is_sl=False)
            ticker_row["TP_Price"] = round(new_price, 2)
            self.tp_price_var.set(round(new_price, 2))

        # Update trailing %
        tr_percent_input = self.tr_percent_var.get()
        ticker_row["tr%"] = tr_percent_input

        # Update min_x%
        min_x_percent_input = self.min_x_percent_var.get()
        ticker_row["min_x%"] = min_x_percent_input

        self.refresh_table()

    def connect_upbit(self):
        """CCXT를 사용하여 업비트 API에 연결"""
        try:
            self.logger.info("업비트 API 연결 시도 중...")
            
            # CCXT 업비트 인스턴스 생성
            self.exchange = ccxt.upbit({
                'apiKey': self.api_key_var.get(),
                'secret': self.secret_key_var.get(),
                'sandbox': False,  # 실제 거래소 사용
                'enableRateLimit': True,  # API 호출 제한 준수
            })
            
            # 연결 테스트
            self.exchange.load_markets()
            self.is_connected = True
            self.logger.info("업비트 API 연결 성공!")
            return True
            
        except Exception as e:
            self.logger.error(f"업비트 API 연결 실패: {str(e)}")
            self.is_connected = False
            return False

    def fetch_account_balance(self):
        """계좌 잔고 정보 조회"""
        if not self.is_connected:
            return False
            
        try:
            self.logger.info("계좌 잔고 조회 중...")
            
            # 이전 보유 코인 정보 저장 (매도 완료 확인용)
            previous_balances = {}
            for item in self.ticker_data:
                ticker = item['Ticker']
                quantity = item['Qty']
                current_price = item['Current']
                previous_balances[ticker] = {
                    'quantity': quantity,
                    'value': quantity * current_price
                }
            
            # 업비트 API로 직접 계좌 정보 조회
            url = "https://api.upbit.com/v1/accounts"
            headers = {
                'Accept': 'application/json',
                'Access-Key': self.api_key_var.get()
            }
            
            # JWT 토큰 생성
            payload = {
                'access_key': self.api_key_var.get(),
                'nonce': str(int(time.time() * 1000))
            }
            
            import jwt
            token = jwt.encode(payload, self.secret_key_var.get(), algorithm='HS256')
            headers['Authorization'] = f'Bearer {token}'
            
            response = requests.get(url, headers=headers)
            if response.status_code != 200:
                raise Exception(f"API 응답 오류: {response.status_code}")
            
            accounts = response.json()
            self.logger.info(f"계좌 데이터 수신: {len(accounts)}개 항목")
            
            # KRW 잔고
            free_krw = 0
            used_krw = 0
            total_krw = 0
            
            # 보유 코인 정보
            coin_balances = []
            
            for account in accounts:
                currency = account['currency']
                balance = float(account['balance'])
                locked = float(account.get('locked', 0))
                avg_buy_price = float(account.get('avg_buy_price', 0))
                
                if currency == 'KRW':
                    free_krw = balance
                    used_krw = locked
                    total_krw = balance + locked
                elif balance > 0:
                    coin_balances.append({
                        'currency': currency,
                        'balance': balance,
                        'locked': locked,
                        'avg_buy_price': avg_buy_price
                    })
            
            # 현재 보유 코인 정보 수집 (매도 완료 확인용)
            current_balances = {}
            for coin in coin_balances:
                ticker = f"KRW-{coin['currency']}"
                quantity = coin['balance']
                # 캐시된 현재가 사용
                ticker_data = self.current_prices.get(ticker, {})
                current_price = ticker_data.get('trade_price', 0)
                current_balances[ticker] = {
                    'quantity': quantity,
                    'value': quantity * current_price
                }
            
            # 매도 완료 확인 및 처리
            if previous_balances:
                completed_sells = self.check_sell_completion(previous_balances, current_balances)
                for completed_ticker in completed_sells:
                    self.handle_sell_completed(completed_ticker)
            
            # GUI 업데이트
            self.free_var.set(f"{free_krw:,.0f} won")
            self.used_var.set(f"{used_krw:,.0f} won")
            self.total_var.set(f"{total_krw:,.0f} won")
            
            self.account_balance = {
                'krw': {'free': free_krw, 'used': used_krw, 'total': total_krw},
                'coins': coin_balances
            }
            
            self.logger.info(f"계좌 잔고 조회 완료: KRW {total_krw:,.0f}원, 보유 코인 {len(coin_balances)}개")
            return True
            
        except Exception as e:
            self.logger.error(f"계좌 잔고 조회 실패: {str(e)}")
            return False

    def fetch_ticker_data(self):
        """보유 코인의 현재 시세 정보 조회"""
        if not self.is_connected or not self.account_balance.get('coins'):
            return False
            
        try:
            self.logger.info("시세 정보 조회 중...")
            
            # 먼저 유효한 마켓 목록 조회
            try:
                markets_response = requests.get("https://api.upbit.com/v1/market/all")
                if markets_response.status_code == 200:
                    all_markets = markets_response.json()
                    valid_markets = {market['market'] for market in all_markets}
                    self.logger.info(f"유효한 마켓 수: {len(valid_markets)}개")
                else:
                    self.logger.warning("마켓 목록 조회 실패, 전체 마켓 요청")
                    valid_markets = set()
            except Exception as e:
                self.logger.warning(f"마켓 목록 조회 실패: {str(e)}")
                valid_markets = set()
            
            # 보유 코인들의 마켓 심볼 생성 (업비트 형식: KRW-BTC)
            all_markets = [f"KRW-{coin['currency']}" for coin in self.account_balance['coins']]
            
            # 유효한 마켓만 필터링
            valid_request_markets = []
            invalid_markets = []
            for market in all_markets:
                if not valid_markets or market in valid_markets:
                    valid_request_markets.append(market)
                else:
                    invalid_markets.append(market)
            
            if invalid_markets:
                self.logger.warning(f"상장폐지된 마켓 제외: {invalid_markets}")
                # 상장폐지된 종목들의 잔고 정보 로그
                for coin in self.account_balance['coins']:
                    market = f"KRW-{coin['currency']}"
                    if market in invalid_markets:
                        self.logger.info(f"상장폐지 종목 잔고: {coin['currency']} - {coin['balance']:.8f} (평균매수가: {coin.get('avg_buy_price', 0):,.0f}원)")
            
            # 업비트 API로 직접 시세 정보 조회
            if valid_request_markets:
                markets_str = ','.join(valid_request_markets)
                url = f"https://api.upbit.com/v1/ticker?markets={markets_str}"
                
                self.logger.info(f"시세 정보 요청 URL: {url}")
                self.logger.info(f"요청 마켓: {valid_request_markets}")
                
                response = requests.get(url)
                self.logger.info(f"API 응답 상태: {response.status_code}")
                
                if response.status_code == 200:
                    tickers_data = response.json()
                    tickers = {item['market']: item for item in tickers_data}
                    self.logger.info(f"시세 데이터 수신: {len(tickers_data)}개")
                    self.current_prices.update(tickers) # 현재가 캐시에 저장
                elif response.status_code == 429:
                    self.logger.warning("API 호출 제한 도달. 잠시 대기 후 재시도합니다.")
                    time.sleep(2)  # 2초 대기
                    return False
                else:
                    self.logger.error(f"시세 정보 API 응답 오류: {response.status_code}")
                    self.logger.error(f"응답 내용: {response.text}")
                    return False
            else:
                tickers = {}
                self.logger.warning("요청할 유효한 마켓이 없습니다.")
            
            # 실시간 데이터 구조로 변환 (유효한 마켓만)
            self.real_ticker_data = []
            for coin in self.account_balance['coins']:
                market = f"KRW-{coin['currency']}"
                ticker = tickers.get(market)
                
                # 유효한 마켓만 테이블에 추가
                if ticker:
                    # fetch_account_balance에서 이미 가져온 평균 매수가 사용
                    avg_price = coin.get('avg_buy_price', 0)
                    current_price = ticker['trade_price']  # 업비트 API 응답 구조
                    
                    if avg_price == 0:
                        avg_price = current_price
                    
                    # 보유금액 계산
                    balance = coin['balance']
                    total_value = balance * current_price
                    
                    # 보유금액이 5000원 미만이면 건너뛰기
                    if total_value < 5000:
                        self.logger.info(f"보유금액 미달 제외: {coin['currency']} - {total_value:,.0f}원")
                        continue
                    
                    # 수익률 계산
                    c_percent = self.get_current_roe({'Average': avg_price, 'Current': current_price})
                    
                    ticker_data = {
                        "Ticker": market,
                        "Current": round(current_price, 2),
                        "Average": round(avg_price, 2),
                        "c%": round(c_percent, 2),
                        "n%": round(c_percent, 2),  # 최저수익률 (초기값은 현재 수익률)
                        "x%": round(c_percent, 2),  # 최대수익률 (초기값은 현재 수익률)
                        "Qty": round(coin['balance'], 8),
                        "Ant": round(total_value, 0),
                        "SL_Price": round(avg_price * 0.95, 2),  # 기본 스탑로스 5%
                        "TP_Price": round(avg_price * 1.10, 2),  # 기본 타겟 10%
                        "tr%": 2.0,  # 기본 트레일링 스탑 2%
                        "min_x%": 2.0  # 기본 트레일링 활성화 기준 2%
                    }
                    self.real_ticker_data.append(ticker_data)
            
            # 기존 데이터와 병합하여 n%, x% 보존
            if self.real_ticker_data:
                # 기존 ticker_data의 n%, x%, min_x% 값 보존
                existing_data = {}
                for item in self.ticker_data:
                    existing_data[item['Ticker']] = {
                        'n%': item.get('n%', 0), 
                        'x%': item.get('x%', 0),
                        'min_x%': item.get('min_x%', 2.0)
                    }
                
                # 새 데이터에 기존 최저/최대 수익률 및 설정값 적용
                for new_item in self.real_ticker_data:
                    ticker = new_item['Ticker']
                    if ticker in existing_data:
                        # 기존 추적 데이터 및 설정값 보존
                        new_item['n%'] = existing_data[ticker]['n%']
                        new_item['x%'] = existing_data[ticker]['x%']
                        new_item['min_x%'] = existing_data[ticker]['min_x%']
                    else:
                        # 새로운 ticker는 현재 수익률로 초기화
                        current_roe = new_item['c%']
                        new_item['n%'] = current_roe
                        new_item['x%'] = current_roe
                        # min_x%는 기본값 2.0 유지
                
                self.ticker_data = self.real_ticker_data.copy()
                self.refresh_table()
            
            self.logger.info(f"시세 정보 조회 완료: {len(self.real_ticker_data)}개 코인")
            return True
            
        except Exception as e:
            self.logger.error(f"시세 정보 조회 실패: {str(e)}")
            return False

    def update_real_time_data(self):
        """실시간 데이터 업데이트"""
        if not self.is_connected:
            return
            
        try:
            # 시세 정보 업데이트 (먼저 실행하여 현재가 캐시)
            self.fetch_ticker_data()
            
            # 계좌 잔고 업데이트 (매도 완료 확인 포함)
            self.fetch_account_balance()
            
            # 트레일링 스탑 로직 실행
            self.simulate_trailing_stop()
            
            # 매도 조건 체크 및 주문 전송
            self.check_sell_conditions()
            
            # GUI 업데이트
            self.refresh_table()
            
        except Exception as e:
            self.logger.error(f"실시간 데이터 업데이트 실패: {str(e)}")

    def on_start(self):
        """Start 버튼 클릭 시 실행되는 메서드"""
        if not self.is_connected:
            # 업비트 API 연결
            if self.connect_upbit():
                # 초기 데이터 로드
                self.fetch_account_balance()
                self.fetch_ticker_data()
                
                # 실시간 업데이트 시작
                self.update_real_time_data()
                
                # Start 버튼 텍스트 변경
                self.start_button.config(text="Stop")
            else:
                # 연결 실패 시 에러 메시지
                tk.messagebox.showerror("연결 실패", "업비트 API 연결에 실패했습니다.\nAPI 키를 확인해주세요.")
        else:
            # 연결 해제
            self.is_connected = False
            self.exchange = None
            self.start_button.config(text="Start")
            self.logger.info("업비트 API 연결 해제")

    def execute_market_sell_order(self, ticker, quantity, reason):
        """시장가 매도 주문 실행 - 단순히 주문만 전송"""
        try:
            self.exchange.create_market_sell_order(symbol=ticker, amount=quantity)
            self.logger.info(f"매도 주문 전송: {ticker} - {quantity}개 - {reason}")
            return True
        except Exception as e:
            self.logger.error(f"매도 주문 실패: {ticker} - {str(e)}")
            return False

    def check_sell_conditions(self):
        """매도 조건 확인 및 실행 - 한 번에 하나의 매도 주문만 실행"""
        if not self.auto_sell_enabled.get():
            return  # 자동 매도 비활성화 시 종료
            
        for item in self.ticker_data:
            ticker = item['Ticker']
            current_price = item['Current']
            quantity = item['Qty']
            total_value = quantity * current_price
            
            # 5000원 미만이면 매도 시도하지 않음
            if total_value < 5000:
                continue
            
            # 스탑로스 체크
            if current_price <= item['SL_Price']:
                self.execute_market_sell_order(ticker, quantity, "스탑로스")
                return  # 매도 주문 후 즉시 종료
                
            # 타겟가 체크
            elif current_price >= item['TP_Price']:
                self.execute_market_sell_order(ticker, quantity, "타겟가")
                return  # 매도 주문 후 즉시 종료

    def check_sell_completion(self, previous_balances, current_balances):
        """매도 완료 확인 - 5000원 미만 잔량도 완료로 처리"""
        completed_sells = []
        
        for ticker in previous_balances:
            previous_value = previous_balances[ticker]['value']
            current_value = current_balances.get(ticker, {}).get('value', 0)
            
            # 완전 매도 또는 5000원 미만 잔량
            if current_value == 0 or current_value < 5000:
                completed_sells.append(ticker)
                self.logger.info(f"매도 완료: {ticker} (잔액: {current_value:,.0f}원)")
        
        return completed_sells

    def handle_sell_completed(self, ticker):
        """매도 완료 후 처리 - 테이블에서 제거"""
        self.ticker_data = [item for item in self.ticker_data if item['Ticker'] != ticker]
        self.logger.info(f"매도 완료 처리: {ticker} - 테이블에서 제거됨")
        self.refresh_table()

    def get_current_price(self, ticker):
        """특정 티커의 현재가 조회"""
        try:
            response = requests.get(f"https://api.upbit.com/v1/ticker?markets={ticker}")
            if response.status_code == 200:
                ticker_data = response.json()
                if ticker_data:
                    return ticker_data[0]['trade_price']
        except Exception as e:
            self.logger.error(f"현재가 조회 실패: {ticker} - {str(e)}")
        return 0

    def safe_api_call(self, api_func, *args, **kwargs):
        """안전한 API 호출 래퍼"""
        try:
            return api_func(*args, **kwargs)
        except ccxt.NetworkError as e:
            self.logger.error(f"네트워크 오류: {str(e)}")
            return None
        except ccxt.ExchangeError as e:
            self.logger.error(f"거래소 오류: {str(e)}")
            return None

if __name__ == "__main__":
    app = UpbitCommander()
    app.mainloop()
