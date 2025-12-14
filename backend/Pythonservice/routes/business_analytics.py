"""
Business Analytics API Route
Endpoint để phân tích dữ liệu kinh doanh và đề xuất chiến lược bằng AI
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import google.generativeai as genai
import os
from datetime import datetime, timedelta
import json
from typing import Optional, Dict, Any, List
import chromadb
from groq import Groq
import requests

router = APIRouter()

# Helper functions for safe type conversion
def safe_decimal(value):
    """Safely convert value to float"""
    if value is None:
        return 0.0
    try:
        return float(value)
    except (ValueError, TypeError):
        return 0.0

def safe_int(value):
    """Safely convert value to int"""
    if value is None:
        return 0
    try:
        return int(value)
    except (ValueError, TypeError):
        return 0

def safe_str(value):
    """Safely convert value to string"""
    if value is None:
        return ""
    return str(value)

# Configure Gemini API
GEMINI_API_KEY = os.getenv('GOOGLE_API_KEY')
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# Configure Groq API
GROQ_API_KEY = os.getenv('GROQ_API_KEY')
groq_client = None
if GROQ_API_KEY:
    groq_client = Groq(api_key=GROQ_API_KEY)

# Cache for models
_cached_models = None
_models_cache_time = None

def get_available_models_from_apis():
    """Fetch available models from Gemini and Groq APIs"""
    global _cached_models, _models_cache_time
    import time
    
    # Cache for 1 hour
    if _cached_models and _models_cache_time and (time.time() - _models_cache_time) < 3600:
        return _cached_models
    
    models = []
    
    # Get Gemini models - chỉ giữ Pro và Flash 2.5
    if GEMINI_API_KEY:
        try:
            gemini_models = genai.list_models()
            allowed_gemini = ['gemini-2.5-pro', 'gemini-2.5-flash']
            
            for m in gemini_models:
                if 'generateContent' in m.supported_generation_methods:
                    model_id = m.name.replace('models/', '')
                    
                    # Chỉ giữ Pro và Flash 2.5
                    if model_id in allowed_gemini:
                        models.append({
                            'id': model_id,
                            'name': m.display_name,
                            'provider': 'Google',
                            'context_window': getattr(m, 'input_token_limit', 32768)
                        })
                        print(f"[Analytics] Added Gemini model: {model_id}")
            
            print(f"[Analytics] Loaded {len([m for m in models if m['provider'] == 'Google'])} Gemini models")
        except Exception as e:
            print(f"[Analytics] Error loading Gemini models: {e}")
    
    # Get Groq models
    if groq_client:
        try:
            models_response = groq_client.models.list()
            
            # List of keywords to exclude (non-chat models)
            excluded_keywords = ['whisper', 'distil-whisper', 'guard']
            
            groq_models = []
            for model in models_response.data:
                if hasattr(model, 'id') and model.id:
                    model_id_lower = model.id.lower()
                    
                    # Skip non-chat models
                    if any(keyword in model_id_lower for keyword in excluded_keywords):
                        print(f"[Analytics] Skipping excluded model: {model.id}")
                        continue
                    
                    # Only include active models
                    if not getattr(model, 'active', True):
                        print(f"[Analytics] Skipping inactive model: {model.id}")
                        continue
                    
                    context_window = getattr(model, 'context_window', 8192)
                    
                    groq_models.append({
                        'id': model.id,
                        'name': model.id,
                        'provider': 'Groq',
                        'context_window': context_window
                    })
                    print(f"[Analytics] Added Groq model: {model.id} (context: {context_window})")
            
            # Sort by name
            groq_models.sort(key=lambda x: x['name'])
            models.extend(groq_models)
            
            print(f"[Analytics] Loaded {len(groq_models)} Groq models")
        except Exception as e:
            print(f"[Analytics] Error loading Groq models: {e}")
            import traceback
            traceback.print_exc()
    else:
        print("[Analytics] Groq client not initialized - check GROQ_API_KEY")
    
    # Sort by provider and name
    models.sort(key=lambda x: (x['provider'], x['name']))
    
    _cached_models = models
    _models_cache_time = time.time()
    
    return models

@router.get('/models')
async def get_available_models():
    """Lấy danh sách models AI có sẵn cho phân tích từ API"""
    models = get_available_models_from_apis()
    return {'success': True, 'models': models}

# ChromaDB client
chroma_client = None

def set_chroma_client(client):
    """Set ChromaDB client"""
    global chroma_client
    chroma_client = client

class AIInsightsRequest(BaseModel):
    type: Optional[str] = 'general'  # general, pricing, inventory, sales
    model: Optional[str] = 'llama-3.3-70b-versatile'  # AI model to use - default to Groq Llama 3.3 70B

def get_business_data():
    """Lấy dữ liệu kinh doanh từ ChromaDB"""
    try:
        if not chroma_client:
            return {'products': [], 'orders': [], 'categories': [], 'discounts': [], 'business_performance': [], 'users': [], 'documents': []}
        
        # Lấy collections từ ChromaDB
        # business_data: products, categories, business_performance, discounts
        # orders_analytics: orders
        try:
            business_collection = chroma_client.get_collection(name="business_data")
            orders_collection = chroma_client.get_collection(name="orders_analytics")
        except Exception as e:
            print(f"Error getting collections: {e}")
            return {'products': [], 'orders': [], 'categories': [], 'discounts': [], 'business_performance': [], 'users': [], 'documents': []}
        
        # Lấy tất cả dữ liệu từ collections
        business_data = business_collection.get(include=['metadatas'])
        orders_data = orders_collection.get(include=['metadatas'])
        
        # Parse metadata từ business_collection theo data_type
        all_business_metadatas = business_data.get('metadatas', [])
        
        products = [m for m in all_business_metadatas if m.get('data_type') == 'product']
        categories = [m for m in all_business_metadatas if m.get('data_type') == 'category']
        discounts = [m for m in all_business_metadatas if m.get('data_type') == 'discount']
        business_performance = [m for m in all_business_metadatas if m.get('data_type') == 'business_performance']
        users = [m for m in all_business_metadatas if m.get('data_type') == 'user']
        documents = [m for m in all_business_metadatas if m.get('data_type') == 'document']
        
        # Parse orders từ orders_analytics collection  
        orders = orders_data.get('metadatas', [])
        
        # Convert string fields back to proper types
        for product in products:
            if 'price' in product and isinstance(product['price'], str):
                try:
                    product['price'] = float(product['price'])
                except:
                    product['price'] = 0
            if 'quantity' in product and isinstance(product['quantity'], str):
                try:
                    product['quantity'] = int(product['quantity'])
                except:
                    product['quantity'] = 0
            if 'id' in product and isinstance(product['id'], str):
                try:
                    product['id'] = int(product['id'])
                except:
                    pass
        
        for order in orders:
            if 'totalAmount' in order and isinstance(order['totalAmount'], str):
                try:
                    order['totalAmount'] = float(order['totalAmount'])
                except:
                    order['totalAmount'] = 0
            if 'id' in order and isinstance(order['id'], str):
                try:
                    order['id'] = int(order['id'])
                except:
                    pass
        
        print(f"[Analytics] Loaded from ChromaDB: {len(products)} products, {len(orders)} orders, {len(categories)} categories, {len(discounts)} discounts, {len(business_performance)} business records, {len(users)} users, {len(documents)} documents")
        
        return {
            'products': products,
            'orders': orders,
            'categories': categories,
            'discounts': discounts,
            'business_performance': business_performance,
            'users': users,
            'documents': documents
        }
    except Exception as e:
        print(f"Error fetching business data from ChromaDB: {e}")
        import traceback
        traceback.print_exc()
        return {
            'products': [],
            'orders': [],
            'categories': [],
            'discounts': [],
            'business_performance': [],
            'users': [],
            'documents': []
        }

def calculate_statistics(data):
    """Tính toán các chỉ số thống kê"""
    products = data.get('products', [])
    orders = data.get('orders', [])
    categories = data.get('categories', [])
    
    # Thống kê tổng quan
    total_products = len(products)
    total_orders = len(orders)
    total_categories = len(categories)
    
    # Tính tổng doanh thu
    total_revenue = sum(order.get('totalAmount', 0) for order in orders)
    
    # Tính doanh thu theo trạng thái
    revenue_by_status = {}
    orders_by_status = {}
    for order in orders:
        status = order.get('status', 'UNKNOWN')
        amount = order.get('totalAmount', 0)
        
        revenue_by_status[status] = revenue_by_status.get(status, 0) + amount
        orders_by_status[status] = orders_by_status.get(status, 0) + 1
    
    # Convert to array format for frontend
    revenue_by_status_array = [
        {'status': status, 'revenue': revenue}
        for status, revenue in revenue_by_status.items()
    ]
    orders_by_status_array = [
        {'status': status, 'count': count}
        for status, count in orders_by_status.items()
    ]
    
    # Tính số lượng đã bán và doanh thu cho từng sản phẩm
    # Note: ChromaDB orders không chứa chi tiết items, nên dùng totalSold từ product metadata
    enriched_products = []
    for product in products:
        total_sold = product.get('totalSold', 0)
        if isinstance(total_sold, str):
            try:
                total_sold = int(total_sold)
            except:
                total_sold = 0
        
        price = product.get('price', 0)
        revenue = total_sold * price
        
        enriched_product = {
            **product,
            'stock': product.get('quantity', 0),  # Đổi quantity -> stock
            'total_sold': total_sold,
            'revenue': revenue
        }
        enriched_products.append(enriched_product)
    
    # Top sản phẩm bán chạy (theo total_sold và revenue)
    products_sorted = sorted(enriched_products, key=lambda x: (x.get('total_sold', 0), x.get('revenue', 0)), reverse=True)
    top_products = products_sorted[:10]
    
    # Sản phẩm sắp hết hàng (stock < 20)
    low_stock_products = sorted(
        [p for p in enriched_products if p.get('stock', 0) < 20],
        key=lambda x: x.get('stock', 0)
    )[:10]
    
    # Phân tích theo danh mục
    category_stats = {}
    for product in products:
        cat_id = product.get('categoryId')
        cat_name = product.get('categoryName', 'Unknown')
        
        if cat_name not in category_stats:
            category_stats[cat_name] = {
                'product_count': 0,
                'total_stock': 0,
                'avg_price': 0,
                'total_price': 0
            }
        
        category_stats[cat_name]['product_count'] += 1
        category_stats[cat_name]['total_stock'] += product.get('quantity', 0)
        category_stats[cat_name]['total_price'] += product.get('price', 0)
    
    # Tính giá trung bình theo danh mục
    for cat_name, stats in category_stats.items():
        if stats['product_count'] > 0:
            stats['avg_price'] = stats['total_price'] / stats['product_count']
    
    # Phân tích theo thời gian (7 ngày gần nhất)
    now = datetime.now()
    last_7_days = now - timedelta(days=7)
    
    revenue_by_day = {}
    orders_by_day = {}
    
    for order in orders:
        created_at = order.get('createdAt', '')
        if created_at:
            try:
                order_date = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                date_key = order_date.strftime('%Y-%m-%d')
                
                revenue_by_day[date_key] = revenue_by_day.get(date_key, 0) + order.get('totalAmount', 0)
                orders_by_day[date_key] = orders_by_day.get(date_key, 0) + 1
            except:
                pass
    
    return {
        'overview': {
            'total_products': total_products,
            'total_orders': total_orders,
            'total_categories': total_categories,
            'total_revenue': total_revenue,
            'avg_order_value': total_revenue / total_orders if total_orders > 0 else 0
        },
        'revenue_by_status': revenue_by_status_array,
        'orders_by_status': orders_by_status_array,
        'top_products': top_products,
        'low_stock_products': low_stock_products,
        'category_stats': category_stats,
        'revenue_by_day': revenue_by_day,
        'orders_by_day': orders_by_day
    }

@router.get('/data')
async def get_analytics_data():
    """Lấy dữ liệu phân tích thống kê"""
    try:
        # Lấy dữ liệu từ ChromaDB
        business_data = get_business_data()
        
        # Tính toán thống kê
        statistics = calculate_statistics(business_data)
        
        return {
            'success': True,
            'data': statistics
        }
        
    except Exception as e:
        print(f"Error in analytics data: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post('/ai-insights')
async def get_ai_insights(request: AIInsightsRequest):
    """Sử dụng AI để phân tích và đề xuất chiến lược kinh doanh"""
    try:
        # Lấy dữ liệu kinh doanh từ ChromaDB
        business_data = get_business_data()
        statistics = calculate_statistics(business_data)
        
        # Tạo prompt cho AI dựa trên loại phân tích
        prompt = create_analysis_prompt(request.type, statistics, business_data)
        
        # Use the selected model from request
        model_name = request.model if request.model else 'llama-3.3-70b-versatile'
        print(f"[Analytics] Using AI model: {model_name}")
        
        # Determine provider based on model name - check if it's a Groq model
        groq_model_prefixes = [
            'llama', 'mixtral', 'gemma', 'openai/gpt-oss', 'moonshotai', 
            'meta-llama', 'qwen', 'groq', 'allam', 'playai'
        ]
        is_groq = any(prefix in model_name.lower() for prefix in groq_model_prefixes)
        
        print(f"[Analytics] Model: {model_name}, Provider: {'Groq' if is_groq else 'Gemini'}")
        
        if is_groq and groq_client:
            # Use Groq API
            print(f"[Analytics] Using Groq API")
            try:
                chat_completion = groq_client.chat.completions.create(
                    messages=[
                        {
                            "role": "user",
                            "content": prompt,
                        }
                    ],
                    model=model_name,
                    temperature=0.7,
                    max_tokens=2048,
                )
                ai_insights = chat_completion.choices[0].message.content
            except Exception as groq_error:
                print(f"[Analytics] Groq API error: {groq_error}")
                # Fallback to Gemini if Groq fails
                print(f"[Analytics] Fallback to Gemini API")
                try:
                    model = genai.GenerativeModel('gemini-2.5-flash')
                    response = model.generate_content(prompt)
                    ai_insights = response.text
                except Exception as gemini_error:
                    print(f"[Analytics] Gemini fallback also failed: {gemini_error}")
                    raise HTTPException(status_code=500, detail=f"Both Groq and Gemini APIs failed. Groq: {groq_error}, Gemini: {gemini_error}")
        else:
            # Use Gemini API
            print(f"[Analytics] Using Gemini API")
            try:
                model = genai.GenerativeModel(model_name)
                response = model.generate_content(prompt)
                ai_insights = response.text
            except Exception as gemini_error:
                print(f"[Analytics] Gemini API error: {gemini_error}")
                raise HTTPException(status_code=500, detail=f"Gemini API error: {gemini_error}")
        
        return {
            'success': True,
            'insights': ai_insights,
            'statistics': statistics,
            'analysis_type': request.type
        }
        
    except Exception as e:
        print(f"Error in AI insights: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

def create_analysis_prompt(analysis_type, statistics, business_data):
    """Tạo prompt cho AI dựa trên loại phân tích"""
    
    overview = statistics.get('overview', {})
    revenue_by_status = statistics.get('revenue_by_status', [])
    orders_by_status = statistics.get('orders_by_status', [])
    category_stats = statistics.get('category_stats', {})
    low_stock_products = statistics.get('low_stock_products', [])
    top_products = statistics.get('top_products', [])
    
    # Lấy thêm dữ liệu chi tiết
    products = business_data.get('products', [])
    orders = business_data.get('orders', [])
    categories = business_data.get('categories', [])
    discounts = business_data.get('discounts', [])
    business_performance = business_data.get('business_performance', [])
    
    # Phân tích sâu hơn
    total_inventory_value = sum([p.get('price', 0) * p.get('quantity', 0) for p in products])
    avg_product_price = sum([p.get('price', 0) for p in products]) / len(products) if products else 0
    products_with_details = [p for p in products if p.get('has_details')]
    
    base_context = f"""
