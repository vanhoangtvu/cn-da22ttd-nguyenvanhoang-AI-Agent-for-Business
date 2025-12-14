package com.business.springservice.config;

import com.business.springservice.entity.*;
import com.business.springservice.entity.Discount.DiscountType;
import com.business.springservice.enums.OrderStatus;
import com.business.springservice.enums.Role;
import com.business.springservice.enums.Status;
import com.business.springservice.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final DiscountRepository discountRepository;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (userRepository.count() == 0) {
            log.info("Initializing default users...");
            
            // Admin user
            User admin = new User();
            admin.setUsername("admin");
            admin.setEmail("admin@ai.com");
            admin.setPassword(passwordEncoder.encode("hoang123"));
            admin.setRole(Role.ADMIN);
            admin.setAddress("123 Lê Lợi, Q1, TP.HCM");
            admin.setPhoneNumber("0900000001");
            userRepository.save(admin);
            
            // Business users
            User business1 = new User();
            business1.setUsername("business");
            business1.setEmail("business@ai.com");
            business1.setPassword(passwordEncoder.encode("hoang123"));
            business1.setRole(Role.BUSINESS);
            business1.setAddress("456 Nguyễn Huệ, Q1, TP.HCM");
            business1.setPhoneNumber("0900000002");
            userRepository.save(business1);
            
            User business2 = new User();
            business2.setUsername("techstore");
            business2.setEmail("techstore@ai.com");
            business2.setPassword(passwordEncoder.encode("hoang123"));
            business2.setRole(Role.BUSINESS);
            business2.setAddress("789 Trần Hưng Đạo, Q5, TP.HCM");
            business2.setPhoneNumber("0900000004");
            userRepository.save(business2);
            
            User business3 = new User();
            business3.setUsername("gadgetshop");
            business3.setEmail("gadgetshop@ai.com");
            business3.setPassword(passwordEncoder.encode("hoang123"));
            business3.setRole(Role.BUSINESS);
            business3.setAddress("321 Lý Thường Kiệt, Q10, TP.HCM");
            business3.setPhoneNumber("0900000005");
            userRepository.save(business3);
            
            // Customer users
            User customer1 = new User();
            customer1.setUsername("customer");
            customer1.setEmail("customer@ai.com");
            customer1.setPassword(passwordEncoder.encode("hoang123"));
            customer1.setRole(Role.CUSTOMER);
            customer1.setAddress("12 Phan Xích Long, Phú Nhuận, TP.HCM");
            customer1.setPhoneNumber("0900000003");
            userRepository.save(customer1);
            
            User customer2 = new User();
            customer2.setUsername("nguyenvana");
            customer2.setEmail("nguyenvana@gmail.com");
            customer2.setPassword(passwordEncoder.encode("hoang123"));
            customer2.setRole(Role.CUSTOMER);
            customer2.setAddress("45 Võ Văn Tần, Q3, TP.HCM");
            customer2.setPhoneNumber("0912345678");
            userRepository.save(customer2);
            
            User customer3 = new User();
            customer3.setUsername("tranthib");
            customer3.setEmail("tranthib@gmail.com");
            customer3.setPassword(passwordEncoder.encode("hoang123"));
            customer3.setRole(Role.CUSTOMER);
            customer3.setAddress("78 Cách Mạng Tháng 8, Q10, TP.HCM");
            customer3.setPhoneNumber("0923456789");
            userRepository.save(customer3);
            
            User customer4 = new User();
            customer4.setUsername("levand");
            customer4.setEmail("levand@gmail.com");
            customer4.setPassword(passwordEncoder.encode("hoang123"));
            customer4.setRole(Role.CUSTOMER);
            customer4.setAddress("99 Hoàng Văn Thụ, Tân Bình, TP.HCM");
            customer4.setPhoneNumber("0934567890");
            userRepository.save(customer4);
            
            log.info("Default users created successfully!");
            log.info("=== ADMIN ACCOUNT ===");
            log.info("Admin - username: admin, email: admin@ai.com, password: hoang123");
            log.info("=== BUSINESS ACCOUNTS ===");
            log.info("Business 1 - username: business, email: business@ai.com, password: hoang123");
            log.info("Business 2 - username: techstore, email: techstore@ai.com, password: hoang123");
            log.info("Business 3 - username: gadgetshop, email: gadgetshop@ai.com, password: hoang123");
            log.info("=== CUSTOMER ACCOUNTS ===");
            log.info("Customer 1 - username: customer, email: customer@ai.com, password: hoang123");
            log.info("Customer 2 - username: nguyenvana, email: nguyenvana@gmail.com, password: hoang123");
            log.info("Customer 3 - username: tranthib, email: tranthib@gmail.com, password: hoang123");
            log.info("Customer 4 - username: levand, email: levand@gmail.com, password: hoang123");
            
            // Initialize categories and products for multiple businesses
            Product[] popularProducts = initializeCategoriesAndProducts(business1);
            initializeAdditionalProducts(business2);
            initializeMoreProducts(business3);
            
            // Initialize discount codes
            initializeDiscounts(admin, business1, business2, business3);
            
            // Initialize sample orders for revenue testing
            initializeSampleOrders(customer1, customer2, customer3, customer4, popularProducts);
        } else {
            log.info("Users already exist, skipping initialization.");
        }
    }
    
    private Product[] initializeCategoriesAndProducts(User seller) {
        Product[] products = new Product[7];
        if (categoryRepository.count() == 0) {
            log.info("Initializing default categories and products...");
            
            // Category 1: Điện thoại
            Category phoneCategory = new Category();
            phoneCategory.setName("Điện thoại");
            phoneCategory.setDescription("Điện thoại thông minh các loại");
            phoneCategory.setImageUrl("https://images.unsplash.com/photo-1511707171634-5f897ff02aa9");
            phoneCategory.setStatus(Status.ACTIVE);
            phoneCategory = categoryRepository.save(phoneCategory);
            
            // Products for Điện thoại
            Product iphone15 = new Product();
            iphone15.setName("iPhone 15 Pro Max");
            iphone15.setDescription("iPhone 15 Pro Max 256GB - Thiết kế Titan, chip A17 Pro mạnh mẽ");
            iphone15.setPrice(new BigDecimal("29990000"));
            iphone15.setQuantity(50);
            iphone15.setImageUrls("[\"https://images.unsplash.com/photo-1696446702798-8c0b5f7da85c\",\"https://images.unsplash.com/photo-1695048133142-1a20484d2569\"]");
            iphone15.setDetails("{\"brand\":\"Apple\",\"model\":\"iPhone 15 Pro Max\",\"storage\":\"256GB\",\"color\":\"Titan Tự Nhiên\",\"display\":{\"size\":\"6.7 inch\",\"type\":\"Super Retina XDR OLED\",\"resolution\":\"2796 x 1290\"},\"processor\":\"Apple A17 Pro\",\"camera\":{\"main\":\"48MP\",\"ultra_wide\":\"12MP\",\"telephoto\":\"12MP\",\"front\":\"12MP\"},\"battery\":\"4422mAh\",\"os\":\"iOS 17\",\"connectivity\":[\"5G\",\"Wi-Fi 6E\",\"Bluetooth 5.3\"],\"features\":[\"Face ID\",\"Chống nước IP68\",\"MagSafe\",\"Wireless Charging\"],\"warranty\":\"12 tháng chính hãng\",\"origin\":\"Chính hãng VN/A\"}");
            iphone15.setCategory(phoneCategory);
            iphone15.setSeller(seller);
            iphone15.setStatus(Status.ACTIVE);
            products[0] = productRepository.save(iphone15);
            
            Product samsung = new Product();
            samsung.setName("Samsung Galaxy S24 Ultra");
            samsung.setDescription("Galaxy S24 Ultra 512GB - Màn hình Dynamic AMOLED 2X, S Pen tích hợp");
            samsung.setPrice(new BigDecimal("27990000"));
            samsung.setQuantity(30);
            samsung.setImageUrls("[\"https://images.unsplash.com/photo-1610945415295-d9bbf067e59c\",\"https://images.unsplash.com/photo-1598327105666-5b89351aff97\"]");
            samsung.setDetails("{\"brand\":\"Samsung\",\"model\":\"Galaxy S24 Ultra\",\"storage\":\"512GB\",\"color\":\"Titanium Gray\",\"display\":{\"size\":\"6.8 inch\",\"type\":\"Dynamic AMOLED 2X\",\"resolution\":\"3120 x 1440\",\"refresh_rate\":\"120Hz\"},\"processor\":\"Snapdragon 8 Gen 3\",\"ram\":\"12GB\",\"camera\":{\"main\":\"200MP\",\"ultra_wide\":\"12MP\",\"telephoto1\":\"10MP\",\"telephoto2\":\"50MP\",\"front\":\"12MP\"},\"battery\":\"5000mAh\",\"os\":\"Android 14, One UI 6.1\",\"connectivity\":[\"5G\",\"Wi-Fi 7\",\"Bluetooth 5.3\"],\"features\":[\"S Pen\",\"IP68\",\"Wireless Charging\",\"Reverse Charging\"],\"warranty\":\"12 tháng chính hãng\",\"origin\":\"Chính hãng Việt Nam\"}");
            samsung.setCategory(phoneCategory);
            samsung.setSeller(seller);
            samsung.setStatus(Status.ACTIVE);
            products[1] = productRepository.save(samsung);
            
            // Category 2: Laptop
            Category laptopCategory = new Category();
            laptopCategory.setName("Laptop");
            laptopCategory.setDescription("Laptop cho công việc và giải trí");
            laptopCategory.setImageUrl("https://images.unsplash.com/photo-1496181133206-80ce9b88a853");
            laptopCategory.setStatus(Status.ACTIVE);
            laptopCategory = categoryRepository.save(laptopCategory);
            
            // Products for Laptop
            Product macbook = new Product();
            macbook.setName("MacBook Pro 14 inch M3");
            macbook.setDescription("MacBook Pro 14 inch M3 Pro 18GB 512GB - Hiệu năng vượt trội");
            macbook.setPrice(new BigDecimal("52990000"));
            macbook.setQuantity(20);
            macbook.setImageUrls("[\"https://images.unsplash.com/photo-1517336714731-489689fd1ca8\",\"https://images.unsplash.com/photo-1611186871348-b1ce696e52c9\"]");
            macbook.setDetails("{\"brand\":\"Apple\",\"model\":\"MacBook Pro 14\",\"processor\":\"Apple M3 Pro\",\"ram\":\"18GB\",\"storage\":\"512GB SSD\",\"display\":{\"size\":\"14.2 inch\",\"type\":\"Liquid Retina XDR\",\"resolution\":\"3024 x 1964\",\"brightness\":\"1600 nits\"},\"graphics\":\"11-core GPU\",\"ports\":[\"3x Thunderbolt 4\",\"HDMI\",\"MagSafe 3\",\"3.5mm audio\"],\"battery\":\"70Wh - 18 giờ\",\"os\":\"macOS Sonoma\",\"connectivity\":[\"Wi-Fi 6E\",\"Bluetooth 5.3\"],\"features\":[\"Touch ID\",\"Magic Keyboard\",\"Force Touch trackpad\"],\"weight\":\"1.61kg\",\"warranty\":\"12 tháng chính hãng Apple\",\"origin\":\"Chính hãng VN/A\"}");
            macbook.setCategory(laptopCategory);
            macbook.setSeller(seller);
            macbook.setStatus(Status.ACTIVE);
            products[2] = productRepository.save(macbook);
            
            Product dell = new Product();
            dell.setName("Dell XPS 15");
            dell.setDescription("Dell XPS 15 - Intel Core i7, 16GB RAM, 512GB SSD, RTX 4050");
            dell.setPrice(new BigDecimal("35990000"));
            dell.setQuantity(15);
            dell.setImageUrls("[\"https://images.unsplash.com/photo-1593642632823-8f785ba67e45\",\"https://images.unsplash.com/photo-1588872657578-7efd1f1555ed\"]");
            dell.setDetails("{\"brand\":\"Dell\",\"model\":\"XPS 15 9530\",\"processor\":\"Intel Core i7-13700H\",\"ram\":\"16GB DDR5\",\"storage\":\"512GB NVMe SSD\",\"display\":{\"size\":\"15.6 inch\",\"type\":\"InfinityEdge Touch\",\"resolution\":\"3456 x 2160\",\"brightness\":\"500 nits\"},\"graphics\":\"NVIDIA RTX 4050 6GB\",\"ports\":[\"2x Thunderbolt 4\",\"USB-C 3.2\",\"3.5mm audio\",\"microSD\"],\"battery\":\"86Wh - 10-12 giờ\",\"os\":\"Windows 11 Home\",\"connectivity\":[\"Wi-Fi 6E\",\"Bluetooth 5.2\"],\"features\":[\"Windows Hello\",\"Precision Trackpad\",\"Bàn phím có đèn nền\"],\"weight\":\"2.05kg\",\"warranty\":\"24 tháng chính hãng Dell\",\"origin\":\"Chính hãng Việt Nam\"}");
            dell.setCategory(laptopCategory);
            dell.setSeller(seller);
            dell.setStatus(Status.ACTIVE);
            products[3] = productRepository.save(dell);
            
            // Category 3: Tai nghe
            Category headphoneCategory = new Category();
            headphoneCategory.setName("Tai nghe");
            headphoneCategory.setDescription("Tai nghe chất lượng cao");
            headphoneCategory.setImageUrl("https://images.unsplash.com/photo-1505740420928-5e560c06d30e");
            headphoneCategory.setStatus(Status.ACTIVE);
            headphoneCategory = categoryRepository.save(headphoneCategory);
            
            // Products for Tai nghe
            Product airpods = new Product();
            airpods.setName("AirPods Pro 2");
            airpods.setDescription("AirPods Pro 2 - Chống ồn chủ động, âm thanh không gian");
            airpods.setPrice(new BigDecimal("6490000"));
            airpods.setQuantity(100);
            airpods.setImageUrls("[\"https://images.unsplash.com/photo-1606841837239-c5a1a4a07af7\",\"https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1\"]");
            airpods.setDetails("{\"brand\":\"Apple\",\"model\":\"AirPods Pro 2nd Gen\",\"type\":\"True Wireless\",\"anc\":\"Active Noise Cancellation\",\"transparency_mode\":true,\"drivers\":\"Custom Apple drivers\",\"battery\":{\"earbuds\":\"6 giờ\",\"case\":\"30 giờ\",\"quick_charge\":\"5 phút = 1 giờ\"},\"connectivity\":[\"Bluetooth 5.3\",\"H2 chip\"],\"controls\":[\"Touch controls\",\"Siri\"],\"features\":[\"Spatial Audio\",\"Adaptive EQ\",\"Find My\",\"MagSafe\"],\"water_resistance\":\"IPX4\",\"compatibility\":\"iOS 16+\",\"warranty\":\"12 tháng chính hãng Apple\",\"origin\":\"Chính hãng VN/A\"}");
            airpods.setCategory(headphoneCategory);
            airpods.setSeller(seller);
            airpods.setStatus(Status.ACTIVE);
            products[4] = productRepository.save(airpods);
            
            Product sony = new Product();
            sony.setName("Sony WH-1000XM5");
            sony.setDescription("Sony WH-1000XM5 - Tai nghe chống ồn hàng đầu, pin 30 giờ");
            sony.setPrice(new BigDecimal("8990000"));
            sony.setQuantity(40);
            sony.setImageUrls("[\"https://images.unsplash.com/photo-1545127398-14699f92334b\",\"https://images.unsplash.com/photo-1484704849700-f032a568e944\"]");
            sony.setDetails("{\"brand\":\"Sony\",\"model\":\"WH-1000XM5\",\"type\":\"Over-Ear\",\"anc\":\"Industry Leading ANC\",\"drivers\":\"30mm\",\"frequency_response\":\"4Hz-40kHz\",\"battery\":{\"anc_on\":\"30 giờ\",\"anc_off\":\"40 giờ\",\"quick_charge\":\"3 phút = 3 giờ\"},\"connectivity\":[\"Bluetooth 5.2\",\"LDAC\",\"NFC\"],\"controls\":[\"Touch controls\",\"Google Assistant\",\"Alexa\"],\"features\":[\"360 Reality Audio\",\"Speak-to-Chat\",\"Adaptive Sound Control\"],\"weight\":\"250g\",\"foldable\":true,\"warranty\":\"12 tháng chính hãng Sony\",\"origin\":\"Nhập khẩu chính hãng\"}");
            sony.setCategory(headphoneCategory);
            sony.setSeller(seller);
            sony.setStatus(Status.ACTIVE);
            products[5] = productRepository.save(sony);
            
            // Category 4: Đồng hồ thông minh (INACTIVE - để test)
            Category smartwatchCategory = new Category();
            smartwatchCategory.setName("Đồng hồ thông minh");
            smartwatchCategory.setDescription("Smartwatch theo dõi sức khỏe");
            smartwatchCategory.setImageUrl("https://images.unsplash.com/photo-1579586337278-3befd40fd17a");
            smartwatchCategory.setStatus(Status.INACTIVE);
            smartwatchCategory = categoryRepository.save(smartwatchCategory);
            
            // Product for Đồng hồ (sẽ không hiển thị trong shop vì category INACTIVE)
            Product appleWatch = new Product();
            appleWatch.setName("Apple Watch Series 9");
            appleWatch.setDescription("Apple Watch Series 9 - GPS, 45mm, viền nhôm");
            appleWatch.setPrice(new BigDecimal("10990000"));
            appleWatch.setQuantity(25);
            appleWatch.setImageUrls("[\"https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d\"]");
            appleWatch.setDetails("{\"brand\":\"Apple\",\"model\":\"Apple Watch Series 9\",\"size\":\"45mm\",\"case_material\":\"Aluminum\",\"display\":{\"type\":\"Always-On Retina LTPO OLED\",\"size\":\"1.9 inch\",\"resolution\":\"484 x 396\",\"brightness\":\"2000 nits\"},\"processor\":\"S9 SiP\",\"storage\":\"64GB\",\"connectivity\":[\"GPS\",\"Wi-Fi\",\"Bluetooth 5.3\"],\"sensors\":[\"Heart Rate\",\"Blood Oxygen\",\"ECG\",\"Temperature\"],\"battery\":\"18 giờ\",\"water_resistance\":\"50m\",\"features\":[\"Siri\",\"Apple Pay\",\"Family Setup\"],\"compatibility\":\"iPhone 8 trở lên\",\"warranty\":\"12 tháng chính hãng Apple\",\"origin\":\"Chính hãng VN/A\"}");
            appleWatch.setCategory(smartwatchCategory);
            appleWatch.setSeller(seller);
            appleWatch.setStatus(Status.ACTIVE);
            productRepository.save(appleWatch);
            
            log.info("Default categories and products created successfully!");
            log.info("- 3 ACTIVE categories with 6 ACTIVE products");
            log.info("- 1 INACTIVE category with 1 product (for testing)");
        } else {
            log.info("Categories already exist, skipping initialization.");
        }
        return products;
    }
    
    private void initializeAdditionalProducts(User seller) {
        log.info("Initializing additional products for " + seller.getUsername() + "...");
        
        // Lấy categories đã có
        Category phoneCategory = categoryRepository.findByName("Điện thoại").orElse(null);
        Category laptopCategory = categoryRepository.findByName("Laptop").orElse(null);
        Category headphoneCategory = categoryRepository.findByName("Tai nghe").orElse(null);
        
        if (phoneCategory != null) {
            // Điện thoại giá cao
            Product xiaomi = new Product();
            xiaomi.setName("Xiaomi 14 Ultra");
            xiaomi.setDescription("Xiaomi 14 Ultra - Camera Leica, Snapdragon 8 Gen 3");
            xiaomi.setPrice(new BigDecimal("24990000"));
            xiaomi.setQuantity(40);
            xiaomi.setImageUrls("[\"https://images.unsplash.com/photo-1598327105666-5b89351aff97\"]");
            xiaomi.setDetails("{\"brand\":\"Xiaomi\",\"model\":\"14 Ultra\",\"storage\":\"512GB\",\"color\":\"Titanium Black\",\"display\":{\"size\":\"6.73 inch\",\"type\":\"LTPO AMOLED\",\"resolution\":\"3200 x 1440\",\"refresh_rate\":\"120Hz\"},\"processor\":\"Snapdragon 8 Gen 3\",\"ram\":\"16GB\",\"camera\":{\"main\":\"50MP Leica\",\"ultra_wide\":\"50MP\",\"telephoto\":\"50MP\",\"front\":\"32MP\"},\"battery\":\"5300mAh\",\"charging\":\"90W wired, 80W wireless\",\"os\":\"MIUI 15, Android 14\",\"connectivity\":[\"5G\",\"Wi-Fi 7\",\"Bluetooth 5.4\"],\"features\":[\"IP68\",\"Wireless charging\",\"Reverse charging\"],\"warranty\":\"18 tháng chính hãng\",\"origin\":\"Chính hãng Việt Nam\"}");
            xiaomi.setCategory(phoneCategory);
            xiaomi.setSeller(seller);
            xiaomi.setStatus(Status.ACTIVE);
            productRepository.save(xiaomi);
            
            Product oppo = new Product();
            oppo.setName("OPPO Find X7 Pro");
            oppo.setDescription("OPPO Find X7 Pro - Màn hình 120Hz, sạc nhanh 100W");
            oppo.setPrice(new BigDecimal("22990000"));
            oppo.setQuantity(35);
            oppo.setImageUrls("[\"https://images.unsplash.com/photo-1511707171634-5f897ff02aa9\"]");
            oppo.setDetails("{\"brand\":\"OPPO\",\"model\":\"Find X7 Pro\",\"storage\":\"256GB\",\"color\":\"Ocean Blue\",\"display\":{\"size\":\"6.82 inch\",\"type\":\"LTPO AMOLED\",\"resolution\":\"3168 x 1440\",\"refresh_rate\":\"120Hz\"},\"processor\":\"Dimensity 9300\",\"ram\":\"12GB\",\"camera\":{\"main\":\"50MP\",\"ultra_wide\":\"50MP\",\"telephoto\":\"64MP periscope\",\"front\":\"32MP\"},\"battery\":\"5400mAh\",\"charging\":\"100W SuperVOOC\",\"os\":\"ColorOS 14, Android 14\",\"connectivity\":[\"5G\",\"Wi-Fi 6E\",\"Bluetooth 5.4\"],\"features\":[\"IP68\",\"Hasselblad camera\",\"Ultra-thin design\"],\"warranty\":\"12 tháng chính hãng\",\"origin\":\"Chính hãng Việt Nam\"}");
            oppo.setCategory(phoneCategory);
            oppo.setSeller(seller);
            oppo.setStatus(Status.ACTIVE);
            productRepository.save(oppo);
            
            // Điện thoại giá trung
            Product oneplus = new Product();
            oneplus.setName("OnePlus 12");
            oneplus.setDescription("OnePlus 12 - Snapdragon 8 Gen 3, sạc siêu nhanh 100W");
            oneplus.setPrice(new BigDecimal("18990000"));
            oneplus.setQuantity(50);
            oneplus.setImageUrls("[\"https://images.unsplash.com/photo-1598327105666-5b89351aff97\"]");
            oneplus.setCategory(phoneCategory);
            oneplus.setSeller(seller);
            oneplus.setStatus(Status.ACTIVE);
            productRepository.save(oneplus);
            
            Product google = new Product();
            google.setName("Google Pixel 8 Pro");
            google.setDescription("Google Pixel 8 Pro - Camera AI tuyệt đỉnh, Android thuần");
            google.setPrice(new BigDecimal("21990000"));
            google.setQuantity(30);
            google.setImageUrls("[\"https://images.unsplash.com/photo-1598327105666-5b89351aff97\"]");
            google.setDetails("{\"brand\":\"Google\",\"model\":\"Pixel 8 Pro\",\"storage\":\"256GB\",\"color\":\"Obsidian\",\"display\":{\"size\":\"6.7 inch\",\"type\":\"LTPO OLED\",\"resolution\":\"2992 x 1344\",\"refresh_rate\":\"120Hz\"},\"processor\":\"Google Tensor G3\",\"ram\":\"12GB\",\"camera\":{\"main\":\"50MP\",\"ultra_wide\":\"48MP\",\"telephoto\":\"48MP\",\"front\":\"10.5MP\"},\"battery\":\"5050mAh\",\"charging\":\"30W wired, 23W wireless\",\"os\":\"Android 14\",\"connectivity\":[\"5G\",\"Wi-Fi 6E\",\"Bluetooth 5.3\"],\"features\":[\"Magic Eraser\",\"Live Translate\",\"IP68\"],\"warranty\":\"12 tháng chính hãng\",\"origin\":\"Chính hãng Việt Nam\"}");
            google.setCategory(phoneCategory);
            google.setSeller(seller);
            google.setStatus(Status.ACTIVE);
            productRepository.save(google);
        }
        
        if (laptopCategory != null) {
            // Laptop gaming cao cấp
            Product asus = new Product();
            asus.setName("ASUS ROG Zephyrus G14");
            asus.setDescription("ASUS ROG G14 - Ryzen 9, RTX 4060, 16GB RAM");
            asus.setPrice(new BigDecimal("42990000"));
            asus.setQuantity(12);
            asus.setImageUrls("[\"https://images.unsplash.com/photo-1603302576837-37561b2e2302\"]");
            asus.setDetails("{\"brand\":\"ASUS\",\"model\":\"ROG Zephyrus G14\",\"processor\":\"AMD Ryzen 9 7940HS\",\"ram\":\"16GB DDR5\",\"storage\":\"1TB NVMe SSD\",\"display\":{\"size\":\"14 inch\",\"type\":\"IPS\",\"resolution\":\"2560 x 1600\",\"refresh_rate\":\"165Hz\"},\"graphics\":\"NVIDIA RTX 4060 8GB\",\"ports\":[\"2x USB-C\",\"2x USB-A\",\"HDMI 2.1\",\"3.5mm\"],\"battery\":\"76Wh - 8-10 giờ\",\"os\":\"Windows 11 Pro\",\"connectivity\":[\"Wi-Fi 6E\",\"Bluetooth 5.3\"],\"features\":[\"AniMe Matrix Display\",\"Dolby Atmos\",\"Gaming Mode\"],\"weight\":\"1.65kg\",\"warranty\":\"24 tháng chính hãng ASUS\",\"origin\":\"Chính hãng Việt Nam\"}");
            asus.setCategory(laptopCategory);
            asus.setSeller(seller);
            asus.setStatus(Status.ACTIVE);
            productRepository.save(asus);
            
            Product lenovo = new Product();
            lenovo.setName("Lenovo Legion 5 Pro");
            lenovo.setDescription("Lenovo Legion 5 Pro - Intel i7, RTX 4070, 32GB RAM");
            lenovo.setPrice(new BigDecimal("38990000"));
            lenovo.setQuantity(18);
            lenovo.setImageUrls("[\"https://images.unsplash.com/photo-1588872657578-7efd1f1555ed\"]");
            lenovo.setDetails("{\"brand\":\"Lenovo\",\"model\":\"Legion 5 Pro\",\"processor\":\"Intel Core i7-13700HX\",\"ram\":\"32GB DDR5\",\"storage\":\"1TB NVMe SSD\",\"display\":{\"size\":\"16 inch\",\"type\":\"IPS\",\"resolution\":\"2560 x 1600\",\"refresh_rate\":\"165Hz\"},\"graphics\":\"NVIDIA RTX 4070 8GB\",\"ports\":[\"4x USB-A\",\"2x USB-C\",\"HDMI 2.1\",\"RJ45\"],\"battery\":\"80Wh - 6-8 giờ\",\"os\":\"Windows 11 Home\",\"connectivity\":[\"Wi-Fi 6E\",\"Bluetooth 5.2\"],\"features\":[\"Legion Coldfront\",\"RGB Keyboard\",\"TrueStrike\"],\"weight\":\"2.5kg\",\"warranty\":\"24 tháng chính hãng Lenovo\",\"origin\":\"Chính hãng Việt Nam\"}");
            lenovo.setCategory(laptopCategory);
            lenovo.setSeller(seller);
            lenovo.setStatus(Status.ACTIVE);
            productRepository.save(lenovo);
            
            // Laptop văn phòng giá rẻ
            Product asusVivobook = new Product();
            asusVivobook.setName("ASUS Vivobook 15");
            asusVivobook.setDescription("ASUS Vivobook 15 - Intel i3, 8GB RAM, 256GB SSD");
            asusVivobook.setPrice(new BigDecimal("12990000"));
            asusVivobook.setQuantity(45);
            asusVivobook.setImageUrls("[\"https://images.unsplash.com/photo-1496181133206-80ce9b88a853\"]");
            asusVivobook.setCategory(laptopCategory);
            asusVivobook.setSeller(seller);
            asusVivobook.setStatus(Status.ACTIVE);
            productRepository.save(asusVivobook);
            
            Product hpProbook = new Product();
            hpProbook.setName("HP ProBook 450 G10");
            hpProbook.setDescription("HP ProBook 450 - Intel i5, 8GB RAM, bảo mật cao");
            hpProbook.setPrice(new BigDecimal("15990000"));
            hpProbook.setQuantity(38);
            hpProbook.setImageUrls("[\"https://images.unsplash.com/photo-1496181133206-80ce9b88a853\"]");
            hpProbook.setDetails("{\"brand\":\"HP\",\"model\":\"ProBook 450 G10\",\"processor\":\"Intel Core i5-1335U\",\"ram\":\"8GB DDR4\",\"storage\":\"512GB NVMe SSD\",\"display\":{\"size\":\"15.6 inch\",\"type\":\"IPS\",\"resolution\":\"1920 x 1080\",\"anti_glare\":true},\"graphics\":\"Intel Iris Xe\",\"ports\":[\"2x USB-A\",\"2x USB-C\",\"HDMI\",\"RJ45\",\"3.5mm\"],\"battery\":\"47.36Wh - 8-10 giờ\",\"os\":\"Windows 11 Pro\",\"connectivity\":[\"Wi-Fi 6\",\"Bluetooth 5.3\"],\"features\":[\"Fingerprint Reader\",\"TPM 2.0\",\"HD Webcam\"],\"weight\":\"1.79kg\",\"warranty\":\"12 tháng chính hãng HP\",\"origin\":\"Chính hãng Việt Nam\"}");
            hpProbook.setCategory(laptopCategory);
            hpProbook.setSeller(seller);
            hpProbook.setStatus(Status.ACTIVE);
            productRepository.save(hpProbook);
        }
        
        if (headphoneCategory != null) {
            // Tai nghe giá rẻ
            Product jbl = new Product();
            jbl.setName("JBL Tune 760NC");
            jbl.setDescription("JBL Tune 760NC - Chống ồn chủ động, pin 35 giờ");
            jbl.setPrice(new BigDecimal("2990000"));
            jbl.setQuantity(60);
            jbl.setImageUrls("[\"https://images.unsplash.com/photo-1545127398-14699f92334b\"]");
            jbl.setDetails("{\"brand\":\"JBL\",\"model\":\"Tune 760NC\",\"type\":\"Over-Ear\",\"anc\":\"Active Noise Cancelling\",\"drivers\":\"40mm\",\"frequency_response\":\"20Hz-20kHz\",\"battery\":{\"anc_on\":\"35 giờ\",\"anc_off\":\"50 giờ\",\"quick_charge\":\"5 phút = 2 giờ\"},\"connectivity\":[\"Bluetooth 5.0\",\"3.5mm cable\"],\"controls\":[\"Touch controls\",\"Voice Assistant\"],\"features\":[\"JBL Pure Bass\",\"Multi-point connection\"],\"weight\":\"220g\",\"foldable\":true,\"warranty\":\"12 tháng chính hãng\",\"origin\":\"Nhập khẩu chính hãng\"}");
            jbl.setCategory(headphoneCategory);
            jbl.setSeller(seller);
            jbl.setStatus(Status.ACTIVE);
            productRepository.save(jbl);
            
            Product anker = new Product();
            anker.setName("Anker Soundcore Q30");
            anker.setDescription("Anker Q30 - Chống ồn ANC, pin 40 giờ, giá tốt");
            anker.setPrice(new BigDecimal("1990000"));
            anker.setQuantity(80);
            anker.setImageUrls("[\"https://images.unsplash.com/photo-1545127398-14699f92334b\"]");
            anker.setDetails("{\"brand\":\"Anker\",\"model\":\"Soundcore Life Q30\",\"type\":\"Over-Ear\",\"anc\":\"Hybrid ANC\",\"drivers\":\"40mm\",\"frequency_response\":\"16Hz-40kHz\",\"battery\":{\"anc_on\":\"40 giờ\",\"anc_off\":\"60 giờ\",\"quick_charge\":\"5 phút = 4 giờ\"},\"connectivity\":[\"Bluetooth 5.0\",\"3.5mm cable\",\"USB-C\"],\"controls\":[\"Physical buttons\"],\"features\":[\"BassUp Technology\",\"3 EQ modes\",\"Travel case\"],\"weight\":\"260g\",\"foldable\":true,\"warranty\":\"18 tháng chính hãng\",\"origin\":\"Nhập khẩu chính hãng\"}");
            anker.setCategory(headphoneCategory);
            anker.setSeller(seller);
            anker.setStatus(Status.ACTIVE);
            productRepository.save(anker);
            
            // Tai nghe true wireless
            Product jabra = new Product();
            jabra.setName("Jabra Elite 85t");
            jabra.setDescription("Jabra Elite 85t - True wireless, chống ồn tốt");
            jabra.setPrice(new BigDecimal("4990000"));
            jabra.setQuantity(50);
            jabra.setImageUrls("[\"https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1\"]");
            jabra.setCategory(headphoneCategory);
            jabra.setSeller(seller);
            jabra.setStatus(Status.ACTIVE);
            productRepository.save(jabra);
        }
        
        log.info("Additional products created for " + seller.getUsername());
    }
    
    private void initializeMoreProducts(User seller) {
        log.info("Initializing more products for " + seller.getUsername() + "...");
        
        // Lấy categories đã có
        Category phoneCategory = categoryRepository.findByName("Điện thoại").orElse(null);
        Category laptopCategory = categoryRepository.findByName("Laptop").orElse(null);
        Category headphoneCategory = categoryRepository.findByName("Tai nghe").orElse(null);
        
        if (phoneCategory != null) {
            // Điện thoại flagship
            Product vivo = new Product();
            vivo.setName("Vivo X100 Pro");
            vivo.setDescription("Vivo X100 Pro - Camera ZEISS, MediaTek Dimensity 9300");
            vivo.setPrice(new BigDecimal("21990000"));
            vivo.setQuantity(25);
            vivo.setImageUrls("[\"https://images.unsplash.com/photo-1598327105666-5b89351aff97\"]");
            vivo.setDetails("{\"brand\":\"Vivo\",\"model\":\"X100 Pro\",\"storage\":\"256GB\",\"color\":\"Asteroid Black\",\"display\":{\"size\":\"6.78 inch\",\"type\":\"LTPO AMOLED\",\"resolution\":\"2800 x 1260\",\"refresh_rate\":\"120Hz\"},\"processor\":\"MediaTek Dimensity 9300\",\"ram\":\"12GB\",\"camera\":{\"main\":\"50MP ZEISS\",\"ultra_wide\":\"50MP\",\"telephoto\":\"64MP periscope\",\"front\":\"32MP\"},\"battery\":\"5400mAh\",\"charging\":\"100W wired, 50W wireless\",\"os\":\"Funtouch OS 14, Android 14\",\"connectivity\":[\"5G\",\"Wi-Fi 7\",\"Bluetooth 5.4\"],\"features\":[\"ZEISS optics\",\"V3 imaging chip\",\"IP68\"],\"warranty\":\"12 tháng chính hãng\",\"origin\":\"Chính hãng Việt Nam\"}");
            vivo.setCategory(phoneCategory);
            vivo.setSeller(seller);
            vivo.setStatus(Status.ACTIVE);
            productRepository.save(vivo);
            
            // Điện thoại tầm trung
            Product realme = new Product();
            realme.setName("Realme GT 5 Pro");
            realme.setDescription("Realme GT 5 Pro - Snapdragon 8 Gen 3, sạc 100W");
            realme.setPrice(new BigDecimal("16990000"));
            realme.setQuantity(45);
            realme.setImageUrls("[\"https://images.unsplash.com/photo-1511707171634-5f897ff02aa9\"]");
            realme.setDetails("{\"brand\":\"Realme\",\"model\":\"GT 5 Pro\",\"storage\":\"256GB\",\"color\":\"Racing Yellow\",\"display\":{\"size\":\"6.78 inch\",\"type\":\"LTPO AMOLED\",\"resolution\":\"2780 x 1264\",\"refresh_rate\":\"144Hz\"},\"processor\":\"Snapdragon 8 Gen 3\",\"ram\":\"12GB\",\"camera\":{\"main\":\"50MP\",\"ultra_wide\":\"8MP\",\"telephoto\":\"50MP\",\"front\":\"32MP\"},\"battery\":\"5400mAh\",\"charging\":\"100W SuperDart\",\"os\":\"Realme UI 5.0, Android 14\",\"connectivity\":[\"5G\",\"Wi-Fi 6E\",\"Bluetooth 5.4\"],\"features\":[\"Gaming focused\",\"Vapor cooling\",\"RGB lighting\"],\"warranty\":\"12 tháng chính hãng\",\"origin\":\"Chính hãng Việt Nam\"}");
            realme.setCategory(phoneCategory);
            realme.setSeller(seller);
            realme.setStatus(Status.ACTIVE);
            productRepository.save(realme);
            
            Product nothing = new Product();
            nothing.setName("Nothing Phone (2)");
            nothing.setDescription("Nothing Phone (2) - Thiết kế độc đáo, Glyph Interface");
            nothing.setPrice(new BigDecimal("11990000"));
            nothing.setQuantity(55);
            nothing.setImageUrls("[\"https://images.unsplash.com/photo-1511707171634-5f897ff02aa9\"]");
            nothing.setDetails("{\"brand\":\"Nothing\",\"model\":\"Phone (2)\",\"storage\":\"256GB\",\"color\":\"White\",\"display\":{\"size\":\"6.7 inch\",\"type\":\"LTPO OLED\",\"resolution\":\"2412 x 1080\",\"refresh_rate\":\"120Hz\"},\"processor\":\"Snapdragon 8+ Gen 1\",\"ram\":\"12GB\",\"camera\":{\"main\":\"50MP\",\"ultra_wide\":\"50MP\",\"front\":\"32MP\"},\"battery\":\"4700mAh\",\"charging\":\"45W wired, 15W wireless\",\"os\":\"Nothing OS 2.0, Android 13\",\"connectivity\":[\"5G\",\"Wi-Fi 6E\",\"Bluetooth 5.3\"],\"features\":[\"Glyph Interface\",\"Unique design\",\"Transparent back\"],\"warranty\":\"12 tháng chính hãng\",\"origin\":\"Nhập khẩu chính hãng\"}");
            nothing.setCategory(phoneCategory);
            nothing.setSeller(seller);
            nothing.setStatus(Status.ACTIVE);
            productRepository.save(nothing);
            
            // Điện thoại giá rẻ
            Product samsung_a = new Product();
            samsung_a.setName("Samsung Galaxy A54");
            samsung_a.setDescription("Samsung A54 - Màn hình 120Hz, camera 50MP, pin 5000mAh");
            samsung_a.setPrice(new BigDecimal("9990000"));
            samsung_a.setQuantity(70);
            samsung_a.setImageUrls("[\"https://images.unsplash.com/photo-1610945415295-d9bbf067e59c\"]");
            samsung_a.setDetails("{\"brand\":\"Samsung\",\"model\":\"Galaxy A54 5G\",\"storage\":\"128GB\",\"color\":\"Awesome Violet\",\"display\":{\"size\":\"6.4 inch\",\"type\":\"Super AMOLED\",\"resolution\":\"2340 x 1080\",\"refresh_rate\":\"120Hz\"},\"processor\":\"Exynos 1380\",\"ram\":\"8GB\",\"camera\":{\"main\":\"50MP OIS\",\"ultra_wide\":\"12MP\",\"macro\":\"5MP\",\"front\":\"32MP\"},\"battery\":\"5000mAh\",\"charging\":\"25W wired\",\"os\":\"One UI 5.1, Android 13\",\"connectivity\":[\"5G\",\"Wi-Fi 6\",\"Bluetooth 5.3\"],\"features\":[\"IP67\",\"Knox Security\",\"Samsung Pay\"],\"warranty\":\"12 tháng chính hãng Samsung\",\"origin\":\"Chính hãng Việt Nam\"}");
            samsung_a.setCategory(phoneCategory);
            samsung_a.setSeller(seller);
            samsung_a.setStatus(Status.ACTIVE);
            productRepository.save(samsung_a);
            
            Product redmi = new Product();
            redmi.setName("Redmi Note 13 Pro");
            redmi.setDescription("Redmi Note 13 Pro - Snapdragon 7s Gen 2, camera 200MP");
            redmi.setPrice(new BigDecimal("7990000"));
            redmi.setQuantity(85);
            redmi.setImageUrls("[\"https://images.unsplash.com/photo-1598327105666-5b89351aff97\"]");
            redmi.setDetails("{\"brand\":\"Xiaomi\",\"model\":\"Redmi Note 13 Pro\",\"storage\":\"256GB\",\"color\":\"Aurora Purple\",\"display\":{\"size\":\"6.67 inch\",\"type\":\"AMOLED\",\"resolution\":\"2712 x 1220\",\"refresh_rate\":\"120Hz\"},\"processor\":\"Snapdragon 7s Gen 2\",\"ram\":\"8GB\",\"camera\":{\"main\":\"200MP\",\"ultra_wide\":\"8MP\",\"macro\":\"2MP\",\"front\":\"16MP\"},\"battery\":\"5100mAh\",\"charging\":\"67W wired\",\"os\":\"MIUI 14, Android 13\",\"connectivity\":[\"5G\",\"Wi-Fi 6\",\"Bluetooth 5.2\"],\"features\":[\"IP54\",\"Ultra-high pixel\",\"Fast charging\"],\"warranty\":\"18 tháng chính hãng\",\"origin\":\"Chính hãng Việt Nam\"}");
            redmi.setCategory(phoneCategory);
            redmi.setSeller(seller);
            redmi.setStatus(Status.ACTIVE);
            productRepository.save(redmi);
        }
        
        if (laptopCategory != null) {
            // Laptop cao cấp
            Product hp = new Product();
            hp.setName("HP Pavilion 15");
            hp.setDescription("HP Pavilion 15 - Intel i5, 16GB RAM, 512GB SSD");
            hp.setPrice(new BigDecimal("18990000"));
            hp.setQuantity(30);
            hp.setImageUrls("[\"https://images.unsplash.com/photo-1496181133206-80ce9b88a853\"]");
            hp.setDetails("{\"brand\":\"HP\",\"model\":\"Pavilion 15-eh3000\",\"processor\":\"Intel Core i5-1235U\",\"ram\":\"16GB DDR4\",\"storage\":\"512GB NVMe SSD\",\"display\":{\"size\":\"15.6 inch\",\"type\":\"IPS\",\"resolution\":\"1920 x 1080\",\"brightness\":\"300 nits\"},\"graphics\":\"Intel Iris Xe\",\"ports\":[\"2x USB-A\",\"1x USB-C\",\"HDMI\",\"3.5mm\",\"SD card\"],\"battery\":\"41Wh - 7-9 giờ\",\"os\":\"Windows 11 Home\",\"connectivity\":[\"Wi-Fi 6\",\"Bluetooth 5.2\"],\"features\":[\"Bàn phím có đèn nền\",\"Bang & Olufsen Audio\"],\"weight\":\"1.75kg\",\"warranty\":\"12 tháng chính hãng HP\",\"origin\":\"Chính hãng Việt Nam\"}");
            hp.setCategory(laptopCategory);
            hp.setSeller(seller);
            hp.setStatus(Status.ACTIVE);
            productRepository.save(hp);
            
            Product acer = new Product();
            acer.setName("Acer Swift 3");
            acer.setDescription("Acer Swift 3 - Ryzen 7, 16GB RAM, nhẹ chỉ 1.2kg");
            acer.setPrice(new BigDecimal("19990000"));
            acer.setQuantity(22);
            acer.setImageUrls("[\"https://images.unsplash.com/photo-1593642632823-8f785ba67e45\"]");
            acer.setDetails("{\"brand\":\"Acer\",\"model\":\"Swift 3 SF314-43\",\"processor\":\"AMD Ryzen 7 5700U\",\"ram\":\"16GB LPDDR4X\",\"storage\":\"512GB NVMe SSD\",\"display\":{\"size\":\"14 inch\",\"type\":\"IPS\",\"resolution\":\"1920 x 1080\",\"color_gamut\":\"100% sRGB\"},\"graphics\":\"AMD Radeon Graphics\",\"ports\":[\"1x USB-A\",\"2x USB-C\",\"HDMI\",\"3.5mm\"],\"battery\":\"56Wh - 12-14 giờ\",\"os\":\"Windows 11 Home\",\"connectivity\":[\"Wi-Fi 6\",\"Bluetooth 5.2\"],\"features\":[\"Ultra-thin design\",\"Fingerprint reader\"],\"weight\":\"1.2kg\",\"warranty\":\"24 tháng chính hãng Acer\",\"origin\":\"Chính hãng Việt Nam\"}");
            acer.setCategory(laptopCategory);
            acer.setSeller(seller);
            acer.setStatus(Status.ACTIVE);
            productRepository.save(acer);
            
            // Laptop giá tốt
            Product lenovoIdea = new Product();
            lenovoIdea.setName("Lenovo IdeaPad 3");
            lenovoIdea.setDescription("Lenovo IdeaPad 3 - Intel i3, 8GB RAM, phù hợp học tập");
            lenovoIdea.setPrice(new BigDecimal("11990000"));
            lenovoIdea.setQuantity(50);
            lenovoIdea.setImageUrls("[\"https://images.unsplash.com/photo-1588872657578-7efd1f1555ed\"]");
            lenovoIdea.setDetails("{\"brand\":\"Lenovo\",\"model\":\"IdeaPad 3 15ITL6\",\"processor\":\"Intel Core i3-1115G4\",\"ram\":\"8GB DDR4\",\"storage\":\"256GB NVMe SSD\",\"display\":{\"size\":\"15.6 inch\",\"type\":\"TN\",\"resolution\":\"1920 x 1080\",\"anti_glare\":true},\"graphics\":\"Intel UHD Graphics\",\"ports\":[\"2x USB-A\",\"1x USB-C\",\"HDMI\",\"3.5mm\",\"SD card\"],\"battery\":\"45Wh - 6-8 giờ\",\"os\":\"Windows 11 Home\",\"connectivity\":[\"Wi-Fi 6\",\"Bluetooth 5.1\"],\"features\":[\"Numeric keypad\",\"Privacy shutter\"],\"weight\":\"1.65kg\",\"warranty\":\"12 tháng chính hãng Lenovo\",\"origin\":\"Chính hãng Việt Nam\"}");
            lenovoIdea.setCategory(laptopCategory);
            lenovoIdea.setSeller(seller);
            lenovoIdea.setStatus(Status.ACTIVE);
            productRepository.save(lenovoIdea);
            
            Product acerAspire = new Product();
            acerAspire.setName("Acer Aspire 5");
            acerAspire.setDescription("Acer Aspire 5 - Ryzen 5, 8GB RAM, giá sinh viên");
            acerAspire.setPrice(new BigDecimal("13990000"));
            acerAspire.setQuantity(42);
            acerAspire.setImageUrls("[\"https://images.unsplash.com/photo-1593642632823-8f785ba67e45\"]");
            acerAspire.setDetails("{\"brand\":\"Acer\",\"model\":\"Aspire 5 A515-57\",\"processor\":\"AMD Ryzen 5 5500U\",\"ram\":\"8GB DDR4\",\"storage\":\"512GB NVMe SSD\",\"display\":{\"size\":\"15.6 inch\",\"type\":\"IPS\",\"resolution\":\"1920 x 1080\",\"brightness\":\"250 nits\"},\"graphics\":\"AMD Radeon Graphics\",\"ports\":[\"2x USB-A\",\"1x USB-C\",\"HDMI\",\"RJ45\",\"3.5mm\"],\"battery\":\"48Wh - 7-9 giờ\",\"os\":\"Windows 11 Home\",\"connectivity\":[\"Wi-Fi 6\",\"Bluetooth 5.1\"],\"features\":[\"Numeric keypad\",\"Acer BlueLightShield\"],\"weight\":\"1.7kg\",\"warranty\":\"12 tháng chính hãng Acer\",\"origin\":\"Chính hãng Việt Nam\"}");
            acerAspire.setCategory(laptopCategory);
            acerAspire.setSeller(seller);
            acerAspire.setStatus(Status.ACTIVE);
            productRepository.save(acerAspire);
        }
        
        if (headphoneCategory != null) {
            // Tai nghe cao cấp
            Product bose = new Product();
            bose.setName("Bose QuietComfort Ultra");
            bose.setDescription("Bose QC Ultra - Chống ồn cao cấp, âm thanh đỉnh cao");
            bose.setPrice(new BigDecimal("9990000"));
            bose.setQuantity(28);
            bose.setImageUrls("[\"https://images.unsplash.com/photo-1505740420928-5e560c06d30e\"]");
            bose.setCategory(headphoneCategory);
            bose.setSeller(seller);
            bose.setStatus(Status.ACTIVE);
            productRepository.save(bose);
            
            Product sennheiser = new Product();
            sennheiser.setName("Sennheiser Momentum 4");
            sennheiser.setDescription("Sennheiser Momentum 4 - Âm thanh Hi-Fi, pin 60 giờ");
            sennheiser.setPrice(new BigDecimal("7990000"));
            sennheiser.setQuantity(32);
            sennheiser.setImageUrls("[\"https://images.unsplash.com/photo-1484704849700-f032a568e944\"]");
            sennheiser.setDetails("{\"brand\":\"Sennheiser\",\"model\":\"Momentum 4 Wireless\",\"type\":\"Over-Ear\",\"anc\":\"Adaptive Noise Cancellation\",\"drivers\":\"42mm transducer\",\"frequency_response\":\"6Hz-22kHz\",\"battery\":{\"anc_on\":\"60 giờ\",\"quick_charge\":\"10 phút = 6 giờ\"},\"connectivity\":[\"Bluetooth 5.2\",\"aptX Adaptive\",\"3.5mm\"],\"controls\":[\"Touch controls\",\"Smart Pause\"],\"features\":[\"Audiophile sound\",\"Smart Control App\",\"Sound Personalization\"],\"weight\":\"293g\",\"foldable\":true,\"warranty\":\"24 tháng chính hãng Sennheiser\",\"origin\":\"Nhập khẩu chính hãng\"}");
            sennheiser.setCategory(headphoneCategory);
            sennheiser.setSeller(seller);
            sennheiser.setStatus(Status.ACTIVE);
            productRepository.save(sennheiser);
            
            // Tai nghe tầm trung
            Product sonyWF = new Product();
            sonyWF.setName("Sony WF-1000XM4");
            sonyWF.setDescription("Sony WF-1000XM4 - True wireless, LDAC, chống ồn tốt");
            sonyWF.setPrice(new BigDecimal("5990000"));
            sonyWF.setQuantity(45);
            sonyWF.setImageUrls("[\"https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1\"]");
            sonyWF.setDetails("{\"brand\":\"Sony\",\"model\":\"WF-1000XM4\",\"type\":\"True Wireless\",\"anc\":\"Industry Leading ANC\",\"drivers\":\"6mm\",\"frequency_response\":\"20Hz-20kHz\",\"battery\":{\"earbuds\":\"8 giờ\",\"case\":\"24 giờ\",\"quick_charge\":\"5 phút = 60 phút\"},\"connectivity\":[\"Bluetooth 5.2\",\"LDAC\",\"SBC\",\"AAC\"],\"controls\":[\"Touch controls\",\"Speak-to-Chat\"],\"features\":[\"360 Reality Audio\",\"Adaptive Sound Control\",\"IPX4\"],\"case_type\":\"Compact charging case\",\"warranty\":\"12 tháng chính hãng Sony\",\"origin\":\"Nhập khẩu chính hãng\"}");
            sonyWF.setCategory(headphoneCategory);
            sonyWF.setSeller(seller);
            sonyWF.setStatus(Status.ACTIVE);
            productRepository.save(sonyWF);
            
            Product edifier = new Product();
            edifier.setName("Edifier W820NB");
            edifier.setDescription("Edifier W820NB - Chống ồn hybrid, pin 49 giờ, giá tốt");
            edifier.setPrice(new BigDecimal("1490000"));
            edifier.setQuantity(90);
            edifier.setImageUrls("[\"https://images.unsplash.com/photo-1505740420928-5e560c06d30e\"]");
            edifier.setDetails("{\"brand\":\"Edifier\",\"model\":\"W820NB Plus\",\"type\":\"Over-Ear\",\"anc\":\"Hybrid ANC\",\"drivers\":\"40mm\",\"frequency_response\":\"20Hz-20kHz\",\"battery\":{\"anc_on\":\"49 giờ\",\"anc_off\":\"59 giờ\",\"quick_charge\":\"10 phút = 9 giờ\"},\"connectivity\":[\"Bluetooth 5.0\",\"3.5mm cable\",\"USB-C\"],\"controls\":[\"Physical buttons\",\"App control\"],\"features\":[\"Hi-Res Audio\",\"Game mode\",\"EQ presets\"],\"weight\":\"285g\",\"foldable\":true,\"warranty\":\"24 tháng chính hãng Edifier\",\"origin\":\"Nhập khẩu chính hãng\"}");
            edifier.setCategory(headphoneCategory);
            edifier.setSeller(seller);
            edifier.setStatus(Status.ACTIVE);
            productRepository.save(edifier);
        }
        
        log.info("More products created for " + seller.getUsername());
    }
    
    private void initializeSampleOrders(User customer1, User customer2, User customer3, User customer4, Product[] products) {
        log.info("Initializing sample orders distributed across November 2025...");
        
        Product iphone = products[0];
        Product samsung = products[1];
        Product macbook = products[2];
        Product dell = products[3];
        Product airpods = products[4];
        Product sony = products[5];
        
        int orderCount = 0;
        BigDecimal totalRevenue = BigDecimal.ZERO;
        
        // TUẦN 1 THÁNG 11
        // 05/11/2025
        orderCount++;
        totalRevenue = totalRevenue.add(createOrder(customer1, iphone, airpods, 1, 1, 
            LocalDateTime.of(2025, 11, 5, 10, 30), OrderStatus.DELIVERED));
        
        // 07/11/2025
        orderCount++;
        totalRevenue = totalRevenue.add(createOrder(customer2, samsung, null, 1, 0, 
            LocalDateTime.of(2025, 11, 7, 14, 20), OrderStatus.DELIVERED));
        
        // 09/11/2025
        orderCount++;
        totalRevenue = totalRevenue.add(createOrder(customer3, airpods, sony, 2, 1, 
            LocalDateTime.of(2025, 11, 9, 16, 45), OrderStatus.DELIVERED));
        
        // TUẦN 2 THÁNG 11
        // 11/11/2025
        orderCount++;
        totalRevenue = totalRevenue.add(createOrder(customer4, macbook, null, 1, 0, 
            LocalDateTime.of(2025, 11, 11, 9, 15), OrderStatus.DELIVERED));
        
        // 13/11/2025
        orderCount++;
        totalRevenue = totalRevenue.add(createOrder(customer1, samsung, airpods, 1, 1, 
            LocalDateTime.of(2025, 11, 13, 11, 30), OrderStatus.DELIVERED));
        
        // 15/11/2025
        orderCount++;
        totalRevenue = totalRevenue.add(createOrder(customer2, iphone, null, 1, 0, 
            LocalDateTime.of(2025, 11, 15, 13, 45), OrderStatus.DELIVERED));
        
        // TUẦN 3 THÁNG 11
        // 17/11/2025
        orderCount++;
        totalRevenue = totalRevenue.add(createOrder(customer3, dell, sony, 1, 1, 
            LocalDateTime.of(2025, 11, 17, 15, 20), OrderStatus.DELIVERED));
        
        // 19/11/2025
        orderCount++;
        totalRevenue = totalRevenue.add(createOrder(customer4, airpods, null, 3, 0, 
            LocalDateTime.of(2025, 11, 19, 10, 10), OrderStatus.DELIVERED));
        
        // 21/11/2025
        orderCount++;
        totalRevenue = totalRevenue.add(createOrder(customer1, macbook, airpods, 1, 2, 
            LocalDateTime.of(2025, 11, 21, 14, 30), OrderStatus.DELIVERED));
        
        // TUẦN 4 THÁNG 11
        // 23/11/2025
        orderCount++;
        totalRevenue = totalRevenue.add(createOrder(customer2, samsung, sony, 1, 1, 
            LocalDateTime.of(2025, 11, 23, 9, 40), OrderStatus.DELIVERED));
        
        // 25/11/2025
        orderCount++;
        totalRevenue = totalRevenue.add(createOrder(customer3, iphone, airpods, 1, 1, 
            LocalDateTime.of(2025, 11, 25, 16, 15), OrderStatus.DELIVERED));
        
        // 27/11/2025
        orderCount++;
        totalRevenue = totalRevenue.add(createOrder(customer4, dell, null, 1, 0, 
            LocalDateTime.of(2025, 11, 27, 11, 50), OrderStatus.DELIVERED));
        
        // 28/11/2025
        orderCount++;
        totalRevenue = totalRevenue.add(createOrder(customer1, samsung, null, 1, 0, 
            LocalDateTime.of(2025, 11, 28, 13, 25), OrderStatus.DELIVERED));
        
        // 29/11/2025
        orderCount++;
        totalRevenue = totalRevenue.add(createOrder(customer2, airpods, sony, 2, 1, 
            LocalDateTime.of(2025, 11, 29, 15, 35), OrderStatus.DELIVERED));
        
        // THÁNG 12 (hiện tại)
        // 30/11/2025
        orderCount++;
        totalRevenue = totalRevenue.add(createOrder(customer3, iphone, null, 1, 0, 
            LocalDateTime.of(2025, 11, 30, 10, 20), OrderStatus.DELIVERED));
        
        // 01/12/2025
        orderCount++;
        totalRevenue = totalRevenue.add(createOrder(customer4, macbook, sony, 1, 1, 
            LocalDateTime.of(2025, 12, 1, 9, 10), OrderStatus.DELIVERED));
        
        // 02/12/2025 - Đang xử lý
        orderCount++;
        createOrder(customer1, dell, airpods, 1, 1, 
            LocalDateTime.of(2025, 12, 2, 8, 30), OrderStatus.PROCESSING);
        
        // 02/12/2025 - Đang giao
        orderCount++;
        createOrder(customer2, samsung, sony, 1, 1, 
            LocalDateTime.of(2025, 12, 2, 10, 45), OrderStatus.SHIPPING);
        
        // 02/12/2025 - Đang giao
        orderCount++;
        createOrder(customer3, iphone, airpods, 1, 2, 
            LocalDateTime.of(2025, 12, 2, 14, 20), OrderStatus.SHIPPING);
        
        log.info("========================================");
        log.info("Sample orders created successfully!");
        log.info("Total orders: " + orderCount);
        log.info("- 16 DELIVERED orders (đã giao - có doanh thu)");
        log.info("- 1 PROCESSING order (đang xử lý)");
        log.info("- 2 SHIPPING orders (đang giao)");
        log.info("Total revenue (DELIVERED only): " + String.format("%,.0f VNĐ", totalRevenue));
        log.info("Orders from November to December 2025!");
        log.info("- November: 15 orders (5/11 -> 30/11)");
        log.info("- December: 4 orders (1/12 -> 2/12)");
        log.info("========================================");
    }
    
    private BigDecimal createOrder(User customer, Product product1, Product product2, 
                                   int qty1, int qty2, LocalDateTime createdAt, OrderStatus status) {
        Order order = new Order();
        order.setCustomer(customer);
        order.setCustomerName(customer.getUsername());
        order.setCustomerEmail(customer.getEmail());
        order.setCustomerPhone(customer.getPhoneNumber());
        order.setShippingAddress(customer.getAddress());
        order.setStatus(status);
        order.setCreatedAt(createdAt);
        
        BigDecimal total = product1.getPrice().multiply(new BigDecimal(qty1));
        if (product2 != null) {
            total = total.add(product2.getPrice().multiply(new BigDecimal(qty2)));
        }
        order.setTotalAmount(total);
        order = orderRepository.save(order);
        
        // Item 1
        OrderItem item1 = new OrderItem();
        item1.setOrder(order);
        item1.setProduct(product1);
        item1.setProductName(product1.getName());
        item1.setQuantity(qty1);
        item1.setProductPrice(product1.getPrice());
        item1.setSubtotal(product1.getPrice().multiply(new BigDecimal(qty1)));
        orderItemRepository.save(item1);
        
        // Item 2 (nếu có)
        if (product2 != null && qty2 > 0) {
            OrderItem item2 = new OrderItem();
            item2.setOrder(order);
            item2.setProduct(product2);
            item2.setProductName(product2.getName());
            item2.setQuantity(qty2);
            item2.setProductPrice(product2.getPrice());
            item2.setSubtotal(product2.getPrice().multiply(new BigDecimal(qty2)));
            orderItemRepository.save(item2);
        }
        
        // Chỉ tính doanh thu nếu đã giao
        if (status == OrderStatus.DELIVERED) {
            return total;
        }
        return BigDecimal.ZERO;
    }
    
    private void initializeDiscounts(User admin, User business1, User business2, User business3) {
        if (discountRepository.count() == 0) {
            log.info("Initializing discount codes...");
            
            // Admin global discounts
            createDiscount("WELCOME10", "Chào mừng khách hàng mới", 
                "Giảm 10% cho đơn hàng đầu tiên", DiscountType.PERCENTAGE, 
                10.0, 500000.0, 100000.0, 100, admin, 30);
                
            createDiscount("SAVE50K", "Giảm 50K cho đơn lớn", 
                "Giảm 50.000đ cho đơn hàng từ 1 triệu", DiscountType.FIXED_AMOUNT, 
                50000.0, 1000000.0, null, 50, admin, 60);
                
            createDiscount("FREESHIP", "Miễn phí giao hàng", 
                "Miễn phí ship cho đơn từ 300K", DiscountType.FREE_SHIPPING, 
                0.0, 300000.0, null, 200, admin, 90);
                
            createDiscount("FLASH20", "Flash Sale 20%", 
                "Giảm 20% tất cả sản phẩm - có hạn", DiscountType.PERCENTAGE, 
                20.0, 200000.0, 200000.0, 30, admin, 3);
            
            // Business specific discounts
            createDiscount("TECH15", "Tech Store 15%", 
                "Giảm 15% sản phẩm công nghệ", DiscountType.PERCENTAGE, 
                15.0, 800000.0, 150000.0, 40, business2, 45);
                
            createDiscount("GADGET100K", "Gadget Shop 100K", 
                "Giảm 100K cho phụ kiện công nghệ", DiscountType.FIXED_AMOUNT, 
                100000.0, 600000.0, null, 25, business3, 30);
                
            createDiscount("LOYAL25", "Khách hàng thân thiết", 
                "Giảm 25% cho khách VIP", DiscountType.PERCENTAGE, 
                25.0, 1500000.0, 300000.0, 15, business1, 120);
                
            createDiscount("SUMMER2024", "Ưu đãi hè 2024", 
                "Giảm giá mùa hè cho tất cả sản phẩm", DiscountType.PERCENTAGE, 
                12.0, 400000.0, 120000.0, 80, business1, 20);
                
            // Seasonal discounts
            createDiscount("NEWYEAR30", "Tết 2025", 
                "Chúc mừng năm mới - Giảm 30%", DiscountType.PERCENTAGE, 
                30.0, 2000000.0, 500000.0, 20, admin, 15);
                
            createDiscount("BLACKFRIDAY", "Black Friday Sale", 
                "Siêu sale Black Friday", DiscountType.PERCENTAGE, 
                35.0, 1000000.0, 400000.0, 50, admin, 1);
                
            log.info("Discount codes initialization completed!");
        }
    }
    
    private void createDiscount(String code, String name, String description, 
            DiscountType type, Double value, Double minOrder, Double maxDiscount, 
            Integer usageLimit, User createdBy, Integer validDays) {
        
        Discount discount = new Discount();
        discount.setCode(code);
        discount.setName(name);
        discount.setDescription(description);
        discount.setDiscountType(type);
        discount.setDiscountValue(BigDecimal.valueOf(value));
        discount.setMinOrderValue(minOrder != null ? BigDecimal.valueOf(minOrder) : null);
        discount.setMaxDiscountAmount(maxDiscount != null ? BigDecimal.valueOf(maxDiscount) : null);
        discount.setUsageLimit(usageLimit);
        discount.setUsedCount(0);
        discount.setStatus(Status.ACTIVE);
        discount.setCreatedBy(createdBy);
        
        LocalDateTime now = LocalDateTime.now();
        discount.setStartDate(now.minusDays(5)); // Bắt đầu từ 5 ngày trước
        discount.setEndDate(now.plusDays(validDays)); // Kết thúc sau validDays ngày
        
        discountRepository.save(discount);
        
        // Simulate some usage for testing
        if (Math.random() > 0.3) { // 70% chance có người dùng
            int usedCount = (int) (Math.random() * Math.min(10, usageLimit / 2));
            discount.setUsedCount(usedCount);
            discountRepository.save(discount);
        }
    }
}
