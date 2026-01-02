import matplotlib.pyplot as plt
import numpy as np
import os

def generate_chart():
    # Data
    models = ['Groq', 'Gemini Pro']
    times = [1.8, 4.2]
    colors = ['#4F46E5', '#DB4437']  # Indigo for Groq, Red for Gemini

    # Create figure
    plt.figure(figsize=(8, 6))
    bars = plt.bar(models, times, color=colors, width=0.5)

    # Add labels and title
    plt.title('So sánh Thời gian Phản hồi (AI Response Time)', fontsize=14, fontweight='bold')
    plt.xlabel('AI Model', fontsize=12)
    plt.ylabel('Thời gian (Giây)', fontsize=12)
    plt.ylim(0, 5.5)

    # Add value labels on top of bars
    for bar in bars:
        height = bar.get_height()
        plt.text(bar.get_x() + bar.get_width()/2., height + 0.1,
                 f'{height}s',
                 ha='center', va='bottom', fontsize=12, fontweight='bold')

    # Add logic difference annotation
    plt.text(0.5, 4.8, f'Gemini chậm hơn ~{times[1]/times[0]:.1f}x\nnhưng phân tích sâu hơn', 
             ha='center', fontsize=11, style='italic',
             bbox=dict(facecolor='yellow', alpha=0.2))

    # Save
    output_path = 'latency_comparison.png'
    plt.savefig(output_path, dpi=300, bbox_inches='tight')
    print(f"Chart saved to {os.path.abspath(output_path)}")

if __name__ == "__main__":
    try:
        generate_chart()
    except Exception as e:
        print(f"Error generating chart: {e}")
