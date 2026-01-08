#!/usr/bin/env python3
"""
Test script to verify product specifications in ChromaDB
After running sync, this script checks if specs are properly stored
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.chat_ai_rag_chroma_service import get_chat_ai_rag_service

def test_product_specs():
    """Test if product specs are properly stored in ChromaDB"""
    
    print("\n" + "="*80)
    print("TESTING PRODUCT SPECIFICATIONS IN CHROMADB")
    print("="*80 + "\n")
    
    # Get Chroma service
    chroma_service = get_chat_ai_rag_service()
    
    # Get product collection
    try:
        product_collection = chroma_service._get_or_create_product_collection()
        total_products = product_collection.count()
        print(f"✅ Found {total_products} products in chat_ai_products collection\n")
        
        if total_products == 0:
            print("❌ No products found. Please run sync first:")
            print("   POST http://localhost:5000/api/admin-chat/sync-system-data")
            return
        
        # Get iPhone 15 Pro Max (product_id = 1)
        print("🔍 Testing with iPhone 15 Pro Max (ID: 1)...")
        print("-" * 80)
        
        result = product_collection.get(ids=["product_1"])
        
        if not result or not result.get('documents'):
            print("❌ iPhone 15 Pro Max not found in ChromaDB")
            return
        
        document = result['documents'][0]
        metadata = result['metadatas'][0] if result.get('metadatas') else {}
        
        print("\n📄 DOCUMENT TEXT (first 1000 chars):")
        print("-" * 80)
        print(document[:1000])
        print("...")
        
        print("\n\n📋 METADATA:")
        print("-" * 80)
        for key, value in metadata.items():
            if key != 'full_product_data':  # Skip full data for readability
                print(f"  {key}: {value}")
        
        print("\n\n🔎 CHECKING FOR KEY SPECIFICATIONS:")
        print("-" * 80)
        
        specs_to_check = [
            ("=== THÔNG SỐ KỸ THUẬT ===", "Specifications section"),
            ("Chip/CPU:", "Processor info"),
            ("Màn hình:", "Display info"),
            ("Camera:", "Camera info"),
            ("Pin:", "Battery info"),
            ("Kết nối:", "Connectivity info"),
            ("Tính năng nổi bật:", "Features info"),
            ("Thương hiệu:", "Brand info"),
            ("Bảo hành:", "Warranty info")
        ]
        
        found_count = 0
        missing_specs = []
        
        for spec_text, spec_name in specs_to_check:
            if spec_text in document:
                print(f"  ✅ {spec_name}")
                found_count += 1
            else:
                print(f"  ❌ {spec_name} - MISSING!")
                missing_specs.append(spec_name)
        
        print("\n" + "="*80)
        print(f"RESULTS: {found_count}/{len(specs_to_check)} specifications found")
        print("="*80)
        
        if found_count == len(specs_to_check):
            print("\n🎉 SUCCESS! All specifications are properly stored!")
            print("\nℹ️  AI should now be able to display full specs when asked")
            print("   Test query: 'thông số chi tiết iPhone 15 Pro Max'")
        else:
            print("\n⚠️  WARNING: Some specifications are missing!")
            print(f"   Missing: {', '.join(missing_specs)}")
            print("\n💡 Solution: Re-sync products to apply the new format:")
            print("   POST http://localhost:5000/api/admin-chat/sync-system-data")
        
        print("\n")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_product_specs()
