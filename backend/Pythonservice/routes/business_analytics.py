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

# Import services
from services.document_processing_service import get_document_processor
from services.analytics_rag_service import AnalyticsRAGService

router = APIRouter()

# Global analytics RAG service instance
analytics_rag_service = None

def set_analytics_rag_service(service: AnalyticsRAGService):
    """Set the global analytics RAG service instance"""
    global analytics_rag_service
    analytics_rag_service = service

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

def sanitize_metadata(metadata_dict):
    """Sanitize metadata dictionary for ChromaDB compatibility"""
    sanitized = {}
    for key, value in metadata_dict.items():
        if isinstance(value, (str, int, float, bool)):
            # Ensure strings are not too long and don't contain null bytes
            if isinstance(value, str):
                value = value.replace('\x00', '').replace('\r', '').replace('\n', ' ')
                if len(value) > 10000:  # Limit string length
                    value = value[:10000] + '...'
            sanitized[key] = value
        else:
            # Convert other types to string
            sanitized[key] = str(value)
    return sanitized

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

def resolve_spring_file_path(relative_path):
    """
    Resolve đường dẫn file tương đối từ Spring Service thành đường dẫn tuyệt đối
    
    Args:
        relative_path: Đường dẫn tương đối từ Spring Service (vd: 'uploads/documents/file.xlsx')
        
    Returns:
        Đường dẫn tuyệt đối hoặc None nếu không tìm thấy
    """
    if not relative_path:
        return None
    
    # Nếu đã là đường dẫn tuyệt đối, trả về luôn
    if os.path.isabs(relative_path):
        return relative_path if os.path.exists(relative_path) else None
    
    # Các đường dẫn có thể có của Spring Service uploads
    possible_base_paths = [
        # Đường dẫn từ thư mục Python service đến Spring service
        os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'SpringService', relative_path),
        # Đường dẫn tuyệt đối dựa trên cấu trúc project
        os.path.join('/home/hv/DuAn/CSN/AI-Agent-for-Business/backend/SpringService', relative_path),
        # Đường dẫn từ environment variable nếu có
        os.path.join(os.getenv('SPRING_UPLOAD_PATH', ''), relative_path) if os.getenv('SPRING_UPLOAD_PATH') else None,
    ]
    
    # Thử từng đường dẫn có thể
    for base_path in possible_base_paths:
        if base_path and os.path.exists(base_path):
            print(f"[File Resolver] Found file at: {base_path}")
            return base_path
    
    # Nếu không tìm thấy ở các vị trí chuẩn, thử tìm trong thư mục hiện tại
    current_dir = os.getcwd()
    fallback_path = os.path.join(current_dir, relative_path)
    if os.path.exists(fallback_path):
        print(f"[File Resolver] Found file at fallback location: {fallback_path}")
        return fallback_path
    
    print(f"[File Resolver] File not found at any location for: {relative_path}")
    return None

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
            revenue_collection = chroma_client.get_collection(name="revenue_overview")
        except Exception as e:
            print(f"Error getting collections: {e}")
            return {'products': [], 'orders': [], 'categories': [], 'discounts': [], 'business_performance': [], 'users': [], 'documents': [], 'revenue_overview': []}
        
        # Lấy tất cả dữ liệu từ collections (limit lớn để đảm bảo lấy hết)
        business_data = business_collection.get(include=['metadatas'], limit=10000)
        orders_data = orders_collection.get(include=['metadatas'], limit=10000)
        revenue_data = revenue_collection.get(include=['metadatas'], limit=10000)
        
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
        
        # Parse revenue overview từ revenue_overview collection
        revenue_overview = revenue_data.get('metadatas', [])
        
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
            'documents': documents,
            'revenue_overview': revenue_overview
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
            'documents': [],
            'revenue_overview': []
        }

