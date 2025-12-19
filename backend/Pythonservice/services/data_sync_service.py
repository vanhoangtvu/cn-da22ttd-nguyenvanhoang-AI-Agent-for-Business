"""
Data Synchronization Service
Handles synchronization of business data from Spring Service
Provides comprehensive analytics data for AI/RAG services
"""
import os
import requests
from typing import Dict, Any, List, Optional
from datetime import datetime
import logging
from fastapi import HTTPException

logger = logging.getLogger(__name__)


class DataSyncService:
    """Service for synchronizing business data from Spring Service"""

    def __init__(self):
        """Initialize data sync service"""
        # Spring Service configuration - Use environment variables for flexibility
        spring_host = os.getenv('SPRING_SERVICE_HOST', '14.183.200.75')
        spring_port = os.getenv('SPRING_SERVICE_PORT', '8089')
        spring_context = os.getenv('SPRING_SERVICE_CONTEXT', '/api/v1')

        # Construct full URL
        self.spring_base_url = f'http://{spring_host}:{spring_port}{spring_context}'
        self.spring_api_key = os.getenv('SPRING_API_KEY', '')

        logger.info(f"[Data Sync Service] Initialized with Spring URL: {self.spring_base_url}")
        self.cache_duration = int(os.getenv('DATA_CACHE_DURATION', '300'))  # 5 minutes default
        self._cached_data = None
        self._cache_timestamp = None

        logger.info(f"[Data Sync Service] Initialized with Spring URL: {self.spring_base_url}")

    def _is_cache_valid(self) -> bool:
        """Check if cached data is still valid"""
        if not self._cache_timestamp:
            return False

        elapsed = (datetime.now() - self._cache_timestamp).total_seconds()
        return elapsed < self.cache_duration

    def _fetch_from_spring_service(self, endpoint: str) -> Dict[str, Any]:
        """Fetch data from Spring Service endpoint"""
        try:
            url = f"{self.spring_base_url}{endpoint}"
            headers = {
                'Content-Type': 'application/json'
            }

            if self.spring_api_key:
                headers['Authorization'] = f'Bearer {self.spring_api_key}'

            logger.info(f"[Data Sync] Fetching from: {url}")
            response = requests.get(url, headers=headers, timeout=30)

            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"[Data Sync] Spring Service returned {response.status_code}: {response.text}")
                raise HTTPException(status_code=502, detail=f"Spring Service error: {response.status_code}")

        except requests.RequestException as e:
            logger.error(f"[Data Sync] Request failed: {str(e)}")
            raise HTTPException(status_code=503, detail=f"Failed to connect to Spring Service: {str(e)}")

    def get_system_analytics_data(self, force_refresh: bool = False) -> Dict[str, Any]:
        """
        Get comprehensive system analytics data
        Includes products, orders, customers, revenue, etc.

        Args:
            force_refresh: Force refresh data from Spring Service

        Returns:
            Dict containing all system analytics data
        """
        # Check cache unless force refresh
        if not force_refresh and self._is_cache_valid() and self._cached_data:
            logger.info("[Data Sync] Returning cached data")
            return self._cached_data

        try:
            logger.info("[Data Sync] Fetching fresh data from Spring Service")

            # Fetch comprehensive analytics data from single endpoint
            analytics_response = self._fetch_from_spring_service('/admin/analytics/system-data')

            # Structure the data to match our expected format
            analytics_data = {
                'timestamp': datetime.now().isoformat(),
                'data_source': 'spring_service',
                'overview': {
                    'total_products': analytics_response.get('totalProducts', 0),
                    'total_orders': analytics_response.get('totalOrders', 0),
                    'total_customers': analytics_response.get('totalCustomers', 0),
                    'total_users': analytics_response.get('totalUsers', 0),
                    'total_revenue': float(analytics_response.get('totalRevenue', 0) or 0),
                    'monthly_revenue': float(analytics_response.get('monthlyRevenue', 0) or 0),
                    'weekly_revenue': float(analytics_response.get('weeklyRevenue', 0) or 0),
                    'daily_revenue': float(analytics_response.get('dailyRevenue', 0) or 0),
                    'last_updated': datetime.now().isoformat()
                },
                'products': {
                    'summary': {
                        'total_products': analytics_response.get('totalProducts', 0),
                        'active_products': analytics_response.get('activeProducts', 0)
                    },
                    'categories': analytics_response.get('categories', []),
                    'top_selling': analytics_response.get('topSellingProducts', []),
                    'low_stock': analytics_response.get('lowStockProducts', []),
                    'all_products': analytics_response.get('products', [])
                },
                'orders': {
                    'summary': {
                        'total_orders': analytics_response.get('totalOrders', 0),
                        'delivered_orders': analytics_response.get('deliveredOrders', 0),
                        'pending_orders': analytics_response.get('pendingOrders', 0)
                    },
                    'recent_orders': analytics_response.get('orders', []),
                    'status_distribution': {
                        'delivered': analytics_response.get('deliveredOrders', 0),
                        'pending': analytics_response.get('pendingOrders', 0),
                        'total': analytics_response.get('totalOrders', 0)
                    },
                    'monthly_trends': []  # Will be calculated from orders data if needed
                },
                'customers': {
                    'summary': {
                        'total_customers': analytics_response.get('totalCustomers', 0),
                        'total_users': analytics_response.get('totalUsers', 0),
                        'total_business_users': analytics_response.get('totalBusinessUsers', 0)
                    },
                    'segments': [],  # Will be calculated from users data if needed
                    'top_customers': [],  # Will be calculated from orders data if needed
                    'retention_rate': 0,  # Will be calculated if needed
                    'all_users': analytics_response.get('users', [])
                },
                'revenue': {
                    'summary': {
                        'total_revenue': float(analytics_response.get('totalRevenue', 0) or 0),
                        'monthly_revenue': float(analytics_response.get('monthlyRevenue', 0) or 0),
                        'weekly_revenue': float(analytics_response.get('weeklyRevenue', 0) or 0),
                        'daily_revenue': float(analytics_response.get('dailyRevenue', 0) or 0)
                    },
                    'monthly_revenue': [],  # Will be calculated from revenue data if available
                    'product_revenue': [],  # Will be calculated from products data
                    'growth_rate': 0,  # Will be calculated if needed
                    'revenue_by_business': analytics_response.get('revenueByBusiness', [])
                },
                'business_performance': analytics_response.get('businessPerformance', []),
                'business_documents': {
                    'total_documents': analytics_response.get('totalDocuments', 0),
                    'documents': analytics_response.get('businessDocuments', [])
                },
                'metadata': {
                    'cache_timestamp': datetime.now().isoformat(),
                    'cache_duration': self.cache_duration,
                    'spring_service_url': self.spring_base_url,
                    'data_freshness': 'fresh' if force_refresh else 'cached'
                }
            }

            # Update cache
            self._cached_data = analytics_data
            self._cache_timestamp = datetime.now()

            logger.info("[Data Sync] Successfully synchronized data from Spring Service")
            return analytics_data

        except Exception as e:
            logger.error(f"[Data Sync] Failed to sync data: {str(e)}")

            # Return cached data if available, even if stale
            if self._cached_data:
                logger.warning("[Data Sync] Returning stale cached data due to sync failure")
                self._cached_data['metadata']['data_freshness'] = 'stale'
                return self._cached_data

            # If no cached data, raise error
            raise HTTPException(status_code=503, detail=f"Failed to sync data from Spring Service: {str(e)}")

    def get_data_health_status(self) -> Dict[str, Any]:
        """
        Get health status of data synchronization

        Returns:
            Dict with health status information
        """
        try:
            # Test connection to Spring Service
            response = requests.get(f"{self.spring_base_url}/health", timeout=10)
            spring_healthy = response.status_code == 200

        except:
            spring_healthy = False

        cache_age = None
        if self._cache_timestamp:
            cache_age = (datetime.now() - self._cache_timestamp).total_seconds()

        return {
            'spring_service': {
                'healthy': spring_healthy,
                'url': self.spring_base_url
            },
            'cache': {
                'has_data': self._cached_data is not None,
                'age_seconds': cache_age,
                'is_valid': self._is_cache_valid()
            },
            'last_sync': self._cache_timestamp.isoformat() if self._cache_timestamp else None
        }

    def sync_user_data_manually(self, sample_users: List[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Manually sync sample user data to ChromaDB for testing
        
        Args:
            sample_users: List of sample user data
            
        Returns:
            Dict with sync results
        """
        try:
            from services.chat_ai_rag_chroma_service import get_chat_ai_rag_service
            chroma_service = get_chat_ai_rag_service()
            
            # Default sample users based on user's example
            if sample_users is None:
                sample_users = [
                    {
                        "id": 5,
                        "username": "Nguyen van Hoang",
                        "email": "customer@ai.com",
                        "role": "CUSTOMER",
                        "accountStatus": "ACTIVE",
                        "address": "12 Phan Xích Long, Phú Nhuận, TP.HCM",
                        "phoneNumber": "0900000003"
                    },
                    {
                        "id": 6,
                        "username": "Nguyen Van A",
                        "email": "nguyenvana@example.com",
                        "role": "CUSTOMER", 
                        "accountStatus": "ACTIVE",
                        "address": "123 Nguyen Trai, District 1, HCMC",
                        "phoneNumber": "0900000001"
                    },
                    {
                        "id": 7,
                        "username": "Tran Thi B",
                        "email": "tranthib@example.com", 
                        "role": "CUSTOMER",
                        "accountStatus": "ACTIVE",
                        "address": "456 Le Lai, District 3, HCMC",
                        "phoneNumber": "0900000002"
                    }
                ]
            
            synced_users = 0
            failed_users = 0
            
            for user in sample_users:
                try:
                    user_id = str(user.get('id', ''))
                    if not user_id:
                        continue
                    
                    # Prepare complete user data for ChromaDB with ALL fields
                    user_data = {
                        'name': user.get('username', ''),
                        'email': user.get('email', ''),
                        'role': user.get('role', ''),
                        'account_status': user.get('accountStatus', ''),
                        'address': user.get('address', ''),
                        'phone': user.get('phoneNumber', ''),
                        'phone_number': user.get('phoneNumber', ''),
                        'user_id': user_id,
                        'full_info': {
                            'id': user.get('id'),
                            'username': user.get('username', ''),
                            'email': user.get('email', ''),
                            'role': user.get('role', ''),
                            'account_status': user.get('accountStatus', ''),
                            'address': user.get('address', ''),
                            'phone_number': user.get('phoneNumber', '')
                        },
                        'preferences': {
                            'account_status': user.get('accountStatus', ''),
                            'role': user.get('role', ''),
                            'notifications': True
                        }
                    }
                    
                    # Store to ChromaDB
                    success = chroma_service.store_user_data(f"user_{user_id}", user_data)
                    
                    if success:
                        synced_users += 1
                        logger.info(f"[Data Sync] Manually synced user {user_id}: {user.get('username', '')}")
                    else:
                        failed_users += 1
                        logger.error(f"[Data Sync] Failed to sync user {user_id}")
                        
                except Exception as e:
                    failed_users += 1
                    logger.error(f"[Data Sync] Error syncing user {user.get('id', 'unknown')}: {str(e)}")
            
            return {
                'success': True,
                'total_users': len(sample_users),
                'synced_users': synced_users,
                'failed_users': failed_users,
                'timestamp': datetime.now().isoformat(),
                'method': 'manual_sync'
            }
            
        except Exception as e:
            logger.error(f"[Data Sync] Manual user sync failed: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'timestamp': datetime.now().isoformat(),
                'method': 'manual_sync'
            }


# Global service instance
_data_sync_service = None


def get_data_sync_service() -> DataSyncService:
    """Get or create data sync service instance"""
    global _data_sync_service
    if _data_sync_service is None:
        _data_sync_service = DataSyncService()
    return _data_sync_service