🎯 BẠN LÀ CHUYÊN GIA PHÂN TÍCH KINH DOANH & CHIẾN LƯỢC CAO CẤP

📊 DỮ LIỆU KINH DOANH TỔNG QUAN:
═══════════════════════════════════════
📦 Sản phẩm:
   • Tổng số: {overview.get('total_products', 0)} sản phẩm
   • Có thông tin chi tiết: {len(products_with_details)} sản phẩm ({len(products_with_details)/len(products)*100:.1f}% nếu có sản phẩm)
   • Giá trung bình: {avg_product_price:,.0f} VNĐ
   • Tổng giá trị hàng tồn: {total_inventory_value:,.0f} VNĐ
   • Sản phẩm sắp hết hàng: {len(low_stock_products)}

🛒 Đơn hàng:
   • Tổng số: {overview.get('total_orders', 0)} đơn
   • Tổng doanh thu: {overview.get('total_revenue', 0):,.0f} VNĐ
   • Giá trị TB/đơn: {overview.get('avg_order_value', 0):,.0f} VNĐ

📈 PHÂN TÍCH DOANH THU THEO TRẠNG THÁI:
{json.dumps(revenue_by_status, indent=2, ensure_ascii=False)}

📋 PHÂN BỐ ĐƠN HÀNG THEO TRẠNG THÁI:
{json.dumps(orders_by_status, indent=2, ensure_ascii=False)}

