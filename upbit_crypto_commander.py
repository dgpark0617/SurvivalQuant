import tkinter as tk
from tkinter import ttk

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

        self.update_interval = 5  # seconds
        self.countdown = self.update_interval

        # API Key Frame
        self.api_frame = tk.Frame(self)
        self.api_frame.pack(pady=(20, 10), padx=40, anchor='w')
        tk.Label(self.api_frame, text="Api key").grid(row=0, column=0, sticky='w', padx=(0, 8), pady=4)
        self.api_key_var = tk.StringVar()
        tk.Entry(self.api_frame, textvariable=self.api_key_var, width=40).grid(row=0, column=1, padx=(0, 8), pady=4, sticky='w')
        tk.Label(self.api_frame, text="Secret key").grid(row=1, column=0, sticky='w', padx=(0, 8), pady=4)
        self.secret_key_var = tk.StringVar()
        tk.Entry(self.api_frame, textvariable=self.secret_key_var, show="*", width=40).grid(row=1, column=1, padx=(0, 8), pady=4, sticky='w')
        tk.Button(self.api_frame, text="Start", command=self.on_start).grid(row=2, column=0, columnspan=2, pady=(12, 4), sticky='w')

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
            "sl(p/%)", "tp(p/%)", "tr%"
        ]
        self.ticker_data = [
            {
                "Ticker": "BTC/KRW", "Current": 50000000, "Average": 49000000,
                "c%": "2.0", "n%": "1.5", "x%": "0.5", "Qty": "0.02", "Ant": "1,000,000",
                "SL_Price": 48000000, "TP_Price": 52000000, "tr%": 3
            },
            {
                "Ticker": "ETH/KRW", "Current": 3200000, "Average": 3100000,
                "c%": "3.2", "n%": "1.9", "x%": "0.4", "Qty": "0.5", "Ant": "1,600,000",
                "SL_Price": 2900000, "TP_Price": 3500000, "tr%": 2
            },
            {
                "Ticker": "XRP/KRW", "Current": 1020, "Average": 1000,
                "c%": "1.8", "n%": "1.3", "x%": "0.3", "Qty": "300", "Ant": "306,000",
                "SL_Price": 980, "TP_Price": 1200, "tr%": 5
            }
        ]

        # Initialize x% (maxROE%) for each ticker
        for item in self.ticker_data:
            item["x%"] = self.get_current_roe(item)

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

        self.apply_btn = tk.Button(self.edit_frame, text="Apply", command=self.apply_edit)
        self.apply_btn.grid(row=0, column=10, padx=(15, 0))

    def update_countdown(self):
        self.update_label.config(text=f"Updating in {self.countdown} seconds...")
        if self.countdown > 0:
            self.countdown -= 1
            self.after(1000, self.update_countdown)
        else:
            self.countdown = self.update_interval
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

    def simulate_trailing_stop(self):
        # Trailing stop logic: x% is maxROE%
        for item in self.ticker_data:
            cur_roe = self.get_current_roe(item)
            # Update x% if new peak
            if cur_roe > item.get("x%", 0):
                item["x%"] = cur_roe
            max_roe = item["x%"]
            tr_percent = item.get("tr%", 0)
            new_sl_percent = round(max_roe - tr_percent, 2)
            avg = item["Average"]
            current_sl_price = item["SL_Price"]
            current_sl_percent = percent_from_price(avg, current_sl_price)
            # If new trailing stop is higher than current stoploss%, update it
            if new_sl_percent > current_sl_percent:
                item["SL_Price"] = round(price_from_percent(avg, new_sl_percent, is_sl=True), 2)

    def refresh_table(self):
        for row in self.tree.get_children():
            self.tree.delete(row)
        for item in self.ticker_data:
            avg = item["Average"]
            sl_price = item["SL_Price"]
            tp_price = item["TP_Price"]
            sl_perc = percent_from_price(avg, sl_price)
            tp_perc = percent_from_price(avg, tp_price)
            values = [
                item["Ticker"], f"{item['Current']:,}", f"{avg:,}", item["c%"], item["n%"],
                f"{item['x%']:.2f}", item["Qty"], item["Ant"],
                f"{sl_price:,} / {sl_perc:.2f}%", f"{tp_price:,} / {tp_perc:.2f}%", item.get("tr%", "")
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

        self.refresh_table()

    def on_start(self):
        pass

if __name__ == "__main__":
    app = UpbitCommander()
    app.mainloop()
