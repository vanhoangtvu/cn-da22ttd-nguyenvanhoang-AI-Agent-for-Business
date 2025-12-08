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
from typing import Optional
import chromadb
from groq import Groq

router = APIRouter()

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
    
    # Get Gemini models
    if GEMINI_API_KEY:
        try:
            gemini_models = genai.list_models()
            for m in gemini_models:
                if 'generateContent' in m.supported_generation_methods:
                    model_id = m.name.replace('models/', '')
                    models.append({
                        'id': model_id,
                        'name': m.display_name,
                        'provider': 'Google',
                        'context_window': getattr(m, 'input_token_limit', 32768)
                    })
            print(f"[Analytics] Loaded {len([m for m in models if m['provider'] == 'Google'])} Gemini models")
        except Exception as e:
            print(f"[Analytics] Error loading Gemini models: {e}")
    
    # Get Groq models
    if groq_client:
        try:
            models_response = groq_client.models.list()
            excluded_keywords = ['whisper', 'tts', 'guard', 'safeguard', 'prompt-guard']
            
            for model in models_response.data:
                if hasattr(model, 'id') and model.id and getattr(model, 'active', True):
                    model_id = model.id.lower()
                    
                    # Skip non-chat models
                    if any(keyword in model_id for keyword in excluded_keywords):
                        continue
                    
                    context_window = getattr(model, 'context_window', 131072)
                    models.append({
                        'id': model.id,
                        'name': model.id,
                        'provider': 'Groq',
                        'context_window': context_window
                    })
            print(f"[Analytics] Loaded {len([m for m in models if m['provider'] == 'Groq'])} Groq models")
        except Exception as e:
            print(f"[Analytics] Error loading Groq models: {e}")
    
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
            return {'products': [], 'orders': [], 'categories': []}
        
        # Lấy collection từ ChromaDB
        try:
            products_collection = chroma_client.get_collection(name="products")
            orders_collection = chroma_client.get_collection(name="orders")
            categories_collection = chroma_client.get_collection(name="categories")
        except Exception as e:
            print(f"Error getting collections: {e}")
            return {'products': [], 'orders': [], 'categories': []}
        
        # Lấy tất cả dữ liệu từ collections
        products_data = products_collection.get(include=['metadatas'])
        orders_data = orders_collection.get(include=['metadatas'])
        categories_data = categories_collection.get(include=['metadatas'])
        
        # Parse metadata thành danh sách objects
        products = products_data.get('metadatas', [])
        orders = orders_data.get('metadatas', [])
        categories = categories_data.get('metadatas', [])
        
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
        
        print(f"[Analytics] Loaded {len(products)} products, {len(orders)} orders, {len(categories)} categories from ChromaDB")
        
        return {
            'products': products,
            'orders': orders,
            'categories': categories
        }
    except Exception as e:
        print(f"Error fetching business data from ChromaDB: {e}")
        import traceback
        traceback.print_exc()
        return {
            'products': [],
            'orders': [],
            'categories': []
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
        
        # Determine provider based on model name
        is_groq = any(model_name.startswith(prefix) for prefix in ['llama', 'mixtral', 'gemma'])
        
        if is_groq and groq_client:
            # Use Groq API
            print(f"[Analytics] Using Groq API")
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
        else:
            # Use Gemini API
            print(f"[Analytics] Using Gemini API")
            model = genai.GenerativeModel(model_name)
            response = model.generate_content(prompt)
            ai_insights = response.text
        
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
    
    base_context = f"""
BẠN LÀ CHUYÊN GIA PHÂN TÍCH KINH DOANH VÀ CHIẾN LƯỢC.

DỮ LIỆU TỔNG QUAN:
- Tổng số sản phẩm: {overview.get('total_products', 0)}
- Tổng số đơn hàng: {overview.get('total_orders', 0)}
- Tổng doanh thu: {overview.get('total_revenue', 0):,.0f} VNĐ
- Giá trị đơn hàng trung bình: {overview.get('avg_order_value', 0):,.0f} VNĐ

DOANH THU THEO TRẠNG THÁI ĐƠN HÀNG:
{json.dumps(revenue_by_status, indent=2, ensure_ascii=False)}

ĐƠN HÀNG THEO TRẠNG THÁI:
{json.dumps(orders_by_status, indent=2, ensure_ascii=False)}

THỐNG KÊ THEO DANH MỤC:
{json.dumps(category_stats, indent=2, ensure_ascii=False)}

SẢN PHẨM SẮP HẾT HÀNG (< 10 sản phẩm):
{len(low_stock_products)} sản phẩm

TOP SẢN PHẨM:
{json.dumps([{'name': p.get('name'), 'price': p.get('price'), 'quantity': p.get('quantity')} for p in top_products[:5]], indent=2, ensure_ascii=False)}
"""

    if analysis_type == 'general':
        prompt = base_context + """

NHIỆM VỤ: Phân tích tổng quan tình hình kinh doanh và đưa ra các đề xuất chiến lược.

HÃY CUNG CẤP:
1. **Đánh giá tổng quan**: Phân tích tình hình kinh doanh hiện tại
2. **Điểm mạnh**: Những điểm tích cực trong hoạt động kinh doanh
3. **Điểm cần cải thiện**: Những vấn đề cần được giải quyết
4. **Đề xuất chiến lược**: 5-7 hành động cụ thể để cải thiện hiệu quả kinh doanh
5. **Dự báo**: Xu hướng và tiềm năng phát triển

Trả lời bằng tiếng Việt, chuyên nghiệp, có cấu trúc rõ ràng với markdown formatting.
"""

    elif analysis_type == 'pricing':
        prompt = base_context + """

NHIỆM VỤ: Phân tích chiến lược giá và đề xuất điều chỉnh giá bán.

HÃY CUNG CẤP:
1. **Phân tích giá hiện tại**: Đánh giá mức giá của các sản phẩm/danh mục
2. **Cơ hội tăng giá**: Sản phẩm nào có thể tăng giá mà không ảnh hưởng doanh số
3. **Cơ hội giảm giá**: Sản phẩm nào nên giảm giá để kích thích doanh số
4. **Chiến lược combo/bundle**: Đề xuất gói sản phẩm kết hợp
5. **Chiến lược khuyến mãi**: Thời điểm và mức độ khuyến mãi phù hợp

Trả lời bằng tiếng Việt, chuyên nghiệp, có cấu trúc rõ ràng với markdown formatting.
"""

    elif analysis_type == 'inventory':
        prompt = base_context + """

NHIỆM VỤ: Phân tích quản lý kho hàng và đề xuất tối ưu hóa.

HÃY CUNG CẤP:
1. **Tình trạng tồn kho**: Đánh giá lượng hàng tồn kho hiện tại
2. **Sản phẩm cần nhập thêm**: Danh sách sản phẩm sắp hết hàng cần bổ sung
3. **Sản phẩm tồn kho lâu**: Sản phẩm nào bán chậm, cần xử lý
4. **Tối ưu hóa kho**: Đề xuất cách sắp xếp, quản lý kho hiệu quả hơn
5. **Dự trù nhập hàng**: Kế hoạch nhập hàng cho tháng tới

Trả lời bằng tiếng Việt, chuyên nghiệp, có cấu trúc rõ ràng với markdown formatting.
"""

    elif analysis_type == 'sales':
        prompt = base_context + """

NHIỆM VỤ: Phân tích hiệu quả bán hàng và đề xuất tăng trưởng.

HÃY CUNG CẤP:
1. **Phân tích doanh số**: Đánh giá hiệu quả bán hàng theo danh mục, sản phẩm
2. **Kênh bán hàng**: Phân tích hiệu quả các kênh bán hàng
3. **Chiến lược marketing**: Đề xuất các chiến dịch marketing phù hợp
4. **Chăm sóc khách hàng**: Cách cải thiện trải nghiệm khách hàng
5. **Mục tiêu tăng trưởng**: Roadmap để tăng doanh thu 20-30%

Trả lời bằng tiếng Việt, chuyên nghiệp, có cấu trúc rõ ràng với markdown formatting.
"""

    else:
        prompt = base_context + "\n\nPhân tích tổng quan và đưa ra đề xuất."

    return prompt