🏷️ THỐNG KÊ THEO DANH MỤC SẢN PHẨM:
{json.dumps(category_stats, indent=2, ensure_ascii=False)}

⭐ TOP 5 SẢN PHẨM NỔI BẬT:
{json.dumps([{'tên': p.get('name'), 'giá': f"{p.get('price', 0):,.0f} VNĐ", 'tồn_kho': p.get('quantity', 0), 'đã_bán': p.get('total_sold', 0)} for p in top_products[:5]], indent=2, ensure_ascii=False)}

⚠️ SẢN PHẨM CẦN NHẬP HÀNG (Tồn kho < 10):
{json.dumps([{'tên': p.get('name'), 'tồn_kho': p.get('quantity', 0), 'giá': f"{p.get('price', 0):,.0f} VNĐ"} for p in low_stock_products[:10]], indent=2, ensure_ascii=False)}

💰 THÔNG TIN KHUYẾN MÃI:
   • Tổng số chương trình: {len(discounts)}
   • Đang hoạt động: {len([d for d in discounts if d.get('status') == 'ACTIVE'])}

🏢 HIỆU SUẤT NGƯỜI BÁN:
   • Tổng số người bán: {len(business_performance)}
   • Tổng doanh thu tất cả: {sum([bp.get('revenue', 0) for bp in business_performance]):,.0f} VNĐ
"""

    if analysis_type == 'general':
        prompt = base_context + """

🎯 NHIỆM VỤ: PHÂN TÍCH TỔNG QUAN TOÀN DIỆN & ĐỀ XUẤT CHIẾN LƯỢC KINH DOANH

📝 YÊU CẦU PHÂN TÍCH:

## 1️⃣ TÌNH HÌNH KINH DOANH HIỆN TẠI
- Đánh giá tổng quan về doanh thu, đơn hàng, sản phẩm
- Phân tích xu hướng tăng/giảm (nếu có dữ liệu theo thời gian)
- So sánh với các chỉ số trung bình ngành (nếu áp dụng)

## 2️⃣ ĐIỂM MẠNH & LỢI THẾ CẠNH TRANH
- Những điểm nổi bật trong hoạt động kinh doanh
- Sản phẩm/danh mục có hiệu suất tốt
- Cơ hội để khai thác và phát triển

## 3️⃣ THÁCH THỨC & VẤN ĐỀ CẦN GIẢI QUYẾT
- Điểm yếu trong vận hành hiện tại
- Rủi ro tiềm ẩn cần lưu ý
- Những rào cản cần vượt qua

## 4️⃣ ĐỀ XUẤT CHIẾN LƯỢC CỤ THỂ (7-10 HÀNH ĐỘNG)
### 📈 Tăng trưởng doanh thu:
- [Đề xuất 2-3 hành động cụ thể với số liệu]

### 💰 Tối ưu lợi nhuận:
- [Đề xuất 2-3 hành động cụ thể với số liệu]

### 📦 Quản lý tồn kho:
- [Đề xuất 2-3 hành động cụ thể với số liệu]

### 🎯 Marketing & Khách hàng:
- [Đề xuất 2-3 hành động cụ thể với số liệu]

## 5️⃣ DỰ BÁO & KẾ HOẠCH PHÁT TRIỂN
- Xu hướng thị trường sắp tới
- Cơ hội mở rộng kinh doanh
- Roadmap ngắn hạn (1-3 tháng) và dài hạn (6-12 tháng)

## 6️⃣ CHỈ SỐ KPI ĐỀ XUẤT THEO DÕI
- [Liệt kê 5-7 KPIs quan trọng cần monitor hàng tuần/tháng]

⚡ FORMAT YÊU CẦU:
- Sử dụng emoji phù hợp để làm nổi bật các phần
- Dùng bảng markdown, bullet points, headings rõ ràng
- Số liệu cụ thể với đơn vị VNĐ, % rõ ràng
- Viết tiếng Việt chuyên nghiệp, dễ hiểu
- Độ dài: 800-1200 từ
- Chia sections rõ ràng với headings H2, H3
"""

    elif analysis_type == 'pricing':
        prompt = base_context + """

💰 NHIỆM VỤ: PHÂN TÍCH CHIẾN LƯỢC GIÁ & TỐI ƯU LỢI NHUẬN

📝 YÊU CẦU PHÂN TÍCH:

## 1️⃣ PHÂN TÍCH GIÁ HIỆN TẠI
- Đánh giá mức giá của từng danh mục sản phẩm
- So sánh giá trung bình với thị trường (nếu có thông tin)
- Phân tích khoảng giá: thấp, trung bình, cao
- Price elasticity: sản phẩm nào nhạy cảm với giá?

## 2️⃣ CƠ HỘI TĂNG GIÁ 📈
Tạo bảng markdown:
| Sản phẩm/Danh mục | Giá hiện tại | Đề xuất | Lý do | Tác động dự kiến |
|-------------------|--------------|---------|-------|------------------|

### Điều kiện để tăng giá thành công:
- [Liệt kê 3-5 điều kiện cụ thể]

## 3️⃣ CƠ HỘI GIẢM GIÁ/KHUYẾN MÃI 📉
Tạo bảng markdown:
| Sản phẩm/Danh mục | Giá hiện tại | Đề xuất | Mục tiêu | ROI dự kiến |
|-------------------|--------------|---------|----------|-------------|

## 4️⃣ CHIẾN LƯỢC COMBO & BUNDLE 🎁
### Combo đề xuất:
1. **[Tên combo]**: [Sản phẩm A] + [Sản phẩm B]
   - Giá lẻ: [X] VNĐ
   - Giá combo: [Y] VNĐ (Tiết kiệm [Z]%)
   - Lý do combo này hấp dẫn: [...]
   - Mục tiêu: tăng AOV lên [X]%

[Đề xuất 3-5 combo]

## 5️⃣ LỊCH KHUYẾN MÃI ĐỀ XUẤT 📅
Tạo bảng markdown:
| Thời điểm | Loại KM | Sản phẩm | Mức giảm | Mục tiêu | Budget |
|-----------|---------|----------|----------|----------|--------|

## 6️⃣ CHIẾN THUẬT GIÁ TÂM LÝ 🧠
- **Psychological Pricing**: Giá lẻ (999,000 thay vì 1,000,000)
- **Anchor Pricing**: Hiển thị giá gốc để tạo giá trị
- **Premium Pricing**: Sản phẩm cao cấp định vị giá cao
- **Loss Leader**: Sản phẩm thu hút với giá thấp

