# 📈 KỸ THUẬT DỰ BÁO THỐNG KÊ - FORECASTING TECHNIQUES

**Dự án:** AI Agent for Business  
**Ngày:** 10/01/2026  
**Mục đích:** Dự báo dựa trên toán học & thống kê, KHÔNG ĐOÁN MÒ

---

## 🎯 **TỔNG QUAN**

Hệ thống sử dụng **6 kỹ thuật dự báo thống kê chuẩn** thay vì để AI "đoán bừa":

| Kỹ thuật | Công thức | Use Case | Độ chính xác |
|----------|-----------|----------|--------------|
| **Simple Moving Average** | SMA = Σ(Pn)/n | Dữ liệu ổn định | Trung bình |
| **Weighted Moving Average** | WMA = Σ(w×P)/Σw | Ưu tiên gần đây | Tốt |
| **Exponential Smoothing** | St = α×Xt + (1-α)×St-1 | Dữ liệu có noise | Tốt |
| **Double Exp. Smoothing** | Holt's Method | Có xu hướng | Rất tốt |
| **Linear Regression** | y = mx + b | Trend rõ ràng | Cao nhất |
| **Seasonal Decomposition** | Trend + Seasonal | Dữ liệu theo mùa | Rất tốt |

---

## 📊 **1. SIMPLE MOVING AVERAGE (SMA)**

### Công thức:
```
SMA = (P1 + P2 + P3 + ... + Pn) / n

Trong đó:
- P1, P2, ..., Pn: Giá trị trong window
- n: Số điểm dữ liệu (window size)
```

### Ví dụ thực tế:
```python
# Doanh thu 7 ngày: [100, 120, 110, 130, 125, 140, 135]
# Window = 3 (3 ngày gần nhất)

SMA = (125 + 140 + 135) / 3 = 400 / 3 = 133.33

# Dự báo ngày 8: ~133 nghìn VNĐ
```

### Code implementation:
```python
def simple_moving_average(data: List[float], window: int = 3) -> float:
    recent_data = data[-window:]  # Lấy n điểm gần nhất
    return sum(recent_data) / len(recent_data)
```

### Ưu điểm:
- ✅ Đơn giản, dễ hiểu
- ✅ Làm mịn noise
- ✅ Phù hợp dữ liệu ổn định

### Nhược điểm:
- ❌ Không phản ứng nhanh với thay đổi đột ngột
- ❌ Tất cả điểm có trọng số bằng nhau

---

## 📈 **2. WEIGHTED MOVING AVERAGE (WMA)**

### Công thức:
```
WMA = (n×Pn + (n-1)×Pn-1 + ... + 1×P1) / (n + (n-1) + ... + 1)

Trong đó:
- Dữ liệu gần nhất có trọng số cao nhất (n)
- Dữ liệu xa nhất có trọng số thấp nhất (1)
```

### Ví dụ thực tế:
```python
# Doanh thu 3 ngày: [125, 140, 135]
# Trọng số: [1, 2, 3]

WMA = (1×125 + 2×140 + 3×135) / (1+2+3)
    = (125 + 280 + 405) / 6
    = 810 / 6
    = 135

# Dự báo ngày 4: ~135 nghìn VNĐ
```

### Code implementation:
```python
def weighted_moving_average(data: List[float], window: int = 3) -> float:
    recent_data = data[-window:]
    weights = list(range(1, window + 1))  # [1, 2, 3]
    
    weighted_sum = sum(val * weight for val, weight in zip(recent_data, weights))
    weight_sum = sum(weights)
    
    return weighted_sum / weight_sum
```

### Ưu điểm:
- ✅ Phản ứng nhanh hơn SMA
- ✅ Ưu tiên dữ liệu gần đây

### Nhược điểm:
- ❌ Vẫn có độ trễ
- ❌ Chọn trọng số chủ quan

---

## 🌊 **3. EXPONENTIAL SMOOTHING (ES)**

