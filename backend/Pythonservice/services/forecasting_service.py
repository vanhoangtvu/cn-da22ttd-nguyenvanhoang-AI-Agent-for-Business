"""
Forecasting Service - Dự báo dựa trên kỹ thuật thống kê
Sử dụng các phương pháp: Moving Average, Exponential Smoothing, Linear Regression
"""

from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
import statistics
from collections import defaultdict


class ForecastingService:
    """
    Service dự báo dựa trên các kỹ thuật thống kê chuẩn
    Không dựa vào AI mà dựa vào toán học và thống kê
    """
    
    def __init__(self):
        """Initialize Forecasting Service"""
        self.min_data_points = 3  # Số điểm dữ liệu tối thiểu
    
    def simple_moving_average(
        self, 
        data: List[float], 
        window: int = 3
    ) -> Optional[float]:
        """
        Simple Moving Average (SMA)
        Công thức: SMA = (P1 + P2 + ... + Pn) / n
        
        Args:
            data: Danh sách giá trị
            window: Số điểm dữ liệu để tính trung bình
            
        Returns:
            Giá trị SMA hoặc None nếu không đủ dữ liệu
        """
        if not data or len(data) < window:
            return None
        
        # Lấy window điểm gần nhất
        recent_data = data[-window:]
        return sum(recent_data) / len(recent_data)
    
    def weighted_moving_average(
        self,
        data: List[float],
        window: int = 3
    ) -> Optional[float]:
        """
        Weighted Moving Average (WMA)
        Gán trọng số cao hơn cho dữ liệu gần đây
        Công thức: WMA = (n*Pn + (n-1)*Pn-1 + ... + 1*P1) / (n + (n-1) + ... + 1)
        
        Args:
            data: Danh sách giá trị
            window: Số điểm dữ liệu
            
        Returns:
            Giá trị WMA hoặc None
        """
        if not data or len(data) < window:
            return None
        
        recent_data = data[-window:]
        weights = list(range(1, window + 1))  # [1, 2, 3, ..., n]
        
        weighted_sum = sum(val * weight for val, weight in zip(recent_data, weights))
        weight_sum = sum(weights)
        
        return weighted_sum / weight_sum
    
    def exponential_smoothing(
        self,
        data: List[float],
        alpha: float = 0.3
    ) -> Optional[float]:
        """
        Exponential Smoothing (ES)
        Công thức: St = α*Xt + (1-α)*St-1
        
        Args:
            data: Danh sách giá trị
            alpha: Smoothing factor (0 < alpha < 1)
                  - alpha cao: nhạy với thay đổi gần đây
                  - alpha thấp: ổn định hơn
            
        Returns:
            Giá trị dự báo
        """
        if not data or len(data) < 2:
            return data[0] if data else None
        
        # Khởi tạo S0 = X0
        smoothed = data[0]
        
        # Tính exponential smoothing cho từng điểm
        for value in data[1:]:
            smoothed = alpha * value + (1 - alpha) * smoothed
        
        return smoothed
    
    def double_exponential_smoothing(
        self,
        data: List[float],
        alpha: float = 0.3,
        beta: float = 0.3
    ) -> Optional[float]:
        """
        Double Exponential Smoothing (Holt's Method)
        Xử lý cả trend (xu hướng tăng/giảm)
        
        Công thức:
        - Level: Lt = α*Xt + (1-α)*(Lt-1 + Tt-1)
        - Trend: Tt = β*(Lt - Lt-1) + (1-β)*Tt-1
        - Forecast: Ft+1 = Lt + Tt
        
        Args:
            data: Danh sách giá trị
            alpha: Level smoothing factor
            beta: Trend smoothing factor
            
        Returns:
            Giá trị dự báo có tính trend
        """
        if not data or len(data) < 3:
            return data[-1] if data else None
        
        # Khởi tạo
        level = data[0]
        trend = data[1] - data[0] if len(data) > 1 else 0
        
        # Tính double exponential smoothing
        for value in data[1:]:
            prev_level = level
            level = alpha * value + (1 - alpha) * (level + trend)
            trend = beta * (level - prev_level) + (1 - beta) * trend
        
        # Dự báo: Level + Trend
        return level + trend
    
    def linear_regression_forecast(
        self,
        data: List[float],
        periods_ahead: int = 1
    ) -> Dict[str, Any]:
        """
        Linear Regression (Hồi quy tuyến tính)
        Công thức: y = mx + b
        - m = slope (độ dốc)
        - b = intercept (điểm cắt)
        
        Args:
            data: Danh sách giá trị
            periods_ahead: Số kỳ cần dự báo
            
        Returns:
            Dict với forecast, slope, confidence
        """
        if not data or len(data) < self.min_data_points:
            return {
                'forecast': data[-1] if data else 0,
                'slope': 0,
                'trend': 'insufficient_data',
                'confidence': 0.0
            }
        
        n = len(data)
        x_values = list(range(n))  # [0, 1, 2, ..., n-1]
        y_values = data
        
        # Tính các giá trị trung bình
        x_mean = sum(x_values) / n
        y_mean = sum(y_values) / n
        
        # Tính slope (m) và intercept (b)
        numerator = sum((x - x_mean) * (y - y_mean) for x, y in zip(x_values, y_values))
        denominator = sum((x - x_mean) ** 2 for x in x_values)
        
        if denominator == 0:
            slope = 0
        else:
            slope = numerator / denominator
        
        intercept = y_mean - slope * x_mean
        
        # Dự báo cho periods_ahead kỳ tiếp theo
        forecast_x = n + periods_ahead - 1
        forecast = slope * forecast_x + intercept
        
        # Tính R² (coefficient of determination) để đánh giá độ tin cậy
        y_pred = [slope * x + intercept for x in x_values]
        ss_res = sum((y - y_pred[i]) ** 2 for i, y in enumerate(y_values))
        ss_tot = sum((y - y_mean) ** 2 for y in y_values)
        
        r_squared = 1 - (ss_res / ss_tot) if ss_tot != 0 else 0
        
        # Xác định trend
        if abs(slope) < 0.01:
            trend = 'stable'
        elif slope > 0:
            trend = 'increasing'
        else:
            trend = 'decreasing'
        
        return {
            'forecast': max(0, forecast),  # Không cho giá trị âm
            'slope': slope,
            'intercept': intercept,
            'trend': trend,
            'confidence': max(0, min(1, r_squared)),  # R² trong khoảng [0, 1]
            'method': 'linear_regression'
        }
    
    def seasonal_decomposition(
        self,
        data: List[float],
        period: int = 7
    ) -> Dict[str, Any]:
        """
        Seasonal Decomposition - Phân tích theo mùa
        Tách dữ liệu thành: Trend + Seasonal + Residual
        
        Args:
            data: Danh sách giá trị
            period: Chu kỳ mùa (7 = tuần, 30 = tháng)
            
        Returns:
            Dict với trend, seasonal_factor, forecast
        """
        if not data or len(data) < period * 2:
            return {
                'trend': data[-1] if data else 0,
                'seasonal_factor': 1.0,
                'forecast': data[-1] if data else 0,
                'method': 'seasonal_decomposition',
                'confidence': 0.0
            }
        
        # Tính trend bằng moving average
        trend = []
        for i in range(len(data)):
            if i < period // 2 or i >= len(data) - period // 2:
                trend.append(data[i])
            else:
                window_data = data[i - period // 2: i + period // 2 + 1]
                trend.append(sum(window_data) / len(window_data))
        
        # Tính seasonal component
        detrended = [data[i] - trend[i] if trend[i] != 0 else 0 
                     for i in range(len(data))]
        
        # Tính seasonal factors cho từng vị trí trong period
        seasonal_factors = defaultdict(list)
        for i, val in enumerate(detrended):
            seasonal_factors[i % period].append(val)
        
        # Average seasonal factor
        seasonal_pattern = []
        for i in range(period):
            if seasonal_factors[i]:
                seasonal_pattern.append(
                    sum(seasonal_factors[i]) / len(seasonal_factors[i])
                )
            else:
                seasonal_pattern.append(0)
        
        # Dự báo: trend cuối + seasonal factor
        last_trend = trend[-1]
        next_position = len(data) % period
        seasonal_factor = seasonal_pattern[next_position] if seasonal_pattern else 0
        
        forecast = last_trend + seasonal_factor
        
        return {
            'trend': last_trend,
            'seasonal_factor': seasonal_factor,
            'forecast': max(0, forecast),
            'seasonal_pattern': seasonal_pattern,
            'method': 'seasonal_decomposition',
            'confidence': 0.7  # Moderate confidence
        }
    
    def ensemble_forecast(
        self,
        data: List[float],
        periods_ahead: int = 1
    ) -> Dict[str, Any]:
        """
        Ensemble Forecasting - Kết hợp nhiều phương pháp
        Lấy weighted average của các phương pháp khác nhau
        
        Args:
            data: Danh sách giá trị
            periods_ahead: Số kỳ dự báo
            
        Returns:
            Dict với forecast tổng hợp và chi tiết từng phương pháp
        """
        if not data or len(data) < self.min_data_points:
            return {
                'forecast': data[-1] if data else 0,
                'methods_used': [],
                'confidence': 0.0,
                'method': 'ensemble'
            }
        
        forecasts = []
        weights = []
        methods_detail = []
        
        # 1. Simple Moving Average (weight: 0.15)
        sma = self.simple_moving_average(data, window=min(3, len(data)))
        if sma is not None:
            forecasts.append(sma)
            weights.append(0.15)
            methods_detail.append({'method': 'sma', 'value': sma, 'weight': 0.15})
        
        # 2. Weighted Moving Average (weight: 0.20)
        wma = self.weighted_moving_average(data, window=min(3, len(data)))
        if wma is not None:
            forecasts.append(wma)
            weights.append(0.20)
            methods_detail.append({'method': 'wma', 'value': wma, 'weight': 0.20})
        
        # 3. Exponential Smoothing (weight: 0.25)
        es = self.exponential_smoothing(data, alpha=0.3)
        if es is not None:
            forecasts.append(es)
            weights.append(0.25)
            methods_detail.append({'method': 'exponential_smoothing', 'value': es, 'weight': 0.25})
        
        # 4. Linear Regression (weight: 0.40) - highest weight
        lr_result = self.linear_regression_forecast(data, periods_ahead)
        if lr_result['forecast'] is not None:
            forecasts.append(lr_result['forecast'])
            # Adjust weight based on confidence
            lr_weight = 0.40 * lr_result['confidence']
            weights.append(lr_weight)
            methods_detail.append({
                'method': 'linear_regression', 
                'value': lr_result['forecast'],
                'weight': lr_weight,
                'confidence': lr_result['confidence'],
                'trend': lr_result['trend']
            })
        
        # Tính weighted average
        if forecasts and sum(weights) > 0:
            ensemble_forecast = sum(f * w for f, w in zip(forecasts, weights)) / sum(weights)
        else:
            ensemble_forecast = data[-1] if data else 0
        
        # Tính confidence dựa trên độ phân tán của các forecast
        if len(forecasts) > 1:
            forecast_std = statistics.stdev(forecasts)
            forecast_mean = statistics.mean(forecasts)
            # Confidence giảm khi forecast phân tán
            cv = forecast_std / forecast_mean if forecast_mean != 0 else 1
            confidence = max(0, min(1, 1 - cv))
        else:
            confidence = 0.5
        
        return {
            'forecast': max(0, ensemble_forecast),
            'methods_used': methods_detail,
            'confidence': confidence,
            'method': 'ensemble',
            'num_methods': len(forecasts)
        }
    
    def revenue_forecast(
        self,
        revenue_by_day: Dict[str, float],
        periods_ahead: int = 7
    ) -> Dict[str, Any]:
        """
        Dự báo doanh thu cho periods_ahead ngày tiếp theo
        
        Args:
            revenue_by_day: Dict {date: revenue}
            periods_ahead: Số ngày cần dự báo
            
        Returns:
            Dict với forecast details
        """
        if not revenue_by_day:
            return {
                'forecast': 0,
                'forecast_by_day': {},
                'method': 'insufficient_data',
                'confidence': 0.0
            }
        
        # Sắp xếp theo ngày
        sorted_dates = sorted(revenue_by_day.keys())
        revenue_values = [revenue_by_day[date] for date in sorted_dates]
        
        # Sử dụng ensemble forecast
        ensemble_result = self.ensemble_forecast(revenue_values, periods_ahead=1)
        
        # Dự báo cho từng ngày
        forecast_by_day = {}
        last_date = datetime.fromisoformat(sorted_dates[-1])
        
        for i in range(1, periods_ahead + 1):
            forecast_date = last_date + timedelta(days=i)
            date_str = forecast_date.strftime('%Y-%m-%d')
            
            # Sử dụng seasonal nếu có đủ dữ liệu
            if len(revenue_values) >= 14:  # Ít nhất 2 tuần
                seasonal_result = self.seasonal_decomposition(
                    revenue_values, 
                    period=7  # Weekly pattern
                )
                daily_forecast = seasonal_result['forecast']
            else:
                daily_forecast = ensemble_result['forecast']
            
            forecast_by_day[date_str] = max(0, daily_forecast)
        
        total_forecast = sum(forecast_by_day.values())
        
        return {
            'total_forecast': total_forecast,
            'forecast_by_day': forecast_by_day,
            'daily_average': total_forecast / periods_ahead if periods_ahead > 0 else 0,
            'method': ensemble_result['method'],
            'confidence': ensemble_result['confidence'],
            'trend': self._determine_trend(revenue_values),
            'historical_average': sum(revenue_values) / len(revenue_values) if revenue_values else 0
        }
    
    def inventory_reorder_point(
        self,
        sales_history: List[int],
        lead_time_days: int = 7,
        service_level: float = 0.95
    ) -> Dict[str, Any]:
        """
        Tính Reorder Point (Điểm đặt hàng lại) cho quản lý tồn kho
        Công thức: ROP = (Average Daily Sales × Lead Time) + Safety Stock
        Safety Stock = Z-score × Std Dev × sqrt(Lead Time)
        
        Args:
            sales_history: Lịch sử bán hàng theo ngày
            lead_time_days: Thời gian nhập hàng (ngày)
            service_level: Mức độ phục vụ mong muốn (0.95 = 95%)
            
        Returns:
            Dict với reorder_point, safety_stock, etc.
        """
        if not sales_history or len(sales_history) < 7:
            return {
                'reorder_point': 0,
                'safety_stock': 0,
                'average_daily_sales': 0,
                'method': 'insufficient_data'
            }
        
        # Tính average daily sales
        avg_daily_sales = sum(sales_history) / len(sales_history)
        
        # Tính standard deviation
        if len(sales_history) > 1:
            std_dev = statistics.stdev(sales_history)
        else:
            std_dev = 0
        
        # Z-score cho service level
        # 0.90 = 1.28, 0.95 = 1.65, 0.99 = 2.33
        z_scores = {0.90: 1.28, 0.95: 1.65, 0.99: 2.33}
        z_score = z_scores.get(service_level, 1.65)
        
        # Tính safety stock
        safety_stock = z_score * std_dev * (lead_time_days ** 0.5)
        
        # Tính reorder point
        reorder_point = (avg_daily_sales * lead_time_days) + safety_stock
        
        return {
            'reorder_point': int(reorder_point),
            'safety_stock': int(safety_stock),
            'average_daily_sales': avg_daily_sales,
            'lead_time_days': lead_time_days,
            'service_level': service_level,
            'method': 'rop_calculation'
        }
    
    def _determine_trend(self, data: List[float]) -> str:
        """Xác định xu hướng từ dữ liệu"""
        if not data or len(data) < 2:
            return 'unknown'
        
        # So sánh 1/3 đầu vs 1/3 cuối
        third = len(data) // 3
        if third == 0:
            return 'insufficient_data'
        
        first_third_avg = sum(data[:third]) / third
        last_third_avg = sum(data[-third:]) / third
        
        change_pct = ((last_third_avg - first_third_avg) / first_third_avg * 100) if first_third_avg != 0 else 0
        
        if abs(change_pct) < 5:
            return 'stable'
        elif change_pct > 0:
            return 'increasing'
        else:
            return 'decreasing'


# Singleton instance
_forecasting_service = None

def get_forecasting_service() -> ForecastingService:
    """Get singleton forecasting service instance"""
    global _forecasting_service
    if _forecasting_service is None:
        _forecasting_service = ForecastingService()
    return _forecasting_service