## 7️⃣ DỰ ÁN TĂNG DOANH THU VÀ LỢI NHUẬN
- Tăng doanh thu dự kiến: **+[X]%**
- Tăng lợi nhuận dự kiến: **+[Y]%**
- Tăng AOV dự kiến: **+[Z]%**
- Timeline thực hiện: [3-6 tháng]
- Ngân sách cần: [X] VNĐ
- ROI expected: [Y]X

⚡ Viết chi tiết với số liệu cụ thể, dễ áp dụng ngay!
"""

    elif analysis_type == 'inventory':
        prompt = base_context + """

📦 NHIỆM VỤ: PHÂN TÍCH & TỐI ƯU QUẢN LÝ TỒN KHO

📝 YÊU CẦU PHÂN TÍCH:

## 1️⃣ ĐÁNH GIÁ TÌNH TRẠNG TỒN KHO HIỆN TẠI
### 📊 Phân loại tồn kho:
Tạo bảng markdown:
| Loại | Số lượng SP | Giá trị | Tỷ lệ % |
|------|-------------|---------|---------|
| 🟢 Tốt (>30 SP) | | VNĐ | % |
| 🟡 Trung bình (10-30) | | VNĐ | % |
| 🔴 Thấp (<10) | | VNĐ | % |
| ⚫ Hết hàng (0) | | 0 VNĐ | % |

### 💰 Giá trị tồn kho:
- **Tổng giá trị**: [...] VNĐ
- **Vốn đóng băng** (hàng tồn lâu): [...] VNĐ
- **Khả năng thanh khoản**: [Cao/Trung bình/Thấp]

## 2️⃣ ƯU TIÊN NHẬP HÀNG NGAY ⚡
Tạo bảng markdown:
| STT | Sản phẩm | Tồn hiện tại | Bán TB/ngày | Hết sau X ngày | SL đề xuất nhập |
|-----|----------|--------------|-------------|----------------|-----------------|

### 📋 Kế hoạch nhập hàng chi tiết:
**TUẦN NÀY (URGENT):**
- [Danh sách 5-10 sản phẩm cần nhập gấp]
- Tổng vốn cần: [...] VNĐ

**THÁNG NÀY:**
- [Kế hoạch dự trù tổng thể]
- Ngân sách: [...] VNĐ

## 3️⃣ XỬ LÝ HÀNG TỒN KHO LÂU 🗑️
Tạo bảng markdown:
| Sản phẩm | Tồn | Giá trị | Thời gian tồn | Giải pháp đề xuất |
|----------|-----|---------|---------------|-------------------|

### Chiến lược xử lý:
1. **Flash Sale Weekend**: Giảm 40-50% cho top [X] sản phẩm
2. **Bundle Deal**: Kết hợp với sản phẩm hot
3. **Gift with Purchase**: Tặng kèm khi mua sản phẩm khác

## 4️⃣ TỐI ƯU HÓA QUY TRÌNH KHO 🎯
### A. Phân loại ABC:
- **Nhóm A** (20% SP, 80% giá trị): [Liệt kê sản phẩm chiến lược]
- **Nhóm B** (30% SP, 15% giá trị): [Sản phẩm quan trọng]
- **Nhóm C** (50% SP, 5% giá trị): [Sản phẩm phụ]

### B. Cải thiện vận hành:
1. **Hệ thống quản lý kho:**
   - Đề xuất phần mềm/công cụ phù hợp
   - Barcode/QR scanning
   
2. **Quy trình kiểm kê:**
   - Tần suất: [Hàng tuần/tháng]
   - Phương pháp: [Cycle counting/Full inventory]
   
3. **Sắp xếp kho:**
   - Layout tối ưu theo ABC
   - FIFO/LIFO strategy

### C. Chính sách an toàn kho:
- **Safety Stock**: [X] đơn vị
- **Reorder Point**: Khi tồn <= [Y]
- **Lead Time**: [Z] ngày
- **EOQ** (Economic Order Quantity): [Tính toán]

## 5️⃣ KẾ HOẠCH DỰ TRÙ 3 THÁNG TỚI 📅
### Tháng 1 (Hiện tại):
- Ngân sách: [...] VNĐ
- Danh mục ưu tiên: [...]
- Sản phẩm cần đẩy mạnh: [...]

### Tháng 2:
- Mùa vụ/sự kiện: [...]
- Sản phẩm seasonal: [...]

### Tháng 3:
- Chuẩn bị cho: [...]
- Sản phẩm mới launch: [...]

## 6️⃣ CHỈ SỐ HIỆU SUẤT KHO
Tính toán và đánh giá:
- **Inventory Turnover Ratio**: [...] lần/năm [Tốt/TB/Cần cải thiện]
- **Days Sales of Inventory (DSI)**: [...] ngày
- **Stockout Rate**: [...]% [Mục tiêu: <5%]
- **Carrying Cost**: [...] VNĐ/tháng
- **Fill Rate**: [...]% [Mục tiêu: >95%]

⚡ Phân tích chi tiết với số liệu cụ thể, kế hoạch thực thi rõ ràng!
"""

    elif analysis_type == 'sales':
        prompt = base_context + """

🚀 NHIỆM VỤ: PHÂN TÍCH DOANH SỐ & CHIẾN LƯỢC TĂNG TRƯỞNG

📝 YÊU CẦU PHÂN TÍCH:

## 1️⃣ PHÂN TÍCH HIỆU SUẤT BÁN HÀNG
### 📈 Doanh số theo danh mục:
Tạo bảng markdown:
| Danh mục | Doanh thu | Số đơn | AOV | % Tổng DT | Xu hướng |
|----------|-----------|--------|-----|-----------|----------|

### ⭐ Top 5 Performers:
1. **[Sản phẩm 1]**: [...] VNĐ
   - Lý do thành công: [...]
   - Insight: [...]
   
[Tiếp tục cho 4 sản phẩm khác]

### ⚠️ Bottom 5 - Cần cải thiện:
- [Danh sách sản phẩm bán kém với phân tích lý do]

## 2️⃣ PHÂN TÍCH KHÁCH HÀNG 👥
### Hành vi mua hàng:
- **Average Order Value**: [...] VNĐ
- **Purchase Frequency**: [...] lần/khách/tháng
- **Customer Retention Rate**: [...]%
- **Repeat Customer Rate**: [...]%

### Phân khúc khách hàng:
Tạo bảng markdown:
| Phân khúc | % KH | Doanh thu | AOV | Đặc điểm & Hành vi |
|-----------|------|-----------|-----|---------------------|

## 3️⃣ CHIẾN LƯỢC MARKETING TÍCH HỢP 📢
### A. Content Marketing:
1. **Blog/SEO Content**:
   - [3-5 chủ đề hot có potential traffic cao]
   - Target keywords: [...]
   
2. **Video Marketing**:
   - Product reviews
   - How-to guides
   - Behind the scenes
   
3. **Social Media Strategy**:
   - Platform: Facebook, Instagram, TikTok
   - Content calendar: [Mix content types]

### B. Paid Advertising Campaign:
Tạo bảng markdown:
| Kênh | Budget/tháng | Target Audience | Objective | ROAS dự kiến |
|------|--------------|-----------------|-----------|--------------|

### C. Email Marketing Flows:
1. **Welcome Series** (3-5 emails):
   - Day 0: Welcome + 10% discount
   - Day 3: Product education
   - Day 7: Testimonials + urgency
   
2. **Cart Abandonment**:
   - 1h: Reminder
   - 24h: 5% discount
   - 48h: Free shipping
   
3. **Post-Purchase**:
   - Thank you + tracking
   - Review request
   - Cross-sell recommendations

### D. Chương trình Khuyến mãi:
1. **Flash Sales**: [Timing + Products + Discount]
2. **Loyalty Program**: [Points system design]
3. **Referral Program**: [Incentive structure]

