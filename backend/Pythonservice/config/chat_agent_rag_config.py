"""
RAG Configuration for Chat Agent
Cấu hình RAG cho Agent Chat - định nghĩa các prompt, context window, embedding settings
"""

from typing import Optional, List
from dataclasses import dataclass, field

@dataclass
class ChatAgentRAGConfig:
    """
    Cấu hình RAG cho Chat Agent
    Quản lý context, embedding model, vector database settings
    """
    
    # === BASIC CONFIG ===
    agent_name: str = "Agent Chat"
    description: str = "AI Agent for intelligent chatting with context awareness"
    version: str = "1.0.0"
    
    # === EMBEDDING CONFIG ===
    embedding_model: str = "all-MiniLM-L6-v2"  # Model embedding mặc định
    embedding_dimension: int = 384  # Số chiều embedding
    
    # === VECTOR DATABASE CONFIG ===
    vector_db_type: str = "chroma"  # Loại vector database
    vector_db_collection: str = "chat_agent_context"  # Collection name trong Chroma
    vector_db_persist_dir: str = "./chroma_chat_agent"  # Thư mục lưu trữ
    
    # === CONTEXT WINDOW CONFIG ===
    max_context_messages: int = 10  # Số lượng tin nhắn tối đa để lấy context
    max_context_tokens: int = 4096  # Giới hạn tokens cho context
    context_chunk_size: int = 512  # Kích thước chunk khi chia nhỏ context
    context_chunk_overlap: int = 50  # Overlap giữa các chunks
    
    # === RETRIEVAL CONFIG ===
    retrieval_top_k: int = 5  # Số lượng kết quả retrieval tối đa
    similarity_threshold: float = 0.5  # Ngưỡng độ tương tự để lấy context
    retrieval_type: str = "similarity"  # Loại retrieval: similarity, mmr, or hybrid
    
    # === RAG PROMPT TEMPLATES ===
    system_prompt_template: str = """Bạn là một AI Agent thông minh, hỗ trợ người dùng với các câu hỏi và yêu cầu.
Sử dụng các thông tin sau đây nếu có liên quan:

CONTEXT:
{context}

Hãy trả lời một cách rõ ràng, hữu ích và chính xác."""
    
    user_prompt_template: str = "Câu hỏi: {question}"
    
    # === GROQ MODEL CONFIG ===
    groq_model: str = "openai/gpt-oss-20b"  # Model Groq mặc định
    groq_temperature: float = 0.7  # Nhiệt độ cho model
    groq_max_tokens: int = 1024  # Token tối đa cho response
    groq_top_p: float = 0.9  # Top-p sampling
    
    # === SESSION MANAGEMENT ===
    session_ttl: int = 3600  # Time-to-live cho session (giây)
    max_sessions_per_user: int = 50  # Số lượng session tối đa cho mỗi user
    
    # === ENABLE/DISABLE FEATURES ===
    enable_context_retrieval: bool = True  # Bật retrieval context
    enable_conversation_memory: bool = True  # Bật lưu trữ conversation
    enable_user_profiling: bool = True  # Bật profiling user
    enable_sentiment_analysis: bool = False  # Bật phân tích cảm xúc
    
    # === SECURITY CONFIG ===
    max_input_length: int = 2000  # Độ dài input tối đa
    require_auth: bool = True  # Yêu cầu xác thực
    enable_rate_limiting: bool = True  # Bật rate limiting
    rate_limit_per_minute: int = 30  # Giới hạn requests per minute
    
    # === LOGGING CONFIG ===
    enable_logging: bool = True  # Bật logging
    log_level: str = "INFO"  # Mức độ logging
    log_file: str = "./logs/chat_agent_rag.log"  # File log
    
    # === CUSTOM KEYWORDS ===
    stop_words: List[str] = field(default_factory=lambda: [])  # Stop words
    domain_specific_terms: List[str] = field(default_factory=lambda: [])  # Thuật ngữ chuyên ngành
    
    def get_system_prompt(self, context: str = "") -> str:
        """Lấy system prompt đã format"""
        return self.system_prompt_template.format(context=context)
    
    def get_user_prompt(self, question: str) -> str:
        """Lấy user prompt đã format"""
        return self.user_prompt_template.format(question=question)
    
    def to_dict(self) -> dict:
        """Convert config to dictionary"""
        return {
            'agent_name': self.agent_name,
            'embedding_model': self.embedding_model,
            'vector_db_collection': self.vector_db_collection,
            'max_context_messages': self.max_context_messages,
            'retrieval_top_k': self.retrieval_top_k,
            'groq_model': self.groq_model,
            'groq_temperature': self.groq_temperature,
            'session_ttl': self.session_ttl,
        }


# === DEFAULT CONFIGS ===
DEFAULT_CHAT_AGENT_RAG_CONFIG = ChatAgentRAGConfig()

# === DIFFERENT PROFILES ===
PRODUCTION_CONFIG = ChatAgentRAGConfig(
    groq_temperature=0.5,
    retrieval_top_k=3,
    enable_rate_limiting=True,
    rate_limit_per_minute=20,
)

DEVELOPMENT_CONFIG = ChatAgentRAGConfig(
    groq_temperature=0.8,
    retrieval_top_k=10,
    enable_logging=True,
    log_level="DEBUG",
)

TESTING_CONFIG = ChatAgentRAGConfig(
    groq_temperature=0.7,
    retrieval_top_k=5,
    session_ttl=300,  # 5 minutes cho testing
    enable_rate_limiting=False,
)


def get_config(profile: str = "default") -> ChatAgentRAGConfig:
    """
    Lấy config theo profile
    
    Args:
        profile: 'default', 'production', 'development', 'testing'
        
    Returns:
        ChatAgentRAGConfig instance
    """
    configs = {
        'default': DEFAULT_CHAT_AGENT_RAG_CONFIG,
        'production': PRODUCTION_CONFIG,
        'development': DEVELOPMENT_CONFIG,
        'testing': TESTING_CONFIG,
    }
    return configs.get(profile, DEFAULT_CHAT_AGENT_RAG_CONFIG)