### Công thức:
```
St = α × Xt + (1 - α) × St-1

Trong đó:
- St: Giá trị smoothed tại thời điểm t
- Xt: Giá trị thực tế tại t
- St-1: Giá trị smoothed trước đó
- α (alpha): Smoothing factor (0 < α < 1)
  + α cao (0.7-0.9): nhạy với thay đổi gần đây
  + α thấp (0.1-0.3): ổn định hơn
```

### Ví dụ thực tế:
```python
# Doanh thu: [100, 120, 110, 130, 125, 140, 135]
# α = 0.3

S0 = 100  # Khởi tạo
S1 = 0.3×120 + 0.7×100 = 36 + 70 = 106
S2 = 0.3×110 + 0.7×106 = 33 + 74.2 = 107.2
S3 = 0.3×130 + 0.7×107.2 = 39 + 75.04 = 114.04
S4 = 0.3×125 + 0.7×114.04 = 37.5 + 79.83 = 117.33
S5 = 0.3×140 + 0.7×117.33 = 42 + 82.13 = 124.13
S6 = 0.3×135 + 0.7×124.13 = 40.5 + 86.89 = 127.39

# Dự báo ngày 8: ~127 nghìn VNĐ
```

### Code implementation:
```python
def exponential_smoothing(data: List[float], alpha: float = 0.3) -> float:
    smoothed = data[0]  # S0 = X0
    
    for value in data[1:]:
        smoothed = alpha * value + (1 - alpha) * smoothed
    
    return smoothed
```

### Ưu điểm:
- ✅ Phản ứng nhanh với thay đổi
- ✅ Chỉ cần lưu 1 giá trị trước đó
- ✅ Làm mịn noise tốt

### Nhược điểm:
- ❌ Không xử lý xu hướng (trend)
- ❌ Cần chọn α phù hợp

---

## 📊 **4. DOUBLE EXPONENTIAL SMOOTHING (HOLT'S METHOD)**

### Công thức:
```
Level (Lt):  Lt = α × Xt + (1-α) × (Lt-1 + Tt-1)
Trend (Tt):  Tt = β × (Lt - Lt-1) + (1-β) × Tt-1
Forecast:    Ft+1 = Lt + Tt

Trong đó:
- Lt: Level component (mức độ)
- Tt: Trend component (xu hướng)
- α: Level smoothing factor
- β: Trend smoothing factor
```

### Ví dụ thực tế:
```python
# Doanh thu có xu hướng tăng: [100, 120, 140, 160, 180]
# α = 0.3, β = 0.3

# Khởi tạo
L0 = 100
T0 = 120 - 100 = 20

# Tính cho điểm 1 (140)
L1 = 0.3×140 + 0.7×(100+20) = 42 + 84 = 126
T1 = 0.3×(126-100) + 0.7×20 = 7.8 + 14 = 21.8

# Forecast = L1 + T1 = 126 + 21.8 = 147.8

# Dự báo có tính xu hướng tăng!
```

### Code implementation:
```python
def double_exponential_smoothing(data: List[float], alpha=0.3, beta=0.3) -> float:
    level = data[0]
    trend = data[1] - data[0] if len(data) > 1 else 0
    
    for value in data[1:]:
        prev_level = level
        level = alpha * value + (1 - alpha) * (level + trend)
        trend = beta * (level - prev_level) + (1 - beta) * trend
    
    return level + trend  # Forecast
```

### Ưu điểm:
- ✅ Xử lý cả level và trend
- ✅ Dự báo chính xác với dữ liệu có xu hướng
- ✅ Tự động điều chỉnh

### Nhược điểm:
- ❌ Cần 2 tham số (α, β)
- ❌ Không xử lý seasonality

---

## 📉 **5. LINEAR REGRESSION (HỒI QUY TUYẾN TÍNH)**

### Công thức:
```
y = mx + b

Slope (m):     m = Σ[(x - x̄)(y - ȳ)] / Σ(x - x̄)²
Intercept (b): b = ȳ - m × x̄

Trong đó:
- y: Giá trị dự báo
- x: Thời gian
- m: Độ dốc (slope) - tốc độ thay đổi
- b: Điểm cắt (intercept)
- x̄, ȳ: Giá trị trung bình
```