## 4️⃣ CẢI THIỆN TRẢI NGHIỆM KHÁCH HÀNG 🌟
### A. Pre-Purchase:
- [ ] Tối ưu product pages (images, description, specs)
- [ ] Live chat/chatbot 24/7
- [ ] Customer reviews prominent
- [ ] Product comparison tool
- [ ] AR/Virtual try-on (if applicable)

### B. Purchase Process:
- [ ] One-page checkout (giảm friction)
- [ ] Multiple payment options
- [ ] Guest checkout
- [ ] Real-time shipping calculator
- [ ] Mobile-optimized

### C. Post-Purchase:
- [ ] Order confirmation + tracking link
- [ ] Proactive customer service
- [ ] Easy returns/exchanges
- [ ] Review incentives
- [ ] Loyalty rewards

## 5️⃣ ROADMAP TĂNG TRƯỞNG 30% 🎯
### Phase 1: Tháng 1-2 (Foundation) - Mục tiêu +10%
**Quick Wins:**
- [3-5 hành động với impact cao, effort thấp]
- Budget: [...] VNĐ
- Expected ROI: [...]X

**KPIs theo dõi:**
- Traffic: +[X]%
- Conversion rate: +[Y]%
- AOV: +[Z]%

### Phase 2: Tháng 3-4 (Acceleration) - Mục tiêu +10%
**Growth Initiatives:**
- [3-5 chiến lược tăng trưởng mạnh]
- Budget: [...] VNĐ
- Expected ROI: [...]X

### Phase 3: Tháng 5-6 (Scale) - Mục tiêu +10%
**Scale & Optimize:**
- [3-5 hành động scale và tối ưu]
- Budget: [...] VNĐ
- Expected ROI: [...]X

## 6️⃣ DASHBOARD KPIs CẦN THEO DÕI 📊
### Sales Metrics:
- **Revenue Growth**: [...]%/tháng (Target: 30%/6 tháng)
- **Conversion Rate**: [...]% (Target: +20%)
- **Average Order Value**: [...] VNĐ (Target: +15%)
- **Customer Acquisition Cost**: [...] VNĐ (Target: giảm 10%)
- **Customer Lifetime Value**: [...] VNĐ (Target: tăng 25%)

### Marketing Metrics:
- **Website Traffic**: [...]/tháng (Target: +50%)
- **Engagement Rate**: [...]% (Target: >5%)
- **ROAS**: [...]X (Target: >3X)
- **Email Open Rate**: [...]% (Target: >20%)
- **Social Media Followers**: [...] (Target: +100%)

### Operational Metrics:
- **Order Fulfillment Time**: [...] giờ (Target: <24h)
- **Customer Satisfaction**: [...]% (Target: >90%)
- **Return Rate**: [...]% (Target: <5%)

⚡ Phân tích thực tế, chiến lược chi tiết, roadmap rõ ràng, dễ triển khai ngay!
"""

    else:
        prompt = base_context + "\n\nPhân tích tổng quan và đưa ra đề xuất."

    return prompt


@router.get("/chroma-data")
async def get_all_chroma_data():
    """
    Endpoint để hiển thị tất cả dữ liệu được lưu trong Chroma DB instance chroma_analytics
    
    Returns:
        Dict chứa tất cả collections và dữ liệu của chúng
    """
    try:
        global chroma_client
        if chroma_client is None:
            return {"error": "ChromaDB client chưa được khởi tạo"}
        
        # Lấy tất cả collections
        collections = chroma_client.list_collections()
        
        result = {
            "instance_path": "./chroma_analytics",
            "total_collections": len(collections),
            "collections": {},
            "timestamp": datetime.now().isoformat()
        }
        
        # Duyệt qua từng collection
        for collection in collections:
            collection_name = collection.name
            
            try:
                # Lấy tất cả documents - không cần include vì mặc định đã có ids, documents, metadatas
                all_data = collection.get()
                
                result["collections"][collection_name] = {
                    "metadata": collection.metadata,
                    "total_documents": len(all_data.get('ids', [])),
                    "documents": []
                }
                
                # Tạo danh sách documents với đầy đủ thông tin
                ids = all_data.get('ids', [])
                documents = all_data.get('documents', [])
                metadatas = all_data.get('metadatas', [])
                
                for i, doc_id in enumerate(ids):
                    doc_info = {
                        "id": doc_id,
                        "content": documents[i] if i < len(documents) else None,
                        "metadata": metadatas[i] if metadatas and i < len(metadatas) else None
                    }
                    result["collections"][collection_name]["documents"].append(doc_info)
                    
            except Exception as e:
                result["collections"][collection_name] = {
                    "error": f"Không thể đọc collection: {str(e)}",
                    "metadata": collection.metadata
                }
        
        print(f"[Chroma Data] Retrieved data from {len(collections)} collections")
        return result
        
    except Exception as e:
        return {"error": f"Lỗi khi truy cập Chroma DB: {str(e)}"}


@router.get("/chroma-stats")
async def get_chroma_stats():
    """
    Endpoint để lấy thống kê nhanh về Chroma DB
    
    Returns:
        Dict chứa thống kê tổng quan
    """
    try:
        global chroma_client
        if chroma_client is None:
            return {"error": "ChromaDB client chưa được khởi tạo"}
        
        collections = chroma_client.list_collections()
        
        stats = {
            "instance_path": "./chroma_analytics",
            "total_collections": len(collections),
            "collections_stats": {},
            "total_documents": 0,
            "timestamp": datetime.now().isoformat()
        }
        
        for collection in collections:
            try:
                count = collection.count()
                stats["collections_stats"][collection.name] = {
                    "documents_count": count,
                    "metadata": collection.metadata
                }
                stats["total_documents"] += count
            except Exception as e:
                stats["collections_stats"][collection.name] = {
                    "error": str(e),
                    "metadata": collection.metadata
                }
        
        return stats
        
    except Exception as e:
        return {"error": f"Lỗi khi lấy thống kê Chroma DB: {str(e)}"}


class SyncDataRequest(BaseModel):
    """Request model for data synchronization"""
    spring_service_url: Optional[str] = None
    auth_token: str
    clear_existing: Optional[bool] = True


@router.post("/sync-from-spring")
async def sync_data_from_spring(request: SyncDataRequest):
    """
    Đồng bộ dữ liệu từ Spring Service vào ChromaDB
    
    Args:
        request: Chứa URL Spring Service, token xác thực và option xóa dữ liệu cũ
        
    Returns:
        Dict chứa kết quả đồng bộ
    """
    try:
        global chroma_client
        if chroma_client is None:
            raise HTTPException(status_code=500, detail="ChromaDB client chưa được khởi tạo")
        
        # Lấy Spring Service URL từ biến môi trường hoặc request
        spring_base_url = request.spring_service_url or os.getenv('SPRING_SERVICE_URL', 'http://localhost:8089/api/v1')
        
        # Lấy dữ liệu từ Spring Service
        headers = {
            "Authorization": f"Bearer {request.auth_token}",
            "Content-Type": "application/json"
        }
        
        spring_url = f"{spring_base_url}/admin/analytics/system-data"
        print(f"[Sync] Fetching data from: {spring_url}")
        
        response = requests.get(spring_url, headers=headers, timeout=30)
        
        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Failed to fetch data from Spring Service: {response.text}"
            )
        
        data = response.json()
        print(f"[Sync] Received data with {len(data.get('products', []))} products, {len(data.get('orders', []))} orders")
        
        sync_results = {
            "timestamp": datetime.now().isoformat(),
            "clear_existing": request.clear_existing,
            "products": {"total": 0, "with_details": 0, "success": 0, "errors": 0},
            "orders": {"total": 0, "success": 0, "errors": 0},
            "categories": {"total": 0, "success": 0, "errors": 0},
            "business_performance": {"total": 0, "success": 0, "errors": 0},
            "discounts": {"total": 0, "success": 0, "errors": 0},
            "users": {"total": 0, "success": 0, "errors": 0},
            "documents": {"total": 0, "success": 0, "errors": 0},
            "errors": []
        }
        
        # Khởi tạo hoặc lấy các collections
        # Collection 1: business_data - chứa products, categories, business performance, discounts
        # Collection 2: orders_analytics - chứa orders
        # Collection 3: trends - chứa insights và trends (tương lai)
        
        if request.clear_existing:
            print("[Sync] Clearing existing data...")
            try:
                # Xóa các collections cũ
                for collection_name in ["business_data", "orders_analytics", "trends"]:
                    try:
                        chroma_client.delete_collection(name=collection_name)
                        print(f"[Sync] Deleted old {collection_name} collection")
                    except:
                        pass
                
                # Tạo lại các collections
                business_collection = chroma_client.create_collection(
                    name="business_data",
                    metadata={"description": "Products, categories, business performance, and discounts"}
                )
                orders_collection = chroma_client.create_collection(
                    name="orders_analytics",
                    metadata={"description": "Order data for analytics"}
                )
                trends_collection = chroma_client.create_collection(
                    name="trends",
                    metadata={"description": "Business trends and insights"}
                )
                print("[Sync] Created new collections: business_data, orders_analytics, trends")
                
            except Exception as e:
                print(f"[Sync] Error clearing data: {e}")
                sync_results["errors"].append(f"Clear data error: {str(e)}")
                raise HTTPException(status_code=500, detail=f"Failed to clear collections: {str(e)}")
        else:
            # Lấy hoặc tạo collections nếu chưa có
            print("[Sync] Getting or creating collections...")
            business_collection = chroma_client.get_or_create_collection(
                name="business_data",
                metadata={"description": "Products, categories, business performance, and discounts"}
            )
            orders_collection = chroma_client.get_or_create_collection(
                name="orders_analytics",
                metadata={"description": "Order data for analytics"}
            )
            trends_collection = chroma_client.get_or_create_collection(
                name="trends",
                metadata={"description": "Business trends and insights"}
            )
            print("[Sync] Collections ready: business_data, orders_analytics, trends")
        
        # Đồng bộ Products với details đầy đủ
        if data.get('products'):
            sync_results["products"]["total"] = len(data['products'])
            print(f"[Sync] Syncing {len(data['products'])} products...")
            
            for product in data['products']:
                try:
                    product_id = str(product.get('id', ''))
                    has_details = bool(product.get('details'))
                    
                    if has_details:
                        sync_results["products"]["with_details"] += 1
                    
                    # Tạo product content với đầy đủ thông tin
                    product_content = f"""Product ID: {product.get('id')}