def calculate_statistics(data):
    """Tính toán các chỉ số thống kê"""
    products = data.get('products', [])
    orders = data.get('orders', [])
    categories = data.get('categories', [])
    revenue_overview = data.get('revenue_overview', [])
    
    # Thống kê tổng quan
    total_products = len(products)
    total_orders = len(orders)
    total_categories = len(categories)
    
    # Sử dụng dữ liệu doanh thu từ revenue_overview nếu có, nếu không thì tính từ orders
    if revenue_overview:
        # Lấy dữ liệu từ revenue_overview collection
        revenue_data = revenue_overview[0] if revenue_overview else {}
        total_revenue = revenue_data.get('total_revenue', 0)
        monthly_revenue = revenue_data.get('monthly_revenue', 0)
        weekly_revenue = revenue_data.get('weekly_revenue', 0)
        daily_revenue = revenue_data.get('daily_revenue', 0)
    else:
        # Fallback: tính từ orders data
        total_revenue = sum(order.get('totalAmount', 0) for order in orders)
        monthly_revenue = 0  # Không thể tính từ orders data
        weekly_revenue = 0
        daily_revenue = 0
    
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
    top_products = products_sorted
    
    # Sản phẩm sắp hết hàng (stock < 20)
    low_stock_products = sorted(
        [p for p in enriched_products if p.get('stock', 0) < 20],
        key=lambda x: x.get('stock', 0)
    )
    
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
    
    # Tính available_stock cho từng sản phẩm
    for product in enriched_products:
        initial_quantity = product.get('quantity', 0)
        total_sold = product.get('totalSold', 0)
        product['available_stock'] = max(0, initial_quantity - total_sold)
    
    # Phân tích tồn kho chi tiết theo yêu cầu: ≥30, 10-29, 1-9, 0
    total_inventory_value = sum([p.get('price', 0) * p.get('available_stock', 0) for p in enriched_products])
    
    # Categorize products
    stock_good = [p for p in enriched_products if p.get('available_stock', 0) >= 30]
    stock_avg = [p for p in enriched_products if 10 <= p.get('available_stock', 0) < 30]
    stock_low = [p for p in enriched_products if 1 <= p.get('available_stock', 0) < 10]
    stock_out = [p for p in enriched_products if p.get('available_stock', 0) == 0]
    
    total_products_count = len(enriched_products) if enriched_products else 1  # Avoid division by zero
    
    inventory_table_data = {
        'good': {
            'count': len(stock_good),
            'value': sum([p.get('price', 0) * p.get('available_stock', 0) for p in stock_good]),
            'percent': (len(stock_good) / total_products_count) * 100
        },
        'average': {
            'count': len(stock_avg),
            'value': sum([p.get('price', 0) * p.get('available_stock', 0) for p in stock_avg]),
            'percent': (len(stock_avg) / total_products_count) * 100
        },
        'low': {
            'count': len(stock_low),
            'value': sum([p.get('price', 0) * p.get('available_stock', 0) for p in stock_low]),
            'percent': (len(stock_low) / total_products_count) * 100
        },
        'out': {
            'count': len(stock_out),
            'value': 0,
            'percent': (len(stock_out) / total_products_count) * 100
        }
    }
    
    inventory_turnover_ratio = total_revenue / total_inventory_value if total_inventory_value > 0 else 0
    out_of_stock_products = len(stock_out)
    
    inventory_analysis = {
        'critical_stock_products': stock_low,  # Tồn kho thấp (1-9)
        'warning_stock_products': stock_avg,   # Tồn kho trung bình (10-29)
        'out_of_stock_products': stock_out,    # Hết hàng (0)
        'stock_distribution': {
            'well_stocked': {'count': len(stock_good), 'value': inventory_table_data['good']['value']},
            'medium_stock': {'count': len(stock_avg), 'value': inventory_table_data['average']['value']},
            'low_stock': {'count': len(stock_low), 'value': inventory_table_data['low']['value']},
            'out_of_stock': {'count': len(stock_out), 'value': 0}
        },
        'table_data': inventory_table_data
    }
    
    return {
        'overview': {
            'total_products': total_products,
            'total_orders': total_orders,
            'total_categories': total_categories,
            'total_revenue': total_revenue,
            'monthly_revenue': monthly_revenue,
            'weekly_revenue': weekly_revenue,
            'daily_revenue': daily_revenue,
            'avg_order_value': total_revenue / total_orders if total_orders > 0 else 0,
            'total_inventory_value': total_inventory_value,
            'out_of_stock_products': out_of_stock_products,
            'inventory_turnover_ratio': inventory_turnover_ratio
        },
        'revenue_by_status': revenue_by_status_array,
        'orders_by_status': orders_by_status_array,
        'top_products': top_products,
        'low_stock_products': sorted(stock_low, key=lambda x: x.get('available_stock', 0)),
        'category_stats': category_stats,
        'inventory_analysis': inventory_analysis,
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
    """Sử dụng AI để phân tích và đề xuất chiến lược kinh doanh với RAG từ documents"""
    try:
        # Lấy dữ liệu kinh doanh từ ChromaDB
        business_data = get_business_data()
        statistics = calculate_statistics(business_data)
        
        # 🔍 SEARCH BUSINESS DOCUMENTS FOR RELEVANT INFORMATION
        document_context = ""
        if analytics_rag_service:
            try:
                # Search for document content related to the analysis type
                search_query = request.type
                doc_results = analytics_rag_service.search_business_data(
                    query=search_query,
                    n_results=5
                )
                
                if doc_results:
                    document_context = "\\n\\n📄 THÔNG TIN TỪ TÀI LIỆU DOANH NGHIỆP:\\n"
                    for i, doc in enumerate(doc_results, 1):
                        content = doc.get('content', '')[:1000]  # Limit content length
                        document_context += f"\\n--- Tài liệu {i} ---\\n{content}\\n"
                    
                    print(f"[AI Insights] Found {len(doc_results)} relevant documents")
                else:
                    print("[AI Insights] No relevant documents found")
                    
            except Exception as e:
                print(f"[AI Insights] Error searching documents: {e}")
        
        # Tạo prompt cho AI dựa trên loại phân tích + document context
        prompt = create_analysis_prompt(request.type, statistics, business_data, document_context)
        
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
                    max_tokens=8192,
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

def create_analysis_prompt(analysis_type, statistics, business_data, document_context=""):
    """Tạo prompt cho AI dựa trên loại phân tích và thông tin từ tài liệu"""
    
    overview = statistics.get('overview', {})
    revenue_by_status = statistics.get('revenue_by_status', [])
    orders_by_status = statistics.get('orders_by_status', [])
    category_stats = statistics.get('category_stats', {})
    low_stock_products = statistics.get('low_stock_products', [])
    top_products = statistics.get('top_products', [])
    
    # Lấy dữ liệu bảng phân tích tồn kho pre-calculated
    inventory_analysis = statistics.get('inventory_analysis', {})
    inv_table = inventory_analysis.get('table_data', {})
    
    # Create Markdown Table string explicitly
    inventory_table_md = f"""
| Loại | Số lượng SP | Giá trị (VNĐ) | Tỷ lệ % |
| :--- | :---: | :---: | :---: |
| 🟢 Tốt (≥30 SP) | {inv_table.get('good', {}).get('count', 0)} | {inv_table.get('good', {}).get('value', 0):,.0f} | {inv_table.get('good', {}).get('percent', 0):.1f}% |
| 🟡 Trung bình (10-29 SP) | {inv_table.get('average', {}).get('count', 0)} | {inv_table.get('average', {}).get('value', 0):,.0f} | {inv_table.get('average', {}).get('percent', 0):.1f}% |
| 🔴 Thấp (1-9 SP) | {inv_table.get('low', {}).get('count', 0)} | {inv_table.get('low', {}).get('value', 0):,.0f} | {inv_table.get('low', {}).get('percent', 0):.1f}% |
| ⚫ Hết hàng (0) | {inv_table.get('out', {}).get('count', 0)} | {inv_table.get('out', {}).get('value', 0):,.0f} | {inv_table.get('out', {}).get('percent', 0):.1f}% |
"""

    # Lấy thêm dữ liệu chi tiết
    products = business_data.get('products', [])
    orders = business_data.get('orders', [])
    categories = business_data.get('categories', [])
    discounts = business_data.get('discounts', [])
    business_performance = business_data.get('business_performance', [])
    
    # Phân tích sâu hơn
    total_inventory_value = overview.get('total_inventory_value', 0)
    avg_product_price = sum([p.get('price', 0) for p in products]) / len(products) if products else 0
    products_with_details = [p for p in products if p.get('has_details')]
    out_of_stock_count = overview.get('out_of_stock_products', 0)
    
    base_context = f"""
🎯 BẠN LÀ CHUYÊN GIA PHÂN TÍCH KINH DOANH & CHIẾN LƯỢC CAO CẤP
Nhiệm vụ: Phân tích dữ liệu được cung cấp và đưa ra Insights chính xác.
QUAN TRỌNG: TUYỆT ĐỐI KHÔNG TỰ TÍNH TOÁN LẠI SỐ LIỆU. HÃY SỬ DỤNG BẢNG SỐ LIỆU ĐÃ ĐƯỢC CUNG CẤP DƯỚI ĐÂY.

📊 1️⃣ ĐÁNH GIÁ TÌNH TRẠNG TỒN KHO HIỆN TẠI (DỮ LIỆU CHÍNH XÁC):
{inventory_table_md}

📊 DỮ LIỆU KINH DOANH TỔNG QUAN KHÁC:
═══════════════════════════════════════
📦 Sản phẩm:
   • Tổng số: {overview.get('total_products', 0)} sản phẩm
   • Có thông tin chi tiết: {len(products_with_details)} sản phẩm ({len(products_with_details)/len(products)*100:.1f}% nếu có sản phẩm)
   • Giá trung bình: {avg_product_price:,.0f} VNĐ
   • Tổng giá trị hàng tồn: {total_inventory_value:,.0f} VNĐ
   • Sản phẩm hết hàng: {out_of_stock_count} sản phẩm
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
{json.dumps([{'tên': p.get('name'), 'giá': f"{p.get('price', 0):,.0f} VNĐ", 'tồn_kho': p.get('available_stock', 0), 'đã_bán': p.get('total_sold', 0)} for p in top_products], indent=2, ensure_ascii=False)}

⚠️ SẢN PHẨM CẦN NHẬP HÀNG (Tồn kho < 10):
{json.dumps([{'tên': p.get('name'), 'tồn_kho': p.get('available_stock', 0), 'giá': f"{p.get('price', 0):,.0f} VNĐ"} for p in low_stock_products], indent=2, ensure_ascii=False)}

📊 PHÂN TÍCH TỒN KHO CHI TIẾT:
   • Tỷ lệ quay vòng hàng tồn: {overview.get('inventory_turnover_ratio', 0):.2f}
   • Sản phẩm hết hàng: {out_of_stock_count}/{len(products)} ({out_of_stock_count/len(products)*100:.1f}% nếu có sản phẩm)
   • Giá trị hàng tồn kho: {total_inventory_value:,.0f} VNĐ
   • Sản phẩm tồn kho thấp: {len(low_stock_products)} sản phẩm

💰 THÔNG TIN KHUYẾN MÃI:
   • Tổng số chương trình: {len(discounts)}
   • Đang hoạt động: {len([d for d in discounts if d.get('status') == 'ACTIVE'])}

🏢 HIỆU SUẤT NGƯỜI BÁN:
   • Tổng số người bán: {len(business_performance)}
   • Tổng doanh thu tất cả: {sum([bp.get('revenue', 0) for bp in business_performance]):,.0f} VNĐ

{document_context}
"""

    # Format base_context with actual values
    inventory_analysis = statistics.get('inventory_analysis', {})
    
    # Replace placeholders in base_context
    base_context = base_context.replace('{overview.get(\'total_products\', 0)}', str(overview.get('total_products', 0)))
    base_context = base_context.replace('{len(products_with_details)}', str(len(products_with_details)))
    base_context = base_context.replace('{len(products)*100:.1f}', f"{len(products_with_details)/len(products)*100:.1f}" if products else '0.0')
    base_context = base_context.replace('{avg_product_price:,.0f}', f"{avg_product_price:,.0f}")
    base_context = base_context.replace('{total_inventory_value:,.0f}', f"{total_inventory_value:,.0f}")
    base_context = base_context.replace('{out_of_stock_count}', str(out_of_stock_count))
    base_context = base_context.replace('{len(low_stock_products)}', str(len(low_stock_products)))
    base_context = base_context.replace('{overview.get(\'inventory_turnover_ratio\', 0):.2f}', f"{overview.get('inventory_turnover_ratio', 0):.2f}")
    base_context = base_context.replace('{out_of_stock_count/len(products)*100:.1f}', f"{out_of_stock_count/len(products)*100:.1f}" if products else '0.0')
    base_context = base_context.replace('{total_inventory_value:,.0f}', f"{total_inventory_value:,.0f}")
    base_context = base_context.replace('{len(low_stock_products)}', str(len(low_stock_products)))
    
    # Replace JSON strings
    base_context = base_context.replace('{json.dumps(revenue_by_status, indent=2, ensure_ascii=False)}', json.dumps(revenue_by_status, indent=2, ensure_ascii=False))
    base_context = base_context.replace('{json.dumps(orders_by_status, indent=2, ensure_ascii=False)}', json.dumps(orders_by_status, indent=2, ensure_ascii=False))
    base_context = base_context.replace('{json.dumps(category_stats, indent=2, ensure_ascii=False)}', json.dumps(category_stats, indent=2, ensure_ascii=False))
    base_context = base_context.replace('{json.dumps([{\'tên\': p.get(\'name\'), \'giá\': f"{p.get(\'price\', 0):,.0f} VNĐ", \'tồn_kho\': p.get(\'available_stock\', 0), \'đã_bán\': p.get(\'total_sold\', 0)} for p in top_products], indent=2, ensure_ascii=False)}', json.dumps([{'tên': p.get('name'), 'giá': f"{p.get('price', 0):,.0f} VNĐ", 'tồn_kho': p.get('available_stock', 0), 'đã_bán': p.get('total_sold', 0)} for p in top_products], indent=2, ensure_ascii=False))
    base_context = base_context.replace('{json.dumps([{\'tên\': p.get(\'name\'), \'tồn_kho\': p.get(\'available_stock\', 0), \'giá\': f"{p.get(\'price\', 0):,.0f} VNĐ"} for p in low_stock_products], indent=2, ensure_ascii=False)}', json.dumps([{'tên': p.get('name'), 'tồn_kho': p.get('available_stock', 0), 'giá': f"{p.get('price', 0):,.0f} VNĐ"} for p in low_stock_products], indent=2, ensure_ascii=False))
    
    # Replace other placeholders
    base_context = base_context.replace('{len(discounts)}', str(len(discounts)))
    base_context = base_context.replace('{len([d for d in discounts if d.get(\'status\') == \'ACTIVE\'])}', str(len([d for d in discounts if d.get('status') == 'ACTIVE'])))
    base_context = base_context.replace('{len(business_performance)}', str(len(business_performance)))
    base_context = base_context.replace('{sum([bp.get(\'revenue\', 0) for bp in business_performance]):,.0f}', f"{sum([bp.get('revenue', 0) for bp in business_performance]):,.0f}")
    base_context = base_context.replace('{document_context}', document_context)

    if analysis_type == 'general':
        prompt = base_context + """

🎯 NHIỆM VỤ: BÁO CÁO PHÂN TÍCH KINH DOANH CHUYÊN NGHIỆP & CHIẾN LƯỢC TĂNG TRƯỞNG

═══════════════════════════════════════════════════════════════════════════════

📋 CẤU TRÚC BÁO CÁO YÊU CẦU:

## 📊 EXECUTIVE SUMMARY (Tóm tắt điều hành)
> Viết 1 đoạn ngắn gọn (3-4 câu) tóm tắt tình hình kinh doanh hiện tại, highlight 2-3 insights quan trọng nhất và 1-2 hành động ưu tiên cao nhất.

---

## 📈 DASHBOARD CHÍNH - CHỈ SỐ QUAN TRỌNG

Tạo bảng KPIs với đánh giá và xu hướng:

| Chỉ số | Giá trị hiện tại | Đánh giá | Xu hướng | Hành động |
|--------|------------------|----------|----------|-----------|
| 💰 Tổng doanh thu | [X] VNĐ | 🟢/🟡/🔴 | ↗️/↘️/→ | [Gợi ý ngắn] |
| 🛒 Tổng đơn hàng | [X] đơn | 🟢/🟡/🔴 | ↗️/↘️/→ | [Gợi ý ngắn] |
| 💵 Giá trị TB/đơn (AOV) | [X] VNĐ | 🟢/🟡/🔴 | ↗️/↘️/→ | [Gợi ý ngắn] |
| 📦 Tỷ lệ hàng tồn khỏe | [X]% | 🟢/🟡/🔴 | ↗️/↘️/→ | [Gợi ý ngắn] |
| ⚠️ Sản phẩm cần nhập | [X] SP | 🟢/🟡/🔴 | ↗️/↘️/→ | [Gợi ý ngắn] |
| 🔄 Tỷ lệ quay vòng hàng | [X] lần | 🟢/🟡/🔴 | ↗️/↘️/→ | [Gợi ý ngắn] |

**Chú thích:** 🟢 Tốt | 🟡 Cần cải thiện | 🔴 Cảnh báo | ↗️ Tăng | ↘️ Giảm | → Ổn định

---

## 🎯 PHÂN TÍCH SWOT CHUYÊN SÂU

### 💪 ĐIỂM MẠNH (Strengths)
1. **[Điểm mạnh 1]**: [Mô tả chi tiết với số liệu cụ thể]
   - Tác động: [Định lượng impact]
   - Cách tận dụng: [Gợi ý cụ thể]

2. **[Điểm mạnh 2]**: [Mô tả chi tiết với số liệu cụ thể]
   - Tác động: [Định lượng impact]
   - Cách tận dụng: [Gợi ý cụ thể]

[Liệt kê 3-5 điểm mạnh]

### ⚠️ ĐIỂM YẾU (Weaknesses)
1. **[Điểm yếu 1]**: [Mô tả chi tiết với số liệu cụ thể]
   - Rủi ro: [Định lượng risk]
   - Giải pháp: [Hành động cụ thể]

2. **[Điểm yếu 2]**: [Mô tả chi tiết với số liệu cụ thể]
   - Rủi ro: [Định lượng risk]
   - Giải pháp: [Hành động cụ thể]

[Liệt kê 3-5 điểm yếu]

### 🚀 CƠ HỘI (Opportunities)
1. **[Cơ hội 1]**: [Mô tả cơ hội thị trường/nội bộ]
   - Tiềm năng: [Doanh thu/lợi nhuận dự kiến]
   - Cách khai thác: [Chiến thuật cụ thể]

[Liệt kê 3-4 cơ hội]

### 🛡️ THÁCH THỨC (Threats)
1. **[Thách thức 1]**: [Mô tả rủi ro/thách thức]
   - Mức độ: Cao/Trung bình/Thấp
   - Phòng ngừa: [Biện pháp cụ thể]

[Liệt kê 2-3 thách thức]

---

## 🎯 CHIẾN LƯỢC HÀNH ĐỘNG ƯU TIÊN (Action Plan)

### Ma trận ưu tiên (Priority Matrix):

| Hành động | Tác động | Độ khó | Ưu tiên | Timeline | Chi phí | ROI dự kiến |
|-----------|----------|--------|---------|----------|---------|-------------|
| [Hành động 1] | Cao/TB/Thấp | Dễ/TB/Khó | 🔴 P0 | [X tuần] | [Y] VNĐ | [Z]% |
| [Hành động 2] | Cao/TB/Thấp | Dễ/TB/Khó | 🟡 P1 | [X tuần] | [Y] VNĐ | [Z]% |
| [Hành động 3] | Cao/TB/Thấp | Dễ/TB/Khó | 🟢 P2 | [X tuần] | [Y] VNĐ | [Z]% |

**Chú thích:** 🔴 P0 = Khẩn cấp (làm ngay) | 🟡 P1 = Quan trọng (1-2 tuần) | 🟢 P2 = Cần thiết (1 tháng)

### 📋 Chi tiết từng hành động:

#### 🔴 HÀNH ĐỘNG ƯU TIÊN CAO (P0) - Thực hiện ngay

**1. [Tên hành động cụ thể]**
- **Mục tiêu**: [Mục tiêu SMART cụ thể]
- **Lý do**: [Tại sao cần làm ngay]
- **Các bước thực hiện**:
  1. [Bước 1 cụ thể]
  2. [Bước 2 cụ thể]
  3. [Bước 3 cụ thể]
- **Nguồn lực cần**: [Con người, ngân sách, công cụ]
- **KPI đo lường**: [Chỉ số cụ thể để đo thành công]
- **Kết quả kỳ vọng**: [Số liệu cụ thể]

[Liệt kê 2-3 hành động P0]

#### 🟡 HÀNH ĐỘNG QUAN TRỌNG (P1) - Thực hiện trong 1-2 tuần

**1. [Tên hành động]**
- **Mục tiêu**: [SMART goal]
- **Các bước**: [Liệt kê ngắn gọn]
- **KPI**: [Chỉ số đo lường]
- **Kết quả kỳ vọng**: [Số liệu]

[Liệt kê 2-3 hành động P1]

#### 🟢 HÀNH ĐỘNG CẦN THIẾT (P2) - Lên kế hoạch trong tháng

**1. [Tên hành động]**
- **Mục tiêu**: [SMART goal]
- **Kết quả kỳ vọng**: [Số liệu]

[Liệt kê 2-3 hành động P2]

---

## 📊 PHÂN TÍCH THEO LĨNH VỰC

### 💰 DOANH THU & LỢI NHUẬN
- **Phân tích hiện trạng**: [Đánh giá chi tiết]
- **Danh mục đóng góp nhiều nhất**: [Top 3 với % đóng góp]
- **Cơ hội tăng trưởng**: [Gợi ý cụ thể với số liệu]
- **Hành động đề xuất**: [2-3 hành động]

### 📦 TỒN KHO & LOGISTICS
- **Tình trạng tồn kho**: [Đánh giá dựa trên bảng phân loại đã cung cấp]
- **Vấn đề cấp bách**: [Sản phẩm hết hàng, tồn kho thấp]
- **Tối ưu hóa**: [Đề xuất cụ thể]
- **Hành động đề xuất**: [2-3 hành động]

### 🎯 MARKETING & BÁN HÀNG
- **Hiệu quả hiện tại**: [Đánh giá conversion, AOV]
- **Sản phẩm tiềm năng**: [Top products cần đẩy mạnh]
- **Chiến dịch đề xuất**: [2-3 chiến dịch cụ thể]
- **Hành động đề xuất**: [2-3 hành động]

### 👥 KHÁCH HÀNG & TRẢI NGHIỆM
- **Phân tích hành vi**: [Insights từ dữ liệu đơn hàng]
- **Cơ hội tăng retention**: [Gợi ý cụ thể]
- **Hành động đề xuất**: [2-3 hành động]

---

## 🗓️ ROADMAP TRIỂN KHAI (Implementation Timeline)

### 🚀 TUẦN 1-2 (Quick Wins)
- [ ] [Hành động 1 - P0]
- [ ] [Hành động 2 - P0]
- [ ] [Hành động 3 - P0]
- **Mục tiêu**: [Kết quả cụ thể kỳ vọng]

### 📈 THÁNG 1 (Foundation)
- [ ] [Hành động 1 - P1]
- [ ] [Hành động 2 - P1]
- [ ] [Hành động 3 - P1]
- **Mục tiêu**: [Kết quả cụ thể kỳ vọng]

### 🎯 THÁNG 2-3 (Growth)
- [ ] [Hành động 1 - P2]
- [ ] [Hành động 2 - P2]
- **Mục tiêu**: [Kết quả cụ thể kỳ vọng]

### 🚀 QUÝ 2-4 (Scale)
- [ ] [Chiến lược dài hạn 1]
- [ ] [Chiến lược dài hạn 2]
- **Mục tiêu**: [Kết quả cụ thể kỳ vọng]

---

## 📊 KPI DASHBOARD ĐỀ XUẤT THEO DÕI

### 📅 Theo dõi HÀNG TUẦN:
1. **Doanh thu tuần**: Target [X] VNĐ
2. **Số đơn hàng**: Target [Y] đơn
3. **AOV (Giá trị TB/đơn)**: Target [Z] VNĐ
4. **Tỷ lệ chuyển đổi**: Target [W]%
5. **Sản phẩm hết hàng**: Alert nếu > [N] sản phẩm

### 📅 Theo dõi HÀNG THÁNG:
1. **Tăng trưởng doanh thu MoM**: Target +[X]%
2. **Tỷ lệ quay vòng hàng tồn**: Target [Y] lần/tháng
3. **Tỷ lệ hàng tồn khỏe mạnh**: Target > [Z]%
4. **Customer Retention Rate**: Target [W]%
5. **Gross Margin**: Target [V]%

### 🎯 Mục tiêu QUARTERLY:
- **Tăng trưởng doanh thu**: +[X]% so với quý trước
- **Tối ưu chi phí vận hành**: Giảm [Y]%
- **Mở rộng danh mục**: Thêm [Z] sản phẩm mới
- **Tăng customer base**: +[W] khách hàng mới

---

## 💡 KẾT LUẬN & KHUYẾN NGHỊ CHIẾN LƯỢC

### 🎯 3 Ưu tiên hàng đầu:
1. **[Ưu tiên 1]**: [Mô tả ngắn gọn tại sao quan trọng]
2. **[Ưu tiên 2]**: [Mô tả ngắn gọn tại sao quan trọng]
3. **[Ưu tiên 3]**: [Mô tả ngắn gọn tại sao quan trọng]

### 📈 Dự báo tăng trưởng (nếu thực hiện đầy đủ):
- **Doanh thu**: Tăng [X]% trong 3 tháng tới
- **Lợi nhuận**: Tăng [Y]% 
- **Hiệu quả vận hành**: Cải thiện [Z]%
- **Sức khỏe tồn kho**: Đạt [W]% hàng tồn khỏe mạnh

### ⚠️ Rủi ro cần lưu ý:
1. [Rủi ro 1] - Biện pháp phòng ngừa: [...]
2. [Rủi ro 2] - Biện pháp phòng ngừa: [...]

---

⚡ **YÊU CẦU FORMAT:**
- Sử dụng emoji phù hợp, bảng markdown chuyên nghiệp
- Số liệu CỤ THỂ với đơn vị VNĐ, %, thời gian rõ ràng
- Mỗi đề xuất phải có: Mục tiêu + Cách làm + KPI đo lường + Timeline
- Viết tiếng Việt chuyên nghiệp, súc tích, dễ hiểu
- Độ dài: 1200-1800 từ
- Ưu tiên ACTIONABLE insights hơn là mô tả chung chung
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
1. **[Tên combo]**: [Sản phẩm A] + [Sản phẩm B] khác danh mục (vd 1 điện thoại +1 đồng hồ)
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
        prompt = base_context + f"""

📦 NHIỆM VỤ: PHÂN TÍCH & TỐI ƯU QUẢN LÝ TỒN KHO

📝 YÊU CẦU PHÂN TÍCH:

## 1️⃣ ĐÁNH GIÁ TÌNH TRẠNG TỒN KHO HIỆN TẠI
### 📊 Phân loại tồn kho:
Tạo bảng markdown với dữ liệu thực tế:
| Loại | Số lượng SP | Giá trị | Tỷ lệ % |
|------|-------------|---------|---------|
| 🟢 Tốt (≥30 SP) | {inventory_analysis.get('stock_distribution', {}).get('well_stocked', {}).get('count', 0)} | {inventory_analysis.get('stock_distribution', {}).get('well_stocked', {}).get('value', 0):,.0f} VNĐ | {inventory_analysis.get('stock_distribution', {}).get('well_stocked', {}).get('count', 0)/overview.get('total_products', 1)*100:.1f}% |
| 🟡 Trung bình (10-29) | {inventory_analysis.get('stock_distribution', {}).get('medium_stock', {}).get('count', 0)} | {inventory_analysis.get('stock_distribution', {}).get('medium_stock', {}).get('value', 0):,.0f} VNĐ | {inventory_analysis.get('stock_distribution', {}).get('medium_stock', {}).get('count', 0)/overview.get('total_products', 1)*100:.1f}% |
| 🔴 Thấp (1-9) | {inventory_analysis.get('stock_distribution', {}).get('low_stock', {}).get('count', 0)} | {inventory_analysis.get('stock_distribution', {}).get('low_stock', {}).get('value', 0):,.0f} VNĐ | {inventory_analysis.get('stock_distribution', {}).get('low_stock', {}).get('count', 0)/overview.get('total_products', 1)*100:.1f}% |
| ⚫ Hết hàng (0) | {inventory_analysis.get('stock_distribution', {}).get('out_of_stock', {}).get('count', 0)} | 0 VNĐ | {inventory_analysis.get('stock_distribution', {}).get('out_of_stock', {}).get('count', 0)/overview.get('total_products', 1)*100:.1f}% |

### 💰 Giá trị tồn kho:
- **Tổng giá trị**: {overview.get('total_inventory_value', 0):,.0f} VNĐ
- **Tỷ lệ quay vòng**: {overview.get('inventory_turnover_ratio', 0):.2f} (lần/năm)
- **Vốn đóng băng** (hàng tồn lâu): {inventory_analysis.get('stock_distribution', {}).get('well_stocked', {}).get('value', 0):,.0f} VNĐ
- **Khả năng thanh khoản**: {'Cao' if overview.get('inventory_turnover_ratio', 0) > 4 else 'Trung bình' if overview.get('inventory_turnover_ratio', 0) > 2 else 'Thấp'}

## 2️⃣ ƯU TIÊN NHẬP HÀNG NGAY ⚡
Tạo bảng markdown:
| STT | Sản phẩm | Tồn hiện tại | Bán TB/ngày | Hết sau X ngày | SL đề xuất nhập |
|-----|----------|--------------|-------------|----------------|-----------------|

### 📋 Kế hoạch nhập hàng chi tiết:
**TUẦN NÀY (URGENT - Tồn kho 1-5):**
{json.dumps([{'tên': p.get('name'), 'tồn_kho': p.get('available_stock', 0), 'giá': f"{p.get('price', 0):,.0f} VNĐ"} for p in inventory_analysis.get('critical_stock_products', [])], indent=2, ensure_ascii=False)}
- Tổng vốn cần: {sum([p.get('price', 0) * max(50 - p.get('available_stock', 0), 0) for p in inventory_analysis.get('critical_stock_products', [])]):,.0f} VNĐ

**THÁNG NÀY (Tồn kho 6-15):**
{json.dumps([{'tên': p.get('name'), 'tồn_kho': p.get('available_stock', 0), 'giá': f"{p.get('price', 0):,.0f} VNĐ"} for p in inventory_analysis.get('warning_stock_products', [])], indent=2, ensure_ascii=False)}
- Ngân sách: {sum([p.get('price', 0) * max(30 - p.get('available_stock', 0), 0) for p in inventory_analysis.get('warning_stock_products', [])]):,.0f} VNĐ

## 3️⃣ XỬ LÝ HÀNG TỒN KHO LÂU 🗑️
Tạo bảng markdown:
| Sản phẩm | Tồn | Giá trị | Thời gian tồn | Giải pháp đề xuất |
|----------|-----|---------|---------------|-------------------|

### Chiến lược xử lý:
1. **Flash Sale Weekend**: Giảm 40-50% cho top [X] sản phẩm
2. **Bundle Deal**: Kết hợp với sản phẩm hot
3. **Clearance Sale**: Xử lý tồn kho cũ với giảm giá sâu
4. **Trade-in Program**: Thu cũ đổi mới

## 4️⃣ CHIẾN LƯỢC TỐI ƯU TỒN KHO 🎯
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

🚀 NHIỆM VỤ: CHIẾN LƯỢC TĂNG TRƯỞNG BÁN HÀNG & REVENUE OPTIMIZATION

═══════════════════════════════════════════════════════════════════════════════

📋 CẤU TRÚC BÁO CÁO YÊU CẦU:

## 📊 EXECUTIVE SUMMARY - TÌNH HÌNH BÁN HÀNG
> Tóm tắt 3-4 câu về hiện trạng doanh số, highlight 2-3 insights quan trọng nhất và cơ hội tăng trưởng lớn nhất.

---

## 📈 SALES PERFORMANCE DASHBOARD

### Bảng chỉ số bán hàng chính:

| Chỉ số | Giá trị hiện tại | Benchmark | Gap | Cơ hội tăng trưởng |
|--------|------------------|-----------|-----|---------------------|
| 💰 Doanh thu/tháng | [X] VNĐ | [Y] VNĐ | [Z]% | +[W]% nếu đạt benchmark |
| 🛒 Số đơn hàng | [X] đơn | [Y] đơn | [Z]% | +[W] đơn/tháng |
| 💵 AOV (Giá trị TB/đơn) | [X] VNĐ | [Y] VNĐ | [Z]% | +[W] VNĐ/đơn |
| 📊 Conversion Rate | [X]% | [Y]% | [Z]% | +[W]% conversion |
| 🔄 Repeat Purchase Rate | [X]% | [Y]% | [Z]% | +[W]% retention |
| 👥 Customer Lifetime Value | [X] VNĐ | [Y] VNĐ | [Z]% | +[W] VNĐ/khách |

**Tổng tiềm năng tăng trưởng**: +[X]% doanh thu nếu đạt tất cả benchmarks

---

## 🎯 PHÂN TÍCH SALES FUNNEL CHI TIẾT

### Conversion Funnel Analysis:

```
👁️ Traffic (100%)
    ↓ [-X]% drop
🛍️ Product View ([Y]%)
    ↓ [-X]% drop  ← ĐIỂM YẾU 1: Cải thiện product pages
🛒 Add to Cart ([Y]%)
    ↓ [-X]% drop  ← ĐIỂM YẾU 2: Cart abandonment cao
💳 Checkout ([Y]%)
    ↓ [-X]% drop  ← ĐIỂM YẾU 3: Friction trong thanh toán
✅ Purchase ([Y]%)
```

### Bảng phân tích từng giai đoạn:

| Giai đoạn | Conversion | Benchmark | Vấn đề | Giải pháp | Impact dự kiến |
|-----------|------------|-----------|--------|-----------|----------------|
| View → Cart | [X]% | [Y]% | [...] | [...] | +[Z]% orders |
| Cart → Checkout | [X]% | [Y]% | [...] | [...] | +[Z]% orders |
| Checkout → Purchase | [X]% | [Y]% | [...] | [...] | +[Z]% orders |

---

## 👥 PHÂN KHÚC KHÁCH HÀNG & CHIẾN LƯỢC

### Customer Segmentation Matrix:

| Phân khúc | % Khách hàng | % Doanh thu | AOV | Frequency | Đặc điểm | Chiến lược |
|-----------|--------------|-------------|-----|-----------|----------|------------|
| 💎 VIP (High Value) | [X]% | [Y]% | [Z] VNĐ | [W] lần/tháng | [...] | [...] |
| ⭐ Loyal (Regular) | [X]% | [Y]% | [Z] VNĐ | [W] lần/tháng | [...] | [...] |
| 🌱 New (First-time) | [X]% | [Y]% | [Z] VNĐ | [W] lần | [...] | [...] |
| 😴 At-Risk (Churning) | [X]% | [Y]% | [Z] VNĐ | [W] lần | [...] | [...] |
| 💔 Lost (Inactive) | [X]% | [Y]% | [Z] VNĐ | 0 | [...] | [...] |

### Chiến lược cho từng phân khúc:

#### 💎 VIP Customers (Protect & Grow)
1. **VIP Loyalty Program**:
   - Exclusive perks: Early access, special pricing
   - Personal account manager
   - Birthday/anniversary gifts
   - **Target**: Tăng AOV +20%, Frequency +30%

2. **Upsell/Cross-sell Premium**:
   - Premium product recommendations
   - Bundle deals exclusive for VIP
   - **Expected**: +[X] VNĐ/khách/tháng

#### ⭐ Loyal Customers (Maximize Value)
1. **Referral Program**: Thưởng [X] VNĐ cho mỗi giới thiệu thành công
2. **Subscription Model**: Giảm [Y]% cho đăng ký định kỳ
3. **Target**: Chuyển [Z]% lên VIP tier

#### 🌱 New Customers (Convert & Retain)
1. **Welcome Journey** (7 ngày):
   - Day 0: Welcome email + 10% off next purchase
   - Day 2: Product education + use cases
   - Day 5: Social proof + reviews
   - Day 7: Urgency + limited offer
2. **First Purchase Incentive**: Free shipping + gift
3. **Target**: [X]% repeat purchase trong 30 ngày

#### 😴 At-Risk Customers (Win-back)
1. **Re-engagement Campaign**:
   - "We miss you" email với 15% discount
   - Survey: Tại sao không mua nữa?
   - Personalized offers dựa trên lịch sử
2. **Target**: Win-back [X]% trong 60 ngày

#### 💔 Lost Customers (Reactivation)
1. **Win-back Campaign**: 20-30% discount + free shipping
2. **New product announcement**: "Look what's new"
3. **Target**: Reactivate [X]% trong 90 ngày

---

## 🎯 CHIẾN LƯỢC TĂNG AOV (Average Order Value)

### Mục tiêu: Tăng AOV từ [X] VNĐ lên [Y] VNĐ (+[Z]%)

#### A. Product Bundling Strategy

| Bundle Name | Products | Giá lẻ | Giá bundle | Tiết kiệm | Target Sales |
|-------------|----------|--------|------------|-----------|--------------|
| [Bundle 1] | [A + B + C] | [X] VNĐ | [Y] VNĐ | [Z]% | [W] bundles/tháng |
| [Bundle 2] | [A + B] | [X] VNĐ | [Y] VNĐ | [Z]% | [W] bundles/tháng |

**Đề xuất 5-7 bundles cụ thể dựa trên:**
- Sản phẩm thường mua cùng nhau
- Complementary products
- Seasonal bundles
- Gift sets

#### B. Upselling Tactics
1. **Product Page Upsells**:
   - "Customers also bought" section
   - "Upgrade to premium version" với so sánh rõ ràng
   - Limited-time upgrade offers

2. **Cart Upsells**:
   - "Add [Product X] for only [Y] VNĐ more"
   - Free shipping threshold: "Thêm [X] VNĐ để được free ship"
   - Volume discounts: "Mua 2 giảm 10%, mua 3 giảm 15%"

#### C. Cross-selling Strategy
1. **Intelligent Recommendations**:
   - AI-powered "You may also like"
   - "Complete the look/set"
   - Accessories & add-ons

2. **Post-purchase Cross-sell**:
   - Thank you page offers
   - Follow-up emails với related products

**Expected Impact**: Tăng AOV +[X]% = +[Y] VNĐ doanh thu/tháng

---

## 📢 MULTI-CHANNEL MARKETING PLAYBOOK

### A. PAID ADVERTISING STRATEGY

#### 1. Facebook & Instagram Ads

| Campaign Type | Budget/tháng | Target Audience | Objective | Expected ROAS |
|---------------|--------------|-----------------|-----------|---------------|
| Prospecting | [X] VNĐ | Lookalike 1-3% | Acquisition | 3-4X |
| Retargeting - Cart | [X] VNĐ | Cart abandoners | Conversion | 5-7X |
| Retargeting - View | [X] VNĐ | Product viewers | Conversion | 4-5X |
| Engagement | [X] VNĐ | Page engagers | Awareness | 2-3X |

**Creative Strategy**:
- Video ads: Product demos, testimonials
- Carousel ads: Showcase bundles
- Collection ads: Category browsing
- Stories ads: Limited-time offers

#### 2. Google Ads Strategy

| Campaign Type | Budget/tháng | Keywords | Expected CTR | Expected ROAS |
|---------------|--------------|----------|--------------|---------------|
| Search - Brand | [X] VNĐ | Brand terms | [Y]% | 8-10X |
| Search - Generic | [X] VNĐ | Product terms | [Y]% | 4-5X |
| Shopping | [X] VNĐ | Product feed | [Y]% | 5-6X |
| Display Remarketing | [X] VNĐ | Site visitors | [Y]% | 3-4X |

#### 3. TikTok Ads (if applicable)
- Spark Ads với UGC content
- In-Feed Ads với trending sounds
- Budget: [X] VNĐ/tháng
- Target ROAS: 3-5X

**Total Marketing Budget**: [X] VNĐ/tháng
**Expected Revenue**: [Y] VNĐ/tháng
**Overall ROAS Target**: 4-5X

### B. ORGANIC MARKETING STRATEGY

#### 1. Content Marketing Calendar

| Week | Content Type | Topic | Platform | Goal |
|------|--------------|-------|----------|------|
| 1 | Blog post | [Topic] | Website | SEO traffic |
| 1 | Video | Product review | YouTube | Education |
| 1 | Infographic | [Topic] | Social | Engagement |
| 2 | ... | ... | ... | ... |

#### 2. Social Media Strategy
- **Facebook**: 5-7 posts/tuần (mix: 40% educational, 30% promotional, 30% engagement)
- **Instagram**: Daily posts + 3-5 Stories/ngày
- **TikTok**: 3-5 videos/tuần (trending challenges, product demos)
- **Target**: Tăng followers +50%, engagement rate >5%

#### 3. Email Marketing Automation

**Flows cần setup:**

1. **Welcome Series** (5 emails, 10 ngày):
   - Email 1 (Day 0): Welcome + 10% discount code
   - Email 2 (Day 2): Brand story + bestsellers
   - Email 3 (Day 5): Educational content + use cases
   - Email 4 (Day 7): Social proof + reviews
   - Email 5 (Day 10): Last chance + urgency

2. **Abandoned Cart Recovery** (3 emails):
   - Email 1 (1 giờ): Gentle reminder
   - Email 2 (24 giờ): 5% discount incentive
   - Email 3 (48 giờ): 10% discount + free shipping

3. **Post-Purchase** (4 emails):
   - Email 1 (Ngay sau): Thank you + tracking
   - Email 2 (3 ngày): How to use + tips
   - Email 3 (7 ngày): Review request + incentive
   - Email 4 (14 ngày): Cross-sell recommendations

4. **Win-back Campaign** (Inactive 60+ ngày):
   - Email 1: "We miss you" + 15% off
   - Email 2: New arrivals showcase
   - Email 3: Last chance + 20% off

**Expected Email Performance**:
- Open rate: 25-30%
- Click rate: 3-5%
- Conversion rate: 2-3%
- Revenue from email: [X]% of total

---

## 🎁 PROMOTIONAL CALENDAR & CAMPAIGNS

### Quarterly Promotion Strategy:

| Tháng | Campaign | Discount | Duration | Products | Budget | Expected Revenue |
|-------|----------|----------|----------|----------|--------|------------------|
| 1 | New Year Sale | 20-30% | 7 ngày | All | [X] VNĐ | [Y] VNĐ |
| 1 | Flash Sale Friday | 40% | 24h | Selected | [X] VNĐ | [Y] VNĐ |
| 2 | Valentine's Day | 15% + Gift | 3 ngày | Bundles | [X] VNĐ | [Y] VNĐ |
| 2 | Mid-month Madness | BOGO 50% | 48h | Slow movers | [X] VNĐ | [Y] VNĐ |
| 3 | Spring Collection | 10% | 14 ngày | New arrivals | [X] VNĐ | [Y] VNĐ |
| 3 | Clearance Sale | 50-70% | 7 ngày | Old stock | [X] VNĐ | [Y] VNĐ |

### Loyalty & Referral Programs:

**Loyalty Program Design**:
- Earn 1 point per 1,000 VNĐ spent
- Tiers: Bronze (0-999), Silver (1000-4999), Gold (5000+)
- Benefits per tier: [Liệt kê cụ thể]
- Expected participation: [X]% customers

**Referral Program**:
- Referrer gets: [X] VNĐ credit
- Referee gets: [Y]% off first order
- Target: [Z] referrals/tháng

---

## 🚀 CONVERSION RATE OPTIMIZATION (CRO)

### A. Website Optimization Checklist

#### Homepage:
- [ ] Clear value proposition above the fold
- [ ] Featured products/bestsellers prominently displayed
- [ ] Trust signals: Reviews, ratings, badges
- [ ] Mobile-optimized (>50% traffic là mobile)
- [ ] Page load time <3 seconds

#### Product Pages:
- [ ] High-quality images (5-7 photos + video)
- [ ] Detailed descriptions with benefits (not just features)
- [ ] Customer reviews & ratings visible
- [ ] Clear CTA button (contrasting color)
- [ ] Stock urgency ("Only X left!")
- [ ] Social proof ("Y people viewing this")
- [ ] Size guide/comparison chart
- [ ] Related products section

#### Cart & Checkout:
- [ ] Progress indicator (4 steps → 1 page checkout)
- [ ] Guest checkout option
- [ ] Multiple payment methods (COD, card, e-wallet)
- [ ] Trust badges (SSL, secure payment)
- [ ] Free shipping threshold visible
- [ ] Exit-intent popup (cart abandonment)
- [ ] Save cart for later
- [ ] Mobile-optimized checkout

### B. A/B Testing Roadmap

| Test | Variant A | Variant B | Metric | Expected Lift |
|------|-----------|-----------|--------|---------------|
| CTA Button | "Mua ngay" | "Thêm vào giỏ" | CTR | +5-10% |
| Product Image | Lifestyle | White background | Conversion | +3-5% |
| Pricing Display | 999,000đ | 999.000đ | Conversion | +2-3% |
| Checkout Flow | Multi-step | One-page | Completion | +10-15% |

---

## 📊 GROWTH ROADMAP - TĂNG TRƯỞNG 50% TRONG 6 THÁNG

### 🎯 Phase 1: THÁNG 1-2 (Foundation) - Target: +15% Revenue

#### Quick Wins (Tuần 1-2):
1. **Setup Email Automation** (Impact: +5% revenue)
   - Abandoned cart recovery
   - Welcome series
   - Post-purchase flow
   - **Budget**: 0 VNĐ (sử dụng tools có sẵn)
   - **Timeline**: 1 tuần

2. **Optimize Top 10 Product Pages** (Impact: +3% conversion)
   - Add more images & videos
   - Improve descriptions
   - Add reviews
   - **Budget**: [X] VNĐ (photography)
   - **Timeline**: 1 tuần

3. **Launch First Bundle Offers** (Impact: +10% AOV)
   - Create 3-5 bundles
   - Promote on homepage
   - **Budget**: 0 VNĐ
   - **Timeline**: 3 ngày

#### Growth Initiatives (Tuần 3-8):
4. **Facebook Ads Campaign** (Impact: +20% traffic)
   - Prospecting + Retargeting
   - **Budget**: [X] VNĐ/tháng
   - **Expected ROAS**: 4X
   - **Timeline**: Ongoing

5. **Loyalty Program Launch** (Impact: +8% repeat rate)
   - Design tier structure
   - Integrate with website
   - **Budget**: [Y] VNĐ (setup)
   - **Timeline**: 2 tuần

**Phase 1 KPIs**:
- Revenue: +15% ([X] VNĐ → [Y] VNĐ)
- Orders: +12%
- AOV: +10%
- Conversion: +3%

### 🚀 Phase 2: THÁNG 3-4 (Acceleration) - Target: +20% Revenue

#### Initiatives:
6. **Google Ads Expansion** (Impact: +15% traffic)
7. **Referral Program Launch** (Impact: +10% new customers)
8. **Content Marketing** (Impact: +20% organic traffic)
9. **Influencer Partnerships** (Impact: +25% brand awareness)
10. **One-page Checkout** (Impact: +12% checkout conversion)

**Phase 2 KPIs**:
- Revenue: +20% cumulative
- New customers: +30%
- Organic traffic: +40%

### 🎯 Phase 3: THÁNG 5-6 (Scale & Optimize) - Target: +15% Revenue

#### Initiatives:
11. **TikTok Ads** (Impact: +20% younger audience)
12. **Advanced Segmentation** (Impact: +15% email revenue)
13. **Subscription Model** (Impact: +25% predictable revenue)
14. **Mobile App** (Impact: +30% retention)
15. **Marketplace Expansion** (Shopee, Lazada, Tiki)

**Phase 3 KPIs**:
- Revenue: +50% cumulative (vs tháng 0)
- Customer base: +60%
- Repeat rate: +40%

---

## 📊 KPI DASHBOARD & TRACKING

### Weekly Tracking:
1. **Revenue**: [X] VNĐ (Target: [Y] VNĐ)
2. **Orders**: [X] đơn (Target: [Y] đơn)
3. **AOV**: [X] VNĐ (Target: [Y] VNĐ)
4. **Conversion Rate**: [X]% (Target: [Y]%)
5. **Traffic**: [X] visitors (Target: [Y] visitors)

### Monthly Tracking:
1. **Revenue Growth MoM**: [X]% (Target: +8-10%/tháng)
2. **Customer Acquisition**: [X] khách mới (Target: [Y])
3. **CAC (Customer Acquisition Cost)**: [X] VNĐ (Target: <[Y] VNĐ)
4. **LTV (Lifetime Value)**: [X] VNĐ (Target: >[Y] VNĐ)
5. **LTV:CAC Ratio**: [X]:1 (Target: >3:1)
6. **Repeat Purchase Rate**: [X]% (Target: [Y]%)
7. **Email Revenue %**: [X]% (Target: 20-30%)
8. **Paid Ads ROAS**: [X]X (Target: >4X)

### Quarterly Goals:
- **Revenue**: +[X]% vs quý trước
- **Profit Margin**: [Y]% (Target: [Z]%)
- **Market Share**: [X]% (Target: +[Y]%)
- **Customer Satisfaction**: [X]% (Target: >90%)

---

## 💡 KẾT LUẬN & HÀNH ĐỘNG ƯU TIÊN

### 🎯 Top 5 Priorities (Làm ngay tuần này):
1. **[Action 1]**: [Mô tả + Expected impact]
2. **[Action 2]**: [Mô tả + Expected impact]
3. **[Action 3]**: [Mô tả + Expected impact]
4. **[Action 4]**: [Mô tả + Expected impact]
5. **[Action 5]**: [Mô tả + Expected impact]

### 📈 Revenue Forecast (6 tháng):
- **Tháng 1-2**: [X] VNĐ (+15%)
- **Tháng 3-4**: [Y] VNĐ (+35% cumulative)
- **Tháng 5-6**: [Z] VNĐ (+50% cumulative)
- **Total Additional Revenue**: +[W] VNĐ

### 💰 Investment Required:
- Marketing: [X] VNĐ
- Technology: [Y] VNĐ
- Content: [Z] VNĐ
- **Total**: [W] VNĐ
- **Expected ROI**: [V]X

### ⚠️ Risk Mitigation:
1. **Risk**: [Mô tả] → **Mitigation**: [Giải pháp]
2. **Risk**: [Mô tả] → **Mitigation**: [Giải pháp]

---

⚡ **YÊU CẦU FORMAT:**
- Số liệu CỤ THỂ với đơn vị VNĐ, %, timeline rõ ràng
- Mỗi chiến lược có: Mục tiêu + Cách làm + Budget + Timeline + KPI + Expected ROI
- Ưu tiên ACTIONABLE tactics có thể triển khai ngay
- Độ dài: 1500-2000 từ
- Viết tiếng Việt chuyên nghiệp, dễ hiểu, có cấu trúc
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


class ProcessDocumentRequest(BaseModel):
    """Request model for document processing"""
    file_path: str
    business_id: str
    business_username: str
    file_name: str
    file_type: str
    description: Optional[str] = None


@router.post("/process-document")
async def process_business_document(request: ProcessDocumentRequest):
    """
    Xử lý tài liệu doanh nghiệp và lưu vào ChromaDB collection riêng

    Args:
        request: Thông tin tài liệu cần xử lý

    Returns:
        Dict chứa kết quả xử lý
    """
    try:
        global chroma_client
        if chroma_client is None:
            raise HTTPException(status_code=500, detail="ChromaDB client chưa được khởi tạo")

        # Khởi tạo document processor
        doc_processor = get_document_processor()

        # Extract text content từ file
        print(f"[Document Processing] Processing file: {request.file_path}")
        extracted_text, metadata = doc_processor.extract_text_from_file(
            request.file_path,
            request.file_type
        )

        if not metadata.get("extraction_success", False):
            raise HTTPException(
                status_code=400,
                detail=f"Không thể xử lý tài liệu: {metadata.get('error', 'Unknown error')}"
            )

        # Chuẩn bị metadata cho ChromaDB
        doc_metadata = {
            "data_type": "document",
            "document_id": f"doc_{request.business_id}_{int(datetime.now().timestamp())}",
            "business_id": request.business_id,
            "business_username": request.business_username,
            "file_name": request.file_name,
            "file_type": request.file_type,
            "file_path": request.file_path,
            "description": request.description or "",
            "processed_at": datetime.now().isoformat(),
            "content_length": metadata.get("content_length", 0),
            "extraction_success": True
        }

        # Thêm metadata từ quá trình processing nếu có
        if "sheets" in metadata:
            doc_metadata["excel_sheets"] = json.dumps(metadata["sheets"])
        if "columns" in metadata:
            doc_metadata["csv_columns"] = metadata["columns"]
        if "rows" in metadata:
            doc_metadata["data_rows"] = metadata["rows"]

        # Validate and sanitize metadata
        sanitized_metadata = sanitize_metadata(doc_metadata)

        # Tạo content đầy đủ với extracted text + metadata
        doc_content = f"""
DOCUMENT CONTENT:
{extracted_text}

---
METADATA:
Document ID: {doc_metadata["document_id"]}
Business: {request.business_username}
File Name: {request.file_name}
File Type: {request.file_type}
Description: {request.description or ""}
Processing Status: Success
Content Length: {len(extracted_text)} characters
Processed At: {doc_metadata["processed_at"]}
"""

        # Lưu vào documents collection riêng biệt
        analytics_rag_service = AnalyticsRAGService()
        result = analytics_rag_service.store_business_document(
            document_id=doc_metadata["document_id"],
            document_content=doc_content,
            metadata=sanitized_metadata
        )

        print(f"[Document Processing] Successfully processed and stored document: {doc_metadata['document_id']}")

        return {
            "success": True,
            "document_id": doc_metadata["document_id"],
            "content_length": len(extracted_text),
            "metadata": sanitized_metadata,
            "message": "Tài liệu đã được xử lý và lưu thành công"
        }

    except Exception as e:
        print(f"[Document Processing] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Lỗi xử lý tài liệu: {str(e)}")


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
        spring_base_url = request.spring_service_url or os.getenv('SPRING_SERVICE_URL')
        if not spring_base_url:
            raise HTTPException(status_code=400, detail="SPRING_SERVICE_URL không được cấu hình")
        
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
        # Collection 4: revenue_overview - chứa dữ liệu tổng quan doanh thu và thống kê hệ thống
        # Collection 5: business_documents - chứa tài liệu doanh nghiệp đã xử lý cho RAG
        
        if request.clear_existing:
            print("[Sync] Clearing existing data...")
            try:
                # Xóa các collections cũ
                for collection_name in ["business_data", "orders_analytics", "trends", "revenue_overview", "business_documents"]:
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
                revenue_collection = chroma_client.create_collection(
                    name="revenue_overview",
                    metadata={"description": "Revenue overview and system statistics"}
                )
                documents_collection = chroma_client.create_collection(
                    name="business_documents",
                    metadata={"description": "Business documents for RAG analysis"}
                )
                print("[Sync] Created new collections: business_data, orders_analytics, trends, revenue_overview, business_documents")
                
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
            revenue_collection = chroma_client.get_or_create_collection(
                name="revenue_overview",
                metadata={"description": "Revenue overview and system statistics"}
            )
            documents_collection = chroma_client.get_or_create_collection(
                name="business_documents",
                metadata={"description": "Business documents for RAG analysis"}
            )
            print("[Sync] Collections ready: business_data, orders_analytics, trends, revenue_overview, business_documents")
        
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
                    
                    # Validate and sanitize metadata for ChromaDB compatibility
                    sanitized_metadata = sanitize_metadata(product_metadata)
                    
                    # Lưu vào collection
                    business_collection.upsert(
                        documents=[product_content],
                        metadatas=[sanitized_metadata],
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
                    
                    # Validate and sanitize metadata for ChromaDB compatibility
                    sanitized_order_metadata = sanitize_metadata(order_metadata)
                    
                    # Lưu vào orders_analytics collection
                    orders_collection.upsert(
                        documents=[order_content],
                        metadatas=[sanitized_order_metadata],
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
                    
                    # Validate and sanitize metadata for ChromaDB compatibility
                    sanitized_category_metadata = sanitize_metadata(category_metadata)
                    
                    # Use business_collection directly
                    business_collection.upsert(
                        documents=[category_content],
                        metadatas=[sanitized_category_metadata],
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
                    
                    # Validate and sanitize metadata for ChromaDB compatibility
                    sanitized_business_metadata = sanitize_metadata(business_metadata)
                    
                    # Use business_collection directly
                    business_collection.upsert(
                        documents=[business_content],
                        metadatas=[sanitized_business_metadata],
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
                    
                    # Validate and sanitize metadata for ChromaDB compatibility
                    sanitized_discount_metadata = sanitize_metadata(discount_metadata)
                    
                    # Use business_collection directly
                    business_collection.upsert(
                        documents=[discount_content],
                        metadatas=[sanitized_discount_metadata],
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
                    
                    # Validate and sanitize metadata for ChromaDB compatibility
                    sanitized_user_metadata = sanitize_metadata(user_metadata)
                    
                    business_collection.upsert(
                        documents=[user_content],
                        metadatas=[sanitized_user_metadata],
                        ids=[f"user_{user_id}"]
                    )
                    
                    sync_results["users"]["success"] += 1
                    
                except Exception as e:
                    sync_results["users"]["errors"] += 1
                    error_msg = f"User {user.get('id', 'unknown')}: {str(e)}"
                    sync_results["errors"].append(error_msg)
        
        # Đồng bộ Business Documents (nếu có) - LƯU VÀO COLLECTION RIÊNG BIỆT
        if data.get('businessDocuments'):
            sync_results["documents"] = {"total": len(data['businessDocuments']), "success": 0, "errors": 0}
            print(f"[Sync] Syncing {len(data['businessDocuments'])} business documents...")
            
            # Tạo collection riêng cho documents nếu chưa có
            try:
                documents_collection = chroma_client.get_or_create_collection(
                    name="business_documents",
                    metadata={"description": "Business documents for RAG analysis"}
                )
                print("[Sync] Documents collection ready")
            except Exception as e:
                print(f"[Sync] Error creating documents collection: {e}")
                sync_results["errors"].append(f"Documents collection error: {str(e)}")
                documents_collection = None
            
            for doc in data['businessDocuments']:
                try:
                    doc_id = str(doc.get('id', ''))
                    file_path = doc.get('filePath', '')
                    file_type = doc.get('fileType', '')
                    
                    # Resolve đường dẫn file từ Spring Service
                    resolved_file_path = resolve_spring_file_path(file_path)
                    print(f"[Sync] Original path: {file_path} -> Resolved path: {resolved_file_path}")
                    
                    # Khởi tạo document processor
                    doc_processor = get_document_processor()
                    
                    # Extract text content từ file
                    extracted_text = ""
                    processing_metadata = {}
                    
                    if resolved_file_path and os.path.exists(resolved_file_path):
                        try:
                            extracted_text, processing_metadata = doc_processor.extract_text_from_file(
                                resolved_file_path, file_type
                            )
                            print(f"[Sync] Successfully extracted {len(extracted_text)} characters from {doc.get('fileName', '')}")
                        except Exception as extract_error:
                            print(f"[Sync] Error extracting text from {resolved_file_path}: {extract_error}")
                            # Fallback: tạo content từ metadata
                            extracted_text = f"Error extracting content from file: {str(extract_error)}"
                    else:
                        print(f"[Sync] File not found: {resolved_file_path} (original: {file_path})")
                        extracted_text = "File not found during sync process"
                    
                    # Tạo document content với text đã extract + metadata
                    file_size = doc.get('fileSize')
                    file_size_int = int(file_size) if file_size is not None else 0
                    
                    # Kết hợp extracted text với metadata để tạo content đầy đủ
                    doc_content = f"""
DOCUMENT CONTENT:
{extracted_text}

---
METADATA:
Document ID: {doc.get('id')}
Business: {doc.get('businessUsername', '')}
File Name: {doc.get('fileName', '')}
File Type: {doc.get('fileType', '')}
Description: {doc.get('description', '')}
Size: {file_size_int} bytes
Uploaded: {doc.get('uploadedAt', '')}
Processing Status: {'Success' if processing_metadata.get('extraction_success') else 'Failed'}
Content Length: {len(extracted_text)} characters
"""
                    
                    doc_metadata = {
                        "data_type": "document",
                        "document_id": doc_id,
                        "business_id": str(doc.get('businessId', '')) if doc.get('businessId') else '',
                        "business_username": doc.get('businessUsername', ''),
                        "file_name": doc.get('fileName', ''),
                        "file_type": doc.get('fileType', ''),
                        "file_path_original": doc.get('filePath', ''),  # Đường dẫn gốc từ Spring
                        "file_path_resolved": resolved_file_path or '',  # Đường dẫn đã resolve
                        "file_size": file_size_int,
                        "description": doc.get('description', ''),
                        "uploaded_at": doc.get('uploadedAt', ''),
                        "stored_at": datetime.now().isoformat(),
                        "extraction_success": processing_metadata.get('extraction_success', False),
                        "content_length": len(extracted_text),
                        "processing_timestamp": processing_metadata.get('processing_timestamp', datetime.now().isoformat())
                    }
                    
                    # Thêm metadata từ quá trình processing nếu có
                    if "sheets" in processing_metadata:
                        doc_metadata["excel_sheets"] = json.dumps(processing_metadata["sheets"])
                    if "columns" in processing_metadata:
                        doc_metadata["csv_columns"] = processing_metadata["columns"]
                    if "rows" in processing_metadata:
                        doc_metadata["data_rows"] = processing_metadata["rows"]
                    
                    # Validate and sanitize metadata for ChromaDB compatibility
                    sanitized_doc_metadata = sanitize_metadata(doc_metadata)
                    
                    # Lưu vào collection riêng biệt cho documents
                    if documents_collection:
                        documents_collection.upsert(
                            documents=[doc_content],
                            metadatas=[sanitized_doc_metadata],
                            ids=[f"document_{doc_id}"]
                        )
                        print(f"[Sync] Stored document {doc_id} in separate collection")
                    else:
                        # Fallback: lưu vào business_collection nếu không tạo được collection riêng
                        business_collection.upsert(
                            documents=[doc_content],
                            metadatas=[sanitized_doc_metadata],
                            ids=[f"document_{doc_id}"]
                        )
                        print(f"[Sync] Fallback: Stored document {doc_id} in business collection")
                    
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
        
        # Lưu revenue overview vào ChromaDB để AI có thể truy vấn
        try:
            revenue_content = f"""
Revenue Overview - System Statistics
Total Revenue: {sync_results["revenue_overview"]["total_revenue"]} VND
Monthly Revenue: {sync_results["revenue_overview"]["monthly_revenue"]} VND
Weekly Revenue: {sync_results["revenue_overview"]["weekly_revenue"]} VND
Daily Revenue: {sync_results["revenue_overview"]["daily_revenue"]} VND
Last Updated: {datetime.now().isoformat()}
"""
            
            revenue_metadata = {
                "data_type": "revenue_overview",
                "total_revenue": sync_results["revenue_overview"]["total_revenue"],
                "monthly_revenue": sync_results["revenue_overview"]["monthly_revenue"],
                "weekly_revenue": sync_results["revenue_overview"]["weekly_revenue"],
                "daily_revenue": sync_results["revenue_overview"]["daily_revenue"],
                "stored_at": datetime.now().isoformat(),
                "purpose": "analytics"
            }
            
            # Validate and sanitize metadata
            sanitized_revenue_metadata = sanitize_metadata(revenue_metadata)
            
            revenue_collection.upsert(
                documents=[revenue_content],
                metadatas=[sanitized_revenue_metadata],
                ids=["revenue_overview_system"]
            )
            
            print("[Sync] Stored revenue overview in ChromaDB")
            
        except Exception as e:
            print(f"[Sync] Error storing revenue overview: {str(e)}")
            sync_results["errors"].append(f"Revenue overview storage error: {str(e)}")
        
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


@router.post("/clear-chroma")
async def clear_chroma_data():
    """
    Clear all data from ChromaDB collections
    """
    try:
        print("[ClearChroma] Starting ChromaDB data clearing process...")

        # Get ChromaDB client
        global chroma_client
        if chroma_client is None:
            raise HTTPException(status_code=500, detail="ChromaDB client not initialized")

        # Get all collections
        collections = chroma_client.list_collections()
        print(f"[ClearChroma] Found {len(collections)} collections to clear")

        cleared_collections = []
        errors = []

        for collection in collections:
            try:
                collection_name = collection.name
                print(f"[ClearChroma] Clearing collection: {collection_name}")

                # Delete the entire collection
                chroma_client.delete_collection(name=collection_name)

                cleared_collections.append(collection_name)
                print(f"[ClearChroma] Successfully cleared collection: {collection_name}")

            except Exception as e:
                error_msg = f"Error clearing collection {collection.name}: {str(e)}"
                print(f"[ClearChroma] {error_msg}")
                errors.append(error_msg)

        result = {
            "success": True,
            "cleared_collections": cleared_collections,
            "errors": errors,
            "total_cleared": len(cleared_collections),
            "total_errors": len(errors)
        }

        print(f"[ClearChroma] Clearing completed. Cleared: {len(cleared_collections)}, Errors: {len(errors)}")

        return result

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to clear ChromaDB data: {str(e)}")