### R² (Coefficient of Determination):
```
R² = 1 - (SS_residual / SS_total)

SS_residual = Σ(y_actual - y_predicted)²
SS_total = Σ(y_actual - ȳ)²

R² = 0: Model không giải thích được gì
R² = 1: Model hoàn hảo (100% chính xác)
R² > 0.7: Model tốt
```

### Ví dụ thực tế:
```python
# Doanh thu 5 ngày: [100, 120, 140, 160, 180]
# x: [0, 1, 2, 3, 4]

x̄ = (0+1+2+3+4)/5 = 2
ȳ = (100+120+140+160+180)/5 = 140

# Tính slope
Σ[(x-x̄)(y-ȳ)] = (0-2)(100-140) + (1-2)(120-140) + ... = 200
Σ(x-x̄)² = (0-2)² + (1-2)² + (2-2)² + (3-2)² + (4-2)² = 10

m = 200/10 = 20  # Tăng 20 mỗi ngày

# Tính intercept
b = 140 - 20×2 = 100

# Công thức: y = 20x + 100

# Dự báo ngày 6 (x=5):
y = 20×5 + 100 = 200 nghìn VNĐ

# R² ~ 1.0 (perfect fit vì data tuyến tính)
```

### Code implementation:
```python
def linear_regression_forecast(data: List[float], periods_ahead: int = 1) -> Dict:
    n = len(data)
    x_values = list(range(n))
    
    x_mean = sum(x_values) / n
    y_mean = sum(data) / n
    
    # Slope
    numerator = sum((x - x_mean) * (y - y_mean) 
                    for x, y in zip(x_values, data))
    denominator = sum((x - x_mean) ** 2 for x in x_values)
    slope = numerator / denominator if denominator != 0 else 0
    
    # Intercept
    intercept = y_mean - slope * x_mean
    
    # Forecast
    forecast_x = n + periods_ahead - 1
    forecast = slope * forecast_x + intercept
    
    # R² calculation
    y_pred = [slope * x + intercept for x in x_values]
    ss_res = sum((y - y_pred[i])**2 for i, y in enumerate(data))
    ss_tot = sum((y - y_mean)**2 for y in data)
    r_squared = 1 - (ss_res / ss_tot) if ss_tot != 0 else 0
    
    return {
        'forecast': max(0, forecast),
        'slope': slope,
        'intercept': intercept,
        'r_squared': r_squared,
        'confidence': r_squared
    }
```

### Ưu điểm:
- ✅ Cho biết tốc độ thay đổi (slope)
- ✅ R² đo độ tin cậy
- ✅ Dễ giải thích

### Nhược điểm:
- ❌ Chỉ phù hợp với dữ liệu tuyến tính
- ❌ Không xử lý seasonality

---

## 🔄 **6. SEASONAL DECOMPOSITION**

### Công thức:
```
Y = Trend + Seasonal + Residual

Trend: Moving average
Seasonal: Average deviation per period
Residual: Noise
```

### Ví dụ thực tế:
```python
# Doanh thu 14 ngày (2 tuần), period = 7
# [100, 120, 140, 130, 110, 150, 160,  # Tuần 1
#  105, 125, 145, 135, 115, 155, 165]  # Tuần 2

# Seasonal pattern (7 ngày):
# Mon: trung bình 102.5
# Tue: trung bình 122.5
# Wed: trung bình 142.5
# Thu: trung bình 132.5
# Fri: trung bình 112.5
# Sat: trung bình 152.5
# Sun: trung bình 162.5

# Dự báo thứ 2 tuần 3:
# Trend (cuối) = 140
# Seasonal Mon = 102.5 - 130 (avg all) = -27.5
# Forecast = 140 + (-27.5) = 112.5
```