Name: {product.get('name', '')}
Description: {product.get('description', '')}
Price: {product.get('price', 0)} VND
Quantity: {product.get('quantity', 0)}
Status: {product.get('status', 'UNKNOWN')}
Category: {product.get('categoryName', '')}
Seller: {product.get('sellerUsername', '')}
"""
                    
                    # Parse details nếu có
                    details_text = ""
                    if product.get('details'):
                        try:
                            import json
                            details = json.loads(product['details']) if isinstance(product['details'], str) else product['details']
                            
                            if details:
                                details_text = "\nProduct Details:\n"
                                
                                # Basic details
                                if details.get('brand'):
                                    details_text += f"Brand: {details['brand']}\n"
                                if details.get('model'):
                                    details_text += f"Model: {details['model']}\n"
                                if details.get('color'):
                                    details_text += f"Color: {details['color']}\n"
                                if details.get('warranty'):
                                    details_text += f"Warranty: {details['warranty']}\n"
                                if details.get('storage'):
                                    details_text += f"Storage: {details['storage']}\n"
                                if details.get('type'):
                                    details_text += f"Type: {details['type']}\n"
                                
                                # Features
                                if details.get('features') and isinstance(details['features'], list):
                                    details_text += f"Features: {', '.join(details['features'])}\n"
                                
                                # Specifications
                                if details.get('specifications') and isinstance(details['specifications'], dict):
                                    details_text += "Specifications:\n"
                                    for key, value in details['specifications'].items():
                                        details_text += f"  {key}: {value}\n"
                                
                                # Connectivity
                                if details.get('connectivity') and isinstance(details['connectivity'], list):
                                    details_text += f"Connectivity: {', '.join(details['connectivity'])}\n"
                                
                                # Accessories
                                if details.get('accessories') and isinstance(details['accessories'], list):
                                    details_text += f"Accessories: {', '.join(details['accessories'])}\n"
                                
                                # Dimensions and Weight
                                if details.get('dimensions'):
                                    details_text += f"Dimensions: {details['dimensions']}\n"
                                if details.get('weight'):
                                    details_text += f"Weight: {details['weight']}\n"
                                
                                product_content += details_text
                                
                        except json.JSONDecodeError:
                            print(f"[Sync] Invalid JSON in product details for {product_id}")
                        except Exception as e:
                            print(f"[Sync] Error parsing product details for {product_id}: {e}")
                    
                    # Safe conversion cho metadata
                    price = product.get('price')
                    price_float = float(price) if price is not None else 0.0
                    
                    quantity = product.get('quantity')
                    quantity_int = int(quantity) if quantity is not None else 0
                    
                    total_sold = product.get('totalSold')
                    total_sold_int = int(total_sold) if total_sold is not None else 0
                    
                    total_revenue = product.get('totalRevenue')
                    total_revenue_float = float(total_revenue) if total_revenue is not None else 0.0
                    
                    # Prepare metadata với ĐẦY ĐỦ tất cả các trường từ DTO
                    product_metadata = {
                        "data_type": "product",
                        "product_id": product_id,
                        "name": product.get('name', ''),
                        "description": product.get('description', ''),
                        "category": product.get('categoryName', ''),
                        "category_id": str(product.get('categoryId', '')) if product.get('categoryId') else '',
                        "status": product.get('status', 'UNKNOWN'),
                        "price": price_float,
                        "quantity": quantity_int,
                        "seller": product.get('sellerUsername', ''),
                        "seller_id": str(product.get('sellerId', '')),
                        "total_sold": total_sold_int,
                        "total_revenue": total_revenue_float,
                        "image_urls": json.dumps(product.get('imageUrls', [])) if product.get('imageUrls') else '',
                        "created_at": product.get('createdAt', ''),
                        "updated_at": product.get('updatedAt', ''),
                        "has_details": has_details,
                        "stored_at": datetime.now().isoformat(),
                        "purpose": "analytics"
                    }
                    
                    # Add parsed details to metadata if available
                    if product.get('details'):
                        try:
                            import json
                            details = json.loads(product['details']) if isinstance(product['details'], str) else product['details']
                            if details:
                                # Store key details in metadata for easy filtering
                                if details.get('brand'):
                                    product_metadata['brand'] = details['brand']
                                if details.get('model'):
                                    product_metadata['model'] = details['model']
                                if details.get('color'):
                                    product_metadata['color'] = details['color']
                                if details.get('warranty'):
                                    product_metadata['warranty'] = details['warranty']
                                # Store full details as JSON string
                                product_metadata['details_json'] = json.dumps(details, ensure_ascii=False)
                        except:
                            pass
                    
                    # Lưu vào collection
                    business_collection.upsert(
                        documents=[product_content],
                        metadatas=[product_metadata],
                        ids=[f"product_{product_id}"]
                    )
                    
                    sync_results["products"]["success"] += 1
                    print(f"[Sync] Stored product {product_id} with details: {has_details}")
                    
                except Exception as e:
                    sync_results["products"]["errors"] += 1
                    error_msg = f"Product {product.get('id', 'unknown')}: {str(e)}"
                    sync_results["errors"].append(error_msg)
                    print(f"[Sync] Error: {error_msg}")
                    import traceback
                    traceback.print_exc()
        
        # Đồng bộ Orders
        if data.get('orders'):
            sync_results["orders"]["total"] = len(data['orders'])
            print(f"[Sync] Syncing {len(data['orders'])} orders...")
            
            for order in data['orders']:
                try:
                    order_id = str(order.get('id', ''))
                    
                    # Tạo nội dung order
                    order_content = f"""
