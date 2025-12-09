import tkinter as tk
from tkinter import ttk, messagebox
import time
import logging
import requests
import ccxt
import hashlib

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
        self.geometry("1400x500")
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
        
        # 매수 예약 관련 변수들
        self.buy_orders = []  # 매수 예약 주문 목록
        self.available_markets = []  # 사용 가능한 마켓 목록
        
        # 로깅 설정
        logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')
        self.logger = logging.getLogger(__name__)

        # 최상단 전체를 감싸는 그리드 프레임
        self.top_grid_frame = tk.Frame(self)
        self.top_grid_frame.pack(padx=40, pady=(20, 10), fill="x")
        self.top_grid_frame.columnconfigure(0, weight=1)
        self.top_grid_frame.columnconfigure(1, weight=1)

        # 블로그/오픈채팅 텍스트 (1행, 2컬럼 span)
        self.link_frame = tk.Frame(self.top_grid_frame)
        self.link_frame.grid(row=0, column=0, columnspan=2, sticky='ew')
        info_label = tk.Label(self.link_frame, text="코인 자동매매 프로그램 제작문의", fg="gray", font=("Arial", 9))
        info_label.pack(side='left', padx=(0, 10))
        blog_label = tk.Label(self.link_frame, text="📝 블로그", fg="blue", cursor="hand2")
        blog_label.pack(side='left', padx=(0, 10))
        blog_label.bind("<Button-1>", lambda e: self.open_blog())
        chat_label = tk.Label(self.link_frame, text="💬 오픈채팅방", fg="blue", cursor="hand2")
        chat_label.pack(side='left', padx=(0, 10))
        chat_label.bind("<Button-1>", lambda e: self.open_chat())

        # API 입력부와 계좌 정보를 한 줄로 배치 (2행)
        self.control_frame = tk.Frame(self.top_grid_frame)
        self.control_frame.grid(row=1, column=0, columnspan=2, sticky='ew', pady=(10,0))
        
        # API 입력부 (왼쪽)
        self.api_frame = tk.Frame(self.control_frame)
        self.api_frame.pack(side='left', anchor='w')
        tk.Label(self.api_frame, text="Api key").grid(row=0, column=0, sticky='w', padx=(0, 8), pady=2)
        self.api_key_var = tk.StringVar(value=self.upbit_access_key)
        tk.Entry(self.api_frame, textvariable=self.api_key_var, width=30).grid(row=0, column=1, padx=(0, 8), pady=2, sticky='w')
        tk.Label(self.api_frame, text="Secret key").grid(row=0, column=2, sticky='w', padx=(0, 8), pady=2)
        self.secret_key_var = tk.StringVar(value=self.upbit_secret_key)
        tk.Entry(self.api_frame, textvariable=self.secret_key_var, show="*", width=30).grid(row=0, column=3, padx=(0, 8), pady=2, sticky='w')
        self.start_button = tk.Button(self.api_frame, text="Start", command=self.on_start)
        self.start_button.grid(row=0, column=4, padx=(8, 0), pady=2, sticky='w')
        self.auto_sell_enabled = tk.BooleanVar(value=False)
        self.sell_checkbox = tk.Checkbutton(
            self.api_frame, 
            text="자동 매도 활성화", 
            variable=self.auto_sell_enabled
        )
        self.sell_checkbox.grid(row=0, column=5, padx=(8, 0), pady=2, sticky='w')
        
        # 계좌 정보 (오른쪽)
        self.account_frame = tk.Frame(self.control_frame)
        self.account_frame.pack(side='right', anchor='e')
        self.init_var = tk.StringVar(value="연결 대기 중...")
        self.total_var = tk.StringVar(value="연결 대기 중...")
        self.free_var = tk.StringVar(value="연결 대기 중...")
        self.used_var = tk.StringVar(value="연결 대기 중...")
        tk.Label(self.account_frame, text="Init:").grid(row=0, column=0, sticky='w', padx=(0, 5))
        tk.Label(self.account_frame, textvariable=self.init_var, width=12, anchor='w').grid(row=0, column=1, sticky='w', padx=(0, 10))
        tk.Label(self.account_frame, text="Total:").grid(row=0, column=2, sticky='w', padx=(0, 5))
        tk.Label(self.account_frame, textvariable=self.total_var, width=12, anchor='w').grid(row=0, column=3, sticky='w', padx=(0, 10))
        tk.Label(self.account_frame, text="Free:").grid(row=0, column=4, sticky='w', padx=(0, 5))
        tk.Label(self.account_frame, textvariable=self.free_var, width=12, anchor='w').grid(row=0, column=5, sticky='w', padx=(0, 10))
        tk.Label(self.account_frame, text="Used:").grid(row=0, column=6, sticky='w', padx=(0, 5))
        tk.Label(self.account_frame, textvariable=self.used_var, width=12, anchor='w').grid(row=0, column=7, sticky='w')

        # 매수 주문/매수 예약 주문 (3행, 1~2열 span)
        self.buy_section_frame = tk.Frame(self.top_grid_frame)
        self.buy_section_frame.grid(row=2, column=0, columnspan=2, sticky='ew', pady=(10,0))
        self.buy_section_frame.columnconfigure(0, weight=1)
        self.buy_section_frame.configure(width=1320)

        # Buy Order Frame (매수 주문 입력부)
        self.buy_frame = tk.LabelFrame(self.buy_section_frame, text="매수 주문", padx=10, pady=10)
        self.buy_frame.grid(row=0, column=0, sticky='ew')
        self.buy_frame.grid_propagate(True)
        tk.Label(self.buy_frame, text="코인:").grid(row=0, column=0, sticky='w', padx=(0, 5))
        self.buy_coin_var = tk.StringVar()
        self.buy_coin_combo = ttk.Combobox(self.buy_frame, textvariable=self.buy_coin_var, width=8, state="readonly")
        self.buy_coin_combo.grid(row=0, column=1, padx=5)
        tk.Label(self.buy_frame, text="가격:").grid(row=0, column=2, sticky='w', padx=(10, 5))
        self.buy_price_var = tk.StringVar()
        self.buy_price_entry = tk.Entry(self.buy_frame, textvariable=self.buy_price_var, width=10)
        self.buy_price_entry.grid(row=0, column=3, padx=5)
        tk.Label(self.buy_frame, text="(시장가)").grid(row=0, column=4, sticky='w', padx=5)
        tk.Label(self.buy_frame, text="금액:").grid(row=0, column=5, sticky='w', padx=(10, 5))
        self.buy_amount_var = tk.StringVar()
        self.buy_amount_entry = tk.Entry(self.buy_frame, textvariable=self.buy_amount_var, width=10)
        self.buy_amount_entry.grid(row=0, column=6, padx=5)
        tk.Label(self.buy_frame, text="원").grid(row=0, column=7, sticky='w', padx=5)
        tk.Label(self.buy_frame, text="Remarks:").grid(row=0, column=8, sticky='w', padx=(10, 5))
        self.buy_remarks_var = tk.StringVar()
        self.buy_remarks_entry = tk.Entry(self.buy_frame, textvariable=self.buy_remarks_var, width=15)
        self.buy_remarks_entry.grid(row=0, column=9, padx=5)
        self.buy_button = tk.Button(self.buy_frame, text="시장가 매수", command=self.place_buy_order)
        self.buy_button.grid(row=0, column=10, padx=(15, 0))

        # Buy Orders Frame (매수 예약 주문 윈도우) - self에 직접 배치
        self.buy_orders_frame = tk.Frame(self)
        self.buy_orders_frame.pack(padx=40, pady=20, anchor='w', fill="x", expand=False)
        
        # 제목 라벨 추가
        self.buy_orders_title = tk.Label(self.buy_orders_frame, text="매수 예약 주문", font=("Arial", 10, "bold"))
        self.buy_orders_title.pack(anchor='w', pady=(5, 0))
        
        buy_orders_columns = ["ID", "Coin", "Price", "Amount", "Remarks"]
        self.buy_orders_tree = ttk.Treeview(self.buy_orders_frame, columns=buy_orders_columns, show='headings', height=4)
        
        # 메인 테이블과 동일한 방식으로 열 너비 자동 계산
        buy_orders_data = [
            {"ID": "1", "Coin": "BTC/KRW", "Price": "50,000,000", "Amount": "1,000,000", "Remarks": "테스트 메모"},
            {"ID": "2", "Coin": "ETH/KRW", "Price": "3,000,000", "Amount": "500,000", "Remarks": ""}
        ]
        
        column_widths = {}
        for col in buy_orders_columns:
            if col == "Remarks":
                column_widths[col] = 0  # Remarks는 남은 공간을 모두 차지
            else:
                column_widths[col] = get_max_str_length(buy_orders_data, col, extra=2)
        for col in buy_orders_columns:
            self.buy_orders_tree.heading(col, text=col)
            if col == "Remarks":
                # Remarks 열은 왼쪽 정렬하고 남은 공간을 모두 차지
                self.buy_orders_tree.column(col, width=0, anchor='w', stretch=True)
            else:
                self.buy_orders_tree.column(col, width=column_widths[col], anchor='center', stretch=False)
        self.buy_orders_tree.pack(anchor='w', fill="x")
        
        style = ttk.Style()
        style.configure("Treeview", borderwidth=0)
        self.buy_orders_control_frame = tk.Frame(self.buy_orders_frame)
        self.buy_orders_control_frame.pack(fill="x", pady=(5, 0))
        self.cancel_order_btn = tk.Button(self.buy_orders_control_frame, text="예약 취소", command=self.cancel_buy_order)
        self.cancel_order_btn.pack(side="left", padx=(0, 5))
        self.clear_orders_btn = tk.Button(self.buy_orders_control_frame, text="전체 삭제", command=self.clear_buy_orders)
        self.clear_orders_btn.pack(side="left")

        # 메인 테이블과 에디트 박스는 아래로 충분히 내림
        self.table_frame = tk.Frame(self)
        self.table_frame.pack(padx=40, pady=20, anchor='w', fill="x", expand=False)
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
        self.edit_frame = tk.LabelFrame(self, text="Edit Selected Row (SL/TP/tr%) fields", padx=10, pady=5)
        self.edit_frame.pack(padx=40, pady=(0,5), anchor='w')
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
                'createMarketBuyOrderRequiresPrice': False  # 시장가 매수 시 가격 미필요 옵션
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
        """계좌 잔고 정보 조회 - CCXT fetch_balance() 사용"""
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
            
            # CCXT fetch_balance() 사용하여 계좌 정보 조회
            balance = self.exchange.fetch_balance()
            self.logger.info(f"CCXT 잔고 데이터 수신: {len(balance.get('total', {}))}개 통화")
            
            # KRW 잔고 정보 추출
            krw_balance = balance.get('KRW', {})
            free_krw = float(krw_balance.get('free', 0))
            used_krw = float(krw_balance.get('used', 0))
            total_krw = float(krw_balance.get('total', 0))
            
            # 보유 코인 정보 수집
            coin_balances = []
            total_coin_value = 0  # 보유 코인의 총 가치
            
            for currency, currency_balance in balance.get('total', {}).items():
                if currency != 'KRW' and float(currency_balance) > 0:
                    free_amount = float(balance.get('free', {}).get(currency, 0))
                    used_amount = float(balance.get('used', {}).get(currency, 0))
                    total_amount = float(currency_balance)
                    
                    # 평균 매수가 정보 (업비트 특화)
                    avg_buy_price = 0
                    if 'info' in balance and isinstance(balance['info'], list):
                        for item in balance['info']:
                            if isinstance(item, dict) and item.get('currency') == currency:
                                avg_buy_price = float(item.get('avg_buy_price', 0))
                                break
                    

                    
                    coin_balances.append({
                        'currency': currency,
                        'balance': total_amount,
                        'locked': used_amount,
                        'avg_buy_price': avg_buy_price
                    })
                    
                    # 현재가를 이용한 코인 가치 계산
                    ticker = f"KRW-{currency}"
                    ticker_data = self.current_prices.get(ticker, {})
                    current_price = ticker_data.get('trade_price', 0)
                    if current_price > 0:
                        coin_value = total_amount * current_price
                        total_coin_value += coin_value
            
            # 현재 보유 코인 정보 수집 (매도 완료 확인용)
            current_balances = {}
            for coin in coin_balances:
                ticker = f"KRW-{coin['currency']}"
                quantity = coin['balance']
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
            
            # GUI 업데이트 - 보유 코인 가치를 used에 포함
            self.free_var.set(f"{free_krw:,.0f} won")
            self.used_var.set(f"{used_krw + total_coin_value:,.0f} won")
            self.total_var.set(f"{free_krw + used_krw + total_coin_value:,.0f} won")
            
            # Init 값은 첫 번째 연결 시에만 설정 (초기 투자금액으로 간주)
            if self.init_var.get() == "연결 대기 중...":
                self.init_var.set(f"{free_krw + used_krw + total_coin_value:,.0f} won")
            
            self.account_balance = {
                'krw': {'free': free_krw, 'used': used_krw, 'total': total_krw},
                'coins': coin_balances,
                'total_coin_value': total_coin_value
            }
            
            self.logger.info(f"계좌 잔고 조회 완료: KRW {total_krw:,.0f}원, 보유 코인 {len(coin_balances)}개, 코인 가치 {total_coin_value:,.0f}원")
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
                    
                    # 평균 매수가가 0인 경우 현재가로 대체
                    if avg_price == 0:
                        self.logger.warning(f"평균 매수가 조회 실패: {coin['currency']} - 현재가로 대체하여 계산")
                        avg_price = current_price  # 현재가로 대체하여 0% 수익률로 시작
                    
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
                # 기존 ticker_data의 n%, x%, min_x%, SL_Price, TP_Price 값 보존
                existing_data = {}
                for item in self.ticker_data:
                    existing_data[item['Ticker']] = {
                        'n%': item.get('n%', 0), 
                        'x%': item.get('x%', 0),
                        'min_x%': item.get('min_x%', 2.0),
                        'SL_Price': item.get('SL_Price', 0),
                        'TP_Price': item.get('TP_Price', 0),
                        'tr%': item.get('tr%', 2.0)
                    }
                
                # 새 데이터에 기존 설정값 적용
                for new_item in self.real_ticker_data:
                    ticker = new_item['Ticker']
                    if ticker in existing_data:
                        # 기존 추적 데이터 및 설정값 보존
                        existing_n = existing_data[ticker]['n%']
                        existing_x = existing_data[ticker]['x%']
                        current_roe = new_item['c%']
                        
                        # n% 업데이트 (더 낮은 값으로)
                        new_item['n%'] = min(existing_n, current_roe)
                        
                        # x% 업데이트 (더 높은 값으로)
                        new_item['x%'] = max(existing_x, current_roe)
                        
                        new_item['min_x%'] = existing_data[ticker]['min_x%']
                        new_item['SL_Price'] = existing_data[ticker]['SL_Price']
                        new_item['TP_Price'] = existing_data[ticker]['TP_Price']
                        new_item['tr%'] = existing_data[ticker]['tr%']
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
            
            # 현재가 캐시에서 수익률 재계산
            for item in self.ticker_data:
                ticker = item['Ticker']
                current_price = self.current_prices.get(ticker, {}).get('trade_price', 0)
                if current_price > 0:
                    item['Current'] = current_price
                    # 수익률 재계산
                    item['c%'] = self.get_current_roe(item)
                    # 평가금액 재계산
                    qty = float(item['Qty'])
                    item['Ant'] = round(qty * current_price, 0)
            
            # 트레일링 스탑 로직 실행
            self.simulate_trailing_stop()
            
            # 매도 조건 체크 및 주문 전송
            self.check_sell_conditions()
            
            # 매수 예약 조건 체크 및 실행
            self.check_buy_orders()
            
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
                self.load_markets_for_dropdown()  # 코인 드롭다운 초기화
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
            # 계좌 정보 초기화
            self.init_var.set("연결 대기 중...")
            self.total_var.set("연결 대기 중...")
            self.free_var.set("연결 대기 중...")
            self.used_var.set("연결 대기 중...")
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
            # CCXT 형식 (BTC/KRW)을 업비트 형식 (KRW-BTC)으로 변환
            if '/' in ticker:
                parts = ticker.split('/')
                if len(parts) == 2 and parts[1] == 'KRW':
                    upbit_ticker = f"KRW-{parts[0]}"
                else:
                    upbit_ticker = ticker
            else:
                upbit_ticker = ticker
            
            # 현재가 캐시에서 먼저 확인
            cached_price = self.current_prices.get(upbit_ticker, {}).get('trade_price', 0)
            if cached_price > 0:
                self.logger.debug(f"캐시된 현재가 사용: {ticker} -> {upbit_ticker} = {cached_price:,.0f}원")
                return cached_price
            
            # API로 현재가 조회
            response = requests.get(f"https://api.upbit.com/v1/ticker?markets={upbit_ticker}")
            if response.status_code == 200:
                ticker_data = response.json()
                if ticker_data:
                    price = ticker_data[0]['trade_price']
                    self.logger.debug(f"API 현재가 조회 성공: {ticker} -> {upbit_ticker} = {price:,.0f}원")
                    return price
                else:
                    self.logger.warning(f"현재가 데이터 없음: {ticker} -> {upbit_ticker}")
            else:
                self.logger.warning(f"현재가 API 응답 오류: {response.status_code} - {ticker} -> {upbit_ticker}")
        except Exception as e:
            self.logger.error(f"현재가 조회 실패: {ticker} -> {upbit_ticker} - {str(e)}")
        return 0

    def place_buy_order(self):
        """매수 예약 주문 처리"""
        try:
            # 입력값 검증
            coin = self.buy_coin_var.get().strip()
            price_str = self.buy_price_var.get().strip()
            amount_str = self.buy_amount_var.get().strip()
            remarks = self.buy_remarks_var.get().strip()
            
            if not coin:
                tk.messagebox.showerror("입력 오류", "코인을 선택해주세요.")
                return
                
            if not amount_str:
                tk.messagebox.showerror("입력 오류", "주문 금액을 입력해주세요.")
                return
            
            try:
                amount = float(amount_str)
            except ValueError:
                tk.messagebox.showerror("입력 오류", "주문 금액은 숫자로 입력해주세요.")
                return
            
            # 주문 금액 검증 (1만원 이상)
            if amount < 10000:
                tk.messagebox.showerror("입력 오류", "주문 금액은 1만원 이상이어야 합니다.")
                return
            
            # 잔고 검증
            if self.is_connected and self.account_balance:
                free_krw = self.account_balance.get('krw', {}).get('free', 0)
                if amount > free_krw:
                    tk.messagebox.showerror("잔고 부족", f"사용 가능한 KRW: {free_krw:,.0f}원\n주문 금액: {amount:,.0f}원")
                    return
            
            # 가격 처리
            price = None
            if price_str:
                try:
                    price = float(price_str)
                    if price <= 0:
                        tk.messagebox.showerror("입력 오류", "가격은 0보다 큰 숫자로 입력해주세요.")
                        return
                except ValueError:
                    tk.messagebox.showerror("입력 오류", "가격은 숫자로 입력해주세요.")
                    return
            
            # 티커 형식 변환 (BTC -> BTC/KRW)
            ticker = f"{coin}/KRW"
            
            # 예약 주문 정보 생성
            order_info = {
                'id': len(self.buy_orders) + 1,  # 간단한 ID
                'ticker': ticker,
                'coin': coin,
                'price': price,
                'amount': amount,
                'remarks': remarks,  # remarks 필드 추가
                'order_type': 'market',  # 항상 시장가
                'status': 'pending',  # pending, executed, cancelled
                'created_at': time.strftime('%Y-%m-%d %H:%M:%S'),
                'executed_at': None
            }
            
            # 예약 주문 목록에 추가
            self.buy_orders.append(order_info)
            
            # 입력 필드 초기화
            self.buy_price_var.set("")
            self.buy_amount_var.set("")
            self.buy_remarks_var.set("")
            
            # 예약 테이블 업데이트
            self.refresh_buy_orders_table()
            
            # 로그 메시지
            if price is None:
                self.logger.info(f"즉시 시장가 매수 예약: {ticker} - {amount:,.0f}원")
                tk.messagebox.showinfo("예약 완료", f"즉시 시장가 매수 예약이 완료되었습니다.\n코인: {coin}\n금액: {amount:,.0f}원")
            else:
                self.logger.info(f"조건부 시장가 매수 예약: {ticker} - {price:,.0f}원 도달 시 {amount:,.0f}원")
                tk.messagebox.showinfo("예약 완료", f"조건부 시장가 매수 예약이 완료되었습니다.\n코인: {coin}\n목표가: {price:,.0f}원\n금액: {amount:,.0f}원")
                
        except Exception as e:
            self.logger.error(f"매수 예약 주문 처리 실패: {str(e)}")
            tk.messagebox.showerror("오류", f"매수 예약 주문 처리 중 오류가 발생했습니다.\n{str(e)}")

    def refresh_buy_orders_table(self):
        """매수 예약 주문 테이블 새로고침"""
        # 기존 데이터 삭제
        for row in self.buy_orders_tree.get_children():
            self.buy_orders_tree.delete(row)
        
        # 완료된 주문과 취소된 주문 제거 (즉시)
        self.buy_orders = [order for order in self.buy_orders if order['status'] == 'pending']
        
        # 예약 주문 데이터 추가 (대기중인 주문만)
        for order in self.buy_orders:
            price_display = f"{order['price']:,.0f}" if order['price'] else "즉시"
            remarks = order.get('remarks', '')  # remarks 필드 가져오기 (기본값: 빈 문자열)
            values = [
                order['id'],
                order['coin'],
                price_display,
                f"{order['amount']:,.0f}",
                remarks
            ]
            self.buy_orders_tree.insert('', 'end', values=values)

    def cancel_buy_order(self):
        """선택된 매수 예약 주문 취소"""
        selected = self.buy_orders_tree.selection()
        if not selected:
            tk.messagebox.showwarning("선택 오류", "취소할 예약 주문을 선택해주세요.")
            return
        
        # 선택된 행의 ID 가져오기
        item = self.buy_orders_tree.item(selected[0])
        order_id = int(item['values'][0])
        
        self.logger.info(f"예약 주문 취소 시도: ID {order_id}")
        
        # 예약 주문 목록에서 찾아서 상태 변경
        order_found = False
        for order in self.buy_orders:
            if order['id'] == order_id:
                if order['status'] == 'pending':
                    order['status'] = 'cancelled'
                    self.logger.info(f"매수 예약 주문 취소 완료: {order['ticker']} - {order['amount']:,.0f}원")
                    order_found = True
                    break
                else:
                    self.logger.warning(f"이미 처리된 주문: ID {order_id} - 상태: {order['status']}")
                    tk.messagebox.showwarning("취소 실패", f"이미 처리된 주문입니다. (상태: {order['status']})")
                    return
        
        if not order_found:
            self.logger.error(f"취소할 주문을 찾을 수 없음: ID {order_id}")
            tk.messagebox.showerror("취소 실패", "취소할 주문을 찾을 수 없습니다.")
            return
        
        # 테이블 새로고침
        self.refresh_buy_orders_table()
        self.logger.info(f"예약 주문 테이블 새로고침 완료: 남은 주문 {len(self.buy_orders)}개")
        tk.messagebox.showinfo("취소 완료", "선택된 예약 주문이 취소되었습니다.")

    def clear_buy_orders(self):
        """모든 매수 예약 주문 삭제"""
        if not self.buy_orders:
            tk.messagebox.showinfo("알림", "삭제할 예약 주문이 없습니다.")
            return
        
        result = tk.messagebox.askyesno("확인", "모든 예약 주문을 삭제하시겠습니까?")
        if result:
            self.buy_orders = []
            self.refresh_buy_orders_table()
            self.logger.info("모든 매수 예약 주문이 삭제되었습니다.")
            tk.messagebox.showinfo("삭제 완료", "모든 예약 주문이 삭제되었습니다.")

    def check_buy_orders(self):
        """예약 주문 조건 체크 및 실행"""
        if not self.is_connected or not self.buy_orders:
            return
        
        try:
            self.logger.debug(f"예약 주문 체크 시작: {len(self.buy_orders)}개 주문")
            
            for order in self.buy_orders[:]:  # 복사본으로 순회 (리스트 변경 가능)
                if order['status'] != 'pending':
                    self.logger.debug(f"대기중이 아닌 주문 건너뛰기: {order['ticker']} - 상태: {order['status']}")
                    continue
                
                ticker = order['ticker']
                current_price = self.get_current_price(ticker)
                
                self.logger.info(f"예약 주문 체크: {ticker} - 현재가: {current_price:,.0f}원, 목표가: {order['price']}")
                
                if current_price <= 0:
                    self.logger.warning(f"현재가 조회 실패: {ticker} - 건너뛰기")
                    continue  # 현재가 조회 실패 시 건너뛰기
                
                # 가격 미입력 주문인 경우 즉시 실행
                if order['price'] is None:
                    self.logger.info(f"즉시 시장가 매수 주문 실행 시도: {ticker} - {order['amount']:,.0f}원")
                    if self.execute_buy_order(order):
                        order['status'] = 'executed'
                        order['executed_at'] = time.strftime('%Y-%m-%d %H:%M:%S')
                        self.logger.info(f"즉시 시장가 매수 주문 실행 완료: {ticker} - {order['amount']:,.0f}원")
                    else:
                        self.logger.error(f"즉시 시장가 매수 주문 실행 실패: {ticker} - {order['amount']:,.0f}원")
                
                # 가격 입력 주문인 경우 가격 조건 체크
                else:
                    target_price = order['price']
                    if current_price >= target_price:  # 현재가가 목표가 이상이면 매수
                        self.logger.info(f"조건부 시장가 매수 주문 실행 시도: {ticker} - 현재가({current_price:,.0f}원) >= 목표가({target_price:,.0f}원) - {order['amount']:,.0f}원")
                        if self.execute_buy_order(order):
                            order['status'] = 'executed'
                            order['executed_at'] = time.strftime('%Y-%m-%d %H:%M:%S')
                            self.logger.info(f"조건부 시장가 매수 주문 실행 완료: {ticker} - {target_price:,.0f}원 도달 시 {order['amount']:,.0f}원")
                        else:
                            self.logger.error(f"조건부 시장가 매수 주문 실행 실패: {ticker} - {target_price:,.0f}원 도달 시 {order['amount']:,.0f}원")
                    else:
                        self.logger.debug(f"조건 미충족: {ticker} - 현재가({current_price:,.0f}원) < 목표가({target_price:,.0f}원)")
            
            # 테이블 업데이트
            self.refresh_buy_orders_table()
            
        except Exception as e:
            self.logger.error(f"예약 주문 체크 실패: {str(e)}")

    def execute_buy_order(self, order):
        """실제 매수 주문 실행 (항상 시장가)"""
        try:
            if not self.is_connected:
                return False
            
            ticker = order['ticker']
            cost = order['amount']  # 총 지출 금액 (KRW)
            
            # CCXT 형식을 업비트 형식으로 변환
            if '/' in ticker:
                parts = ticker.split('/')
                if len(parts) == 2 and parts[1] == 'KRW':
                    upbit_ticker = f"KRW-{parts[0]}"
                else:
                    upbit_ticker = ticker
            else:
                upbit_ticker = ticker
            
            # CCXT 옵션 상태 확인 및 강제 설정
            self.logger.info(f"CCXT 옵션 확인: createMarketBuyOrderRequiresPrice = {self.exchange.options.get('createMarketBuyOrderRequiresPrice', 'Not Set')}")
            
            # 옵션 강제 설정
            self.exchange.options['createMarketBuyOrderRequiresPrice'] = False
            self.logger.info(f"CCXT 옵션 강제 설정: createMarketBuyOrderRequiresPrice = {self.exchange.options.get('createMarketBuyOrderRequiresPrice')}")
            
            try:
                # CCXT로 시도
                result = self.exchange.create_market_buy_order(
                    symbol=ticker, 
                    amount=cost
                )
                self.logger.info(f"CCXT 매수 주문 전송 성공: {ticker} - {cost:,.0f}원")
                self.logger.debug(f"주문 결과: {result}")
                return True
                
            except Exception as ccxt_error:
                self.logger.error(f"CCXT 매수 주문 실패: {str(ccxt_error)}")
                return False
            
        except Exception as e:
            self.logger.error(f"매수 주문 실행 실패: {ticker} - {str(e)}")
            return False

    def load_markets_for_dropdown(self):
        """업비트 마켓 정보를 로드하여 코인 드롭다운 초기화"""
        try:
            if not self.is_connected:
                return
            
            # 업비트 마켓 정보 조회
            markets_response = requests.get("https://api.upbit.com/v1/market/all")
            if markets_response.status_code == 200:
                markets = markets_response.json()
                
                # KRW 마켓만 필터링
                krw_markets = [market['market'] for market in markets if market['market'].startswith('KRW-')]
                
                # 코인 심볼만 추출 (KRW-BTC -> BTC)
                coin_symbols = [market[4:] for market in krw_markets]
                
                # 드롭다운 업데이트
                self.buy_coin_combo['values'] = coin_symbols
                if coin_symbols:
                    self.buy_coin_combo.set(coin_symbols[0])  # 첫 번째 코인 선택
                
                self.available_markets = krw_markets
                self.logger.info(f"마켓 정보 로드 완료: {len(coin_symbols)}개 코인")
                
        except Exception as e:
            self.logger.error(f"마켓 정보 로드 실패: {str(e)}")

    def open_blog(self):
        """블로그 링크 열기"""
        import webbrowser
        webbrowser.open("https://blog.naver.com/economic_eden")
        
    def open_chat(self):
        """오픈채팅방 링크 열기"""
        import webbrowser
        webbrowser.open("https://open.kakao.com/o/sy2UErbd")

if __name__ == "__main__":
    app = UpbitCommander()
    app.mainloop()