### Code implementation:
```python
def seasonal_decomposition(data: List[float], period: int = 7) -> Dict:
    # Calculate trend (moving average)
    trend = []
    for i in range(len(data)):
        if i < period//2 or i >= len(data) - period//2:
            trend.append(data[i])
        else:
            window = data[i-period//2 : i+period//2+1]
            trend.append(sum(window) / len(window))
    
    # Detrend
    detrended = [data[i] - trend[i] for i in range(len(data))]
    
    # Seasonal factors
    seasonal_factors = defaultdict(list)
    for i, val in enumerate(detrended):
        seasonal_factors[i % period].append(val)
    
    seasonal_pattern = [
        sum(seasonal_factors[i]) / len(seasonal_factors[i])
        for i in range(period)
    ]
    
    # Forecast
    last_trend = trend[-1]
    next_position = len(data) % period
    seasonal_factor = seasonal_pattern[next_position]
    
    forecast = last_trend + seasonal_factor
    
    return {
        'forecast': max(0, forecast),
        'trend': last_trend,
        'seasonal_factor': seasonal_factor,
        'seasonal_pattern': seasonal_pattern
    }
```

### Ưu điểm:
- ✅ Xử lý dữ liệu theo mùa/chu kỳ
- ✅ Tách trend vs seasonal
- ✅ Dự báo chính xác với pattern lặp lại

### Nhược điểm:
- ❌ Cần ít nhất 2 chu kỳ dữ liệu
- ❌ Giả định pattern ổn định

---

## 🎯 **7. ENSEMBLE FORECASTING (KẾT HỢP)**

### Công thức:
```
Forecast_ensemble = Σ(wi × Forecasti) / Σwi

Trong đó:
- wi: Trọng số của phương pháp i
- Forecasti: Dự báo từ phương pháp i
```

### Trọng số mặc định:
```
SMA:                  15% (0.15)
WMA:                  20% (0.20)
Exponential Smoothing: 25% (0.25)
Linear Regression:    40% (0.40) - highest
```

### Ví dụ thực tế:
```python
# Các dự báo:
SMA = 130
WMA = 135
ES = 132
LR = 140 (R²=0.85)

# Weighted average (LR có R² cao nên weight điều chỉnh)
LR_weight = 0.40 × 0.85 = 0.34

Ensemble = (0.15×130 + 0.20×135 + 0.25×132 + 0.34×140) / (0.15+0.20+0.25+0.34)
         = (19.5 + 27 + 33 + 47.6) / 0.94
         = 127.1 / 0.94
         = 135.2

# Confidence dựa trên độ phân tán
```

### Code implementation:
```python
def ensemble_forecast(data: List[float]) -> Dict:
    forecasts = []
    weights = []
    
    # 1. SMA
    sma = simple_moving_average(data)
    forecasts.append(sma)
    weights.append(0.15)
    
    # 2. WMA
    wma = weighted_moving_average(data)
    forecasts.append(wma)
    weights.append(0.20)
    
    # 3. ES
    es = exponential_smoothing(data)
    forecasts.append(es)
    weights.append(0.25)
    
    # 4. LR (adjusted by R²)
    lr_result = linear_regression_forecast(data)
    forecasts.append(lr_result['forecast'])
    lr_weight = 0.40 * lr_result['r_squared']
    weights.append(lr_weight)
    
    # Weighted average
    ensemble = sum(f * w for f, w in zip(forecasts, weights)) / sum(weights)
    
    # Confidence from dispersion
    forecast_std = statistics.stdev(forecasts)
    forecast_mean = statistics.mean(forecasts)
    cv = forecast_std / forecast_mean
    confidence = max(0, min(1, 1 - cv))
    
    return {
        'forecast': ensemble,
        'confidence': confidence,
        'methods_used': len(forecasts)
    }
```

### Ưu điểm:
- ✅ Kết hợp ưu điểm nhiều phương pháp
- ✅ Giảm risk của 1 phương pháp sai
- ✅ Tự động điều chỉnh weight theo R²

---

## 📦 **8. INVENTORY REORDER POINT (ROP)**

### Công thức:
```
ROP = (Average Daily Sales × Lead Time) + Safety Stock

Safety Stock = Z-score × σ × √Lead Time

Trong đó:
- Average Daily Sales: Bán trung bình mỗi ngày
- Lead Time: Thời gian nhập hàng (ngày)
- σ (sigma): Standard deviation của sales
- Z-score: Phụ thuộc service level
  + 90% service: Z = 1.28
  + 95% service: Z = 1.65
  + 99% service: Z = 2.33
```