Order ID: {order.get('id')}
Customer: {order.get('customerName', '')}
Status: {order.get('status', '')}
Total Amount: {order.get('totalAmount', 0)} VND
Items Count: {order.get('totalItems', 0)}
Created: {order.get('createdAt', '')}
"""
                    
                    # Safe conversion với xử lý null/None
                    total_amount = order.get('totalAmount')
                    total_amount_float = float(total_amount) if total_amount is not None else 0.0
                    
                    total_items = order.get('totalItems')
                    total_items_int = int(total_items) if total_items is not None else 0
                    
                    # Lưu order items nếu có
                    order_items = order.get('items', [])
                    items_detail = []
                    for item in order_items:
                        items_detail.append({
                            "product_id": str(item.get('productId', '')),
                            "product_name": item.get('productName', ''),
                            "quantity": int(item.get('quantity', 0)) if item.get('quantity') is not None else 0,
                            "price": float(item.get('price', 0)) if item.get('price') is not None else 0.0,
                            "subtotal": float(item.get('subtotal', 0)) if item.get('subtotal') is not None else 0.0
                        })
                    
                    order_metadata = {
                        "data_type": "order",
                        "order_id": order_id,
                        "customer_name": order.get('customerName', ''),
                        "customer_id": str(order.get('customerId', '')),
                        "status": order.get('status', ''),
                        "total_amount": total_amount_float,
                        "total_items": total_items_int,
                        "created_at": order.get('createdAt', ''),
                        "updated_at": order.get('updatedAt', ''),
                        "payment_method": order.get('paymentMethod', ''),
                        "shipping_address": order.get('shippingAddress', ''),
                        "items_json": json.dumps(items_detail, ensure_ascii=False),  # Store items as JSON string
                        "stored_at": datetime.now().isoformat()
                    }
                    
                    # Lưu vào orders_analytics collection
                    orders_collection.upsert(
                        documents=[order_content],
                        metadatas=[order_metadata],
                        ids=[f"order_{order_id}"]
                    )
                    
                    sync_results["orders"]["success"] += 1
                    
                except Exception as e:
                    sync_results["orders"]["errors"] += 1
                    error_msg = f"Order {order.get('id', 'unknown')}: {str(e)}"
                    sync_results["errors"].append(error_msg)
                    print(f"[Sync] Error: {error_msg}")
        
        # Đồng bộ Categories
        if data.get('categories'):
            sync_results["categories"]["total"] = len(data['categories'])
            print(f"[Sync] Syncing {len(data['categories'])} categories...")
            
            for category in data['categories']:
                try:
                    category_id = str(category.get('id', ''))
                    
                    category_content = f"""
Category ID: {category.get('id')}
Name: {category.get('name', '')}
Description: {category.get('description', '')}
Status: {category.get('status', '')}
Product Count: {category.get('productCount', 0)}
"""
                    
                    # Safe conversion
                    product_count = category.get('productCount')
                    product_count_int = int(product_count) if product_count is not None else 0
                    
                    category_metadata = {
                        "data_type": "category",
                        "category_id": category_id,
                        "name": category.get('name', ''),
                        "description": category.get('description', ''),
                        "status": category.get('status', ''),
                        "product_count": product_count_int,
                        "created_at": category.get('createdAt', ''),
                        "updated_at": category.get('updatedAt', ''),
                        "image_url": category.get('imageUrl', ''),
                        "stored_at": datetime.now().isoformat()
                    }
                    
                    # Use business_collection directly
                    business_collection.upsert(
                        documents=[category_content],
                        metadatas=[category_metadata],
                        ids=[f"category_{category_id}"]
                    )
                    
                    sync_results["categories"]["success"] += 1
                    
                except Exception as e:
                    sync_results["categories"]["errors"] += 1
                    error_msg = f"Category {category.get('id', 'unknown')}: {str(e)}"
                    sync_results["errors"].append(error_msg)
        
        # Đồng bộ Business Performance
        if data.get('businessPerformance'):
            sync_results["business_performance"]["total"] = len(data['businessPerformance'])
            print(f"[Sync] Syncing {len(data['businessPerformance'])} business performance records...")
            
            for business in data['businessPerformance']:
                try:
                    business_id = str(business.get('businessId', ''))
                    
                    business_content = f"""
Business ID: {business.get('businessId')}
Username: {business.get('businessUsername', '')}
Total Products: {business.get('totalProducts', 0)}
Active Products: {business.get('activeProducts', 0)}
Total Orders: {business.get('totalOrders', 0)}
Revenue: {business.get('revenue', 0)} VND
Average Order Value: {business.get('averageOrderValue', 0)} VND
"""
                    
                    # Safe conversion cho business data
                    total_products = business.get('totalProducts')
                    total_products_int = int(total_products) if total_products is not None else 0
                    
                    active_products = business.get('activeProducts')
                    active_products_int = int(active_products) if active_products is not None else 0
                    
                    total_orders = business.get('totalOrders')
                    total_orders_int = int(total_orders) if total_orders is not None else 0
                    
                    revenue = business.get('revenue')
                    revenue_float = float(revenue) if revenue is not None else 0.0
                    
                    inventory_value = business.get('inventoryValue')
                    inventory_value_float = float(inventory_value) if inventory_value is not None else 0.0
                    
                    avg_order = business.get('averageOrderValue')
                    avg_order_float = float(avg_order) if avg_order is not None else 0.0
                    
                    business_metadata = {
                        "data_type": "business_performance",
                        "business_id": business_id,
                        "username": business.get('businessUsername', ''),
                        "total_products": total_products_int,
                        "active_products": active_products_int,
                        "inactive_products": safe_int(business.get('inactiveProducts')),
                        "total_orders": total_orders_int,
                        "completed_orders": safe_int(business.get('completedOrders')),
                        "revenue": revenue_float,
                        "inventory_value": inventory_value_float,
                        "average_order_value": avg_order_float,
                        "total_sold": safe_int(business.get('totalSold')),
                        "stored_at": datetime.now().isoformat()
                    }
                    
                    # Use business_collection directly
                    business_collection.upsert(
                        documents=[business_content],
                        metadatas=[business_metadata],
                        ids=[f"business_{business_id}"]
                    )
                    
                    sync_results["business_performance"]["success"] += 1
                    
                except Exception as e:
                    sync_results["business_performance"]["errors"] += 1
                    error_msg = f"Business {business.get('businessId', 'unknown')}: {str(e)}"
                    sync_results["errors"].append(error_msg)
        
        # Đồng bộ Discounts
        if data.get('discounts'):
            sync_results["discounts"]["total"] = len(data['discounts'])
            print(f"[Sync] Syncing {len(data['discounts'])} discounts...")
            
            for discount in data['discounts']:
                try:
                    discount_id = str(discount.get('id', ''))
                    
                    discount_content = f"""
