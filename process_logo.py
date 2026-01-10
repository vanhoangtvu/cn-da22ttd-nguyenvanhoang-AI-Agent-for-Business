from PIL import Image

def remove_black_background(input_path, output_path):
    img = Image.open(input_path).convert("RGBA")
    datas = img.getdata()
    
    newData = []
    # Quét từng pixel
    for item in datas:
        # item là (R, G, B, A)
        # Nếu màu gần đen (R, G, B đều nhỏ hơn 30), cho trong suốt
        if item[0] < 30 and item[1] < 30 and item[2] < 30:
            newData.append((0, 0, 0, 0))  # Trong suốt hoàn toàn
        else:
            # Giữ nguyên but đảm bảo độ trong suốt mượt ở viền
            newData.append(item)
            
    img.putdata(newData)
    img.save(output_path, "PNG")
    print(f"Processed image saved to {output_path}")

if __name__ == "__main__":
    input_file = "/home/hv/.gemini/antigravity/brain/38539ba8-a6bd-4798-926d-74d4a4e1e355/agentbiz_logo_black_bg_1768045448130.png"
    output_file = "/home/hv/DuAn/CSN/AI-Agent-for-Business/frontend/public/logo.png"
    
    remove_black_background(input_file, output_file)
    
    # Copy luôn làm favicon
    import shutil
    shutil.copy(output_file, "/home/hv/DuAn/CSN/AI-Agent-for-Business/frontend/src/app/icon.png")