### Ví dụ thực tế:
```python
# Sales history 30 ngày: [10, 12, 9, 11, 10, 13, 12, ...]
# Lead time = 7 ngày
# Service level = 95%

Average daily sales = 11 (giả sử)
σ = 1.5 (standard deviation)
Z-score = 1.65 (cho 95%)

Safety Stock = 1.65 × 1.5 × √7 = 1.65 × 1.5 × 2.65 = 6.56

ROP = (11 × 7) + 6.56 = 77 + 6.56 = 83.56 ≈ 84 units

# Khi tồn kho xuống còn 84, cần đặt hàng ngay!
```

### Code implementation:
```python
def inventory_reorder_point(
    sales_history: List[int],
    lead_time_days: int = 7,
    service_level: float = 0.95
) -> Dict:
    avg_daily_sales = sum(sales_history) / len(sales_history)
    std_dev = statistics.stdev(sales_history)
    
    # Z-score lookup
    z_scores = {0.90: 1.28, 0.95: 1.65, 0.99: 2.33}
    z_score = z_scores.get(service_level, 1.65)
    
    # Safety stock
    safety_stock = z_score * std_dev * (lead_time_days ** 0.5)
    
    # Reorder point
    reorder_point = (avg_daily_sales * lead_time_days) + safety_stock
    
    return {
        'reorder_point': int(reorder_point),
        'safety_stock': int(safety_stock),
        'average_daily_sales': avg_daily_sales
    }
```

---

## 📊 **SO SÁNH CÁC PHƯƠNG PHÁP**

| Phương pháp | Complexity | Data cần | Chính xác | Trend | Seasonal | Use Case |
|-------------|-----------|----------|-----------|-------|----------|----------|
| **SMA** | Thấp | 3-7 | Trung bình | ❌ | ❌ | Dữ liệu ổn định |
| **WMA** | Thấp | 3-7 | Khá | ❌ | ❌ | Ưu tiên gần đây |
| **ES** | Trung bình | 5+ | Tốt | ❌ | ❌ | Có noise |
| **Double ES** | Trung bình | 10+ | Rất tốt | ✅ | ❌ | Có xu hướng |
| **Linear Reg** | Trung bình | 7+ | Cao | ✅ | ❌ | Trend rõ ràng |
| **Seasonal** | Cao | 2 period | Rất tốt | ✅ | ✅ | Dữ liệu theo mùa |
| **Ensemble** | Cao | 7+ | Cao nhất | ✅ | Partial | Tổng hợp |

---

## ✅ **KẾT LUẬN**

### Hệ thống hiện tại:

✅ **SỬ DỤNG KỸ THUẬT THỐNG KÊ CHUẨN**  
✅ **KHÔNG ĐOÁN MÒ, CÓ CÔNG THỨC TOÁN HỌC**  
✅ **ĐO LƯỜNG ĐỘ TIN CẬY (R², Confidence)**  
✅ **KẾT HỢP NHIỀU PHƯƠNG PHÁP (ENSEMBLE)**  

### Khi nào dùng phương pháp nào:

```
If data < 7 points:
    → "Insufficient data for forecasting"

Elif data has clear seasonal pattern (weekly/monthly):
    → Seasonal Decomposition

Elif data has strong trend (R² > 0.7):
    → Linear Regression

Elif data is noisy but trending:
    → Double Exponential Smoothing

Else:
    → Ensemble Forecast (kết hợp tất cả)
```

### Độ tin cậy:

- **R² > 0.9**: Rất tin cậy, có thể dùng cho quyết định quan trọng
- **R² = 0.7-0.9**: Tin cậy, phù hợp cho planning
- **R² = 0.5-0.7**: Tham khảo, cần kết hợp với judgment
- **R² < 0.5**: Không đủ tin cậy, cần thêm dữ liệu

---

**Người lập:** GitHub Copilot AI Assistant  
**Ngày:** 10/01/2026  
**Status:** ✅ PRODUCTION READY