Discount ID: {discount.get('id')}
Code: {discount.get('code', '')}
Type: {discount.get('discountType', '')}
Value: {discount.get('discountValue', 0)}
Status: {discount.get('status', '')}
Usage Count: {discount.get('usageCount', 0)}
"""
                    
                    # Safe conversion cho discount data
                    discount_value = discount.get('discountValue')
                    discount_value_float = float(discount_value) if discount_value is not None else 0.0
                    
                    min_order = discount.get('minOrderValue')
                    min_order_float = float(min_order) if min_order is not None else 0.0
                    
                    max_discount = discount.get('maxDiscountAmount')
                    max_discount_float = float(max_discount) if max_discount is not None else 0.0
                    
                    usage_limit = discount.get('usageLimit')
                    usage_limit_int = int(usage_limit) if usage_limit is not None else 0
                    
                    used_count = discount.get('usedCount')
                    used_count_int = int(used_count) if used_count is not None else 0
                    
                    # Parse additional fields
                    total_savings = discount.get('totalSavings')
                    total_savings_float = float(total_savings) if total_savings is not None else 0.0
                    
                    usage_percentage = discount.get('usagePercentage')
                    usage_percentage_float = float(usage_percentage) if usage_percentage is not None else 0.0
                    
                    discount_metadata = {
                        "data_type": "discount",
                        "discount_id": discount_id,
                        "code": discount.get('code', ''),
                        "name": discount.get('name', ''),
                        "description": discount.get('description', ''),
                        "type": discount.get('discountType', ''),
                        "value": discount_value_float,
                        "min_order_value": min_order_float,
                        "max_discount_amount": max_discount_float,
                        "usage_limit": usage_limit_int,
                        "used_count": used_count_int,
                        "status": discount.get('status', ''),
                        "start_date": discount.get('startDate', ''),
                        "end_date": discount.get('endDate', ''),
                        "created_at": discount.get('createdAt', ''),
                        "created_by_username": discount.get('createdByUsername', ''),
                        "created_by_id": str(discount.get('createdById', '')) if discount.get('createdById') else '',
                        "is_valid": discount.get('isValid', False),
                        "is_expired": discount.get('isExpired', False),
                        "usage_limit_reached": discount.get('usageLimitReached', False),
                        "usage_percentage": usage_percentage_float,
                        "total_savings": total_savings_float,
                        "stored_at": datetime.now().isoformat()
                    }
                    
                    # Use business_collection directly
                    business_collection.upsert(
                        documents=[discount_content],
                        metadatas=[discount_metadata],
                        ids=[f"discount_{discount_id}"]
                    )
                    
                    sync_results["discounts"]["success"] += 1
                    
                except Exception as e:
                    sync_results["discounts"]["errors"] += 1
                    error_msg = f"Discount {discount.get('id', 'unknown')}: {str(e)}"
                    sync_results["errors"].append(error_msg)
        
        # Đồng bộ Users (nếu có)
        if data.get('users'):
            sync_results["users"] = {"total": len(data['users']), "success": 0, "errors": 0}
            print(f"[Sync] Syncing {len(data['users'])} users...")
            
            for user in data['users']:
                try:
                    user_id = str(user.get('id', ''))
                    
                    user_content = f"""
User ID: {user.get('id')}
Username: {user.get('username', '')}
Email: {user.get('email', '')}
Role: {user.get('role', '')}
Status: {user.get('accountStatus', '')}
Phone: {user.get('phoneNumber', '')}
Address: {user.get('address', '')}
"""
                    
                    user_metadata = {
                        "data_type": "user",
                        "user_id": user_id,
                        "username": user.get('username', ''),
                        "email": user.get('email', ''),
                        "role": user.get('role', ''),
                        "account_status": user.get('accountStatus', ''),
                        "phone_number": user.get('phoneNumber', ''),
                        "address": user.get('address', ''),
                        "stored_at": datetime.now().isoformat()
                    }
                    
                    business_collection.upsert(
                        documents=[user_content],
                        metadatas=[user_metadata],
                        ids=[f"user_{user_id}"]
                    )
                    
                    sync_results["users"]["success"] += 1
                    
                except Exception as e:
                    sync_results["users"]["errors"] += 1
                    error_msg = f"User {user.get('id', 'unknown')}: {str(e)}"
                    sync_results["errors"].append(error_msg)
        
        # Đồng bộ Business Documents (nếu có)
        if data.get('businessDocuments'):
            sync_results["documents"] = {"total": len(data['businessDocuments']), "success": 0, "errors": 0}
            print(f"[Sync] Syncing {len(data['businessDocuments'])} business documents...")
            
            for doc in data['businessDocuments']:
                try:
                    doc_id = str(doc.get('id', ''))
                    
                    file_size = doc.get('fileSize')
                    file_size_int = int(file_size) if file_size is not None else 0
                    
                    doc_content = f"""
Document ID: {doc.get('id')}
Business: {doc.get('businessUsername', '')}
File Name: {doc.get('fileName', '')}
File Type: {doc.get('fileType', '')}
Description: {doc.get('description', '')}
Size: {file_size_int} bytes
Uploaded: {doc.get('uploadedAt', '')}
"""
                    
                    doc_metadata = {
                        "data_type": "document",
                        "document_id": doc_id,
                        "business_id": str(doc.get('businessId', '')) if doc.get('businessId') else '',
                        "business_username": doc.get('businessUsername', ''),
                        "file_name": doc.get('fileName', ''),
                        "file_type": doc.get('fileType', ''),
                        "file_path": doc.get('filePath', ''),
                        "file_size": file_size_int,
                        "description": doc.get('description', ''),
                        "uploaded_at": doc.get('uploadedAt', ''),
                        "stored_at": datetime.now().isoformat()
                    }
                    
                    business_collection.upsert(
                        documents=[doc_content],
                        metadatas=[doc_metadata],
                        ids=[f"document_{doc_id}"]
                    )
                    
                    sync_results["documents"]["success"] += 1
                    
                except Exception as e:
                    sync_results["documents"]["errors"] += 1
                    error_msg = f"Document {doc.get('id', 'unknown')}: {str(e)}"
                    sync_results["errors"].append(error_msg)
        
        # Thêm revenue overview từ data gốc
        sync_results["revenue_overview"] = {
            "total_revenue": safe_decimal(data.get('totalRevenue')),
            "monthly_revenue": safe_decimal(data.get('monthlyRevenue')),
            "weekly_revenue": safe_decimal(data.get('weeklyRevenue')),
            "daily_revenue": safe_decimal(data.get('dailyRevenue')),
        }
        
        # Thêm top selling products từ data gốc
        if data.get('topSellingProducts'):
            sync_results["top_selling_products"] = [
                {
                    "product_id": str(p.get('productId', '')),
                    "product_name": p.get('productName', ''),
                    "total_sold": safe_int(p.get('totalSold')),
                    "revenue": safe_decimal(p.get('revenue'))
                }
                for p in data.get('topSellingProducts', [])[:10]
            ]
        
        # Thêm low stock products từ data gốc
        if data.get('lowStockProducts'):
            sync_results["low_stock_products"] = [
                {
                    "product_id": str(p.get('productId', '')),
                    "product_name": p.get('productName', ''),
                    "quantity": safe_int(p.get('quantity')),
                    "category": p.get('categoryName', '')
                }
                for p in data.get('lowStockProducts', [])
            ]
        
        # Tạo summary
        total_success = (
            sync_results["products"]["success"] +
            sync_results["orders"]["success"] +
            sync_results["categories"]["success"] +
            sync_results["business_performance"]["success"] +
            sync_results["discounts"]["success"] +
            sync_results.get("users", {}).get("success", 0) +
            sync_results.get("documents", {}).get("success", 0)
        )
        
        total_errors = (
            sync_results["products"]["errors"] +
            sync_results["orders"]["errors"] +
            sync_results["categories"]["errors"] +
            sync_results["business_performance"]["errors"] +
            sync_results["discounts"]["errors"] +
            sync_results.get("users", {}).get("errors", 0) +
            sync_results.get("documents", {}).get("errors", 0)
        )
        
        sync_results["summary"] = {
            "total_success": total_success,
            "total_errors": total_errors,
            "success_rate": f"{(total_success / (total_success + total_errors) * 100):.2f}%" if (total_success + total_errors) > 0 else "0%",
            "total_users": safe_int(data.get('totalUsers')),
            "total_customers": safe_int(data.get('totalCustomers')),
            "total_business_users": safe_int(data.get('totalBusinessUsers')),
            "total_products": safe_int(data.get('totalProducts')),
            "active_products": safe_int(data.get('activeProducts')),
            "total_orders": safe_int(data.get('totalOrders')),
            "delivered_orders": safe_int(data.get('deliveredOrders')),
            "pending_orders": safe_int(data.get('pendingOrders'))
        }
        
        print(f"[Sync] Completed: {total_success} success, {total_errors} errors")
        
        return sync_results
        
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Error connecting to Spring Service: {str(e)}")
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Sync error: {str(e)}")
