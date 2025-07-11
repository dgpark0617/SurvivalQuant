import pandas as pd
import requests
import io

# 판다스 데이터프레임 전체 출력옵션
pd.set_option('display.max_rows', None)



def get_heikin_ashi_df(stock_code, pages=10):
    all_dfs = []
    headers = {'User-Agent': 'Mozilla/5.0'}

    for page in range(1, pages + 1):
        url = f'https://finance.naver.com/item/sise_day.naver?code={stock_code}&page={page}'
        response = requests.get(url, headers=headers)
        response.encoding = 'euc-kr'
        dfs = pd.read_html(io.StringIO(response.text))
        df = dfs[0]
        all_dfs.append(df)

    merged_df = pd.concat(all_dfs, ignore_index=True)
    cleaned_df = merged_df.dropna()

    # 컬럼명 정리
    cleaned_df = cleaned_df.rename(columns=lambda x: x.strip())
    cleaned_df = cleaned_df[['날짜', '시가', '고가', '저가', '종가', '거래량']]

    # 데이터 타입 정리
    for col in ['시가', '고가', '저가', '종가', '거래량']:
        cleaned_df[col] = cleaned_df[col].astype(str).str.replace(',', '').astype(float)

    # 날짜 오름차순(과거->최신) 정렬
    cleaned_df = cleaned_df.sort_values('날짜').reset_index(drop=True)

    # 하이킨아시 캔들 계산
    ha_open = []
    ha_close = []
    ha_high = []
    ha_low = []

    for i in range(len(cleaned_df)):
        o = cleaned_df.loc[i, '시가']
        h = cleaned_df.loc[i, '고가']
        l = cleaned_df.loc[i, '저가']
        c = cleaned_df.loc[i, '종가']
        # Heikin-Ashi 종가: (시가 + 고가 + 저가 + 종가) / 4
        ha_c = (o + h + l + c) / 4
        ha_close.append(ha_c)

        if i == 0:
            # 최초 Heikin-Ashi 시가: (시가 + 종가) / 2 (일반적 방법)
            ha_o = (o + c) / 2
        else:
            # 직전 Heikin-Ashi (시가+종가)/2
            ha_o = (ha_open[i-1] + ha_close[i-1]) / 2
        ha_open.append(ha_o)

        # Heikin-Ashi 고가: max(고가, ha_open, ha_close)
        ha_h = max(h, ha_o, ha_c)
        ha_high.append(ha_h)

        # Heikin-Ashi 저가: min(저가, ha_open, ha_close)
        ha_l = min(l, ha_o, ha_c)
        ha_low.append(ha_l)

    # Heikin-Ashi 양봉/음봉: ha_close > ha_open이면 1, 아니면 0
    ha_bull = [1 if ha_close[i] > ha_open[i] else 0 for i in range(len(ha_open))]

    # 영문 컬럼명으로 매핑 및 추가
    cleaned_df['date'] = cleaned_df['날짜']
    cleaned_df['Open'] = cleaned_df['시가']
    cleaned_df['High'] = cleaned_df['고가']
    cleaned_df['Low'] = cleaned_df['저가']
    cleaned_df['Close'] = cleaned_df['종가']
    cleaned_df['Volume'] = cleaned_df['거래량']
    cleaned_df['HAO'] = ha_open
    cleaned_df['HAH'] = ha_high
    cleaned_df['HAL'] = ha_low
    cleaned_df['HAC'] = ha_close
    cleaned_df['HAD'] = ha_bull

    # 최종 컬럼 순서 지정
    final_cols = ['date', 'HAD', 'HAO', 'HAH', 'HAL', 'HAC', 'Open', 'High', 'Low', 'Close', 'Volume']
    result_df = cleaned_df[final_cols]
    return result_df

# 사용 예시 (삼성전자: 005930, LG에너지솔루션: 373220 등)
if __name__ == "__main__":
    stock_code = '005930'  # 원하는 종목코드로 변경
    df = get_heikin_ashi_df(stock_code, pages=10)
    print(df.tail(30))