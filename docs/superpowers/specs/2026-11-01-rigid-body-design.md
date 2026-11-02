# Referans Acro: dört rotor ve açısal dinamik

Kullanıcı son denemeyi kendisi yapacağını söyleyerek devam edilmesini istedi. Mevcut ölçülen itki/akım eğrileri ve generic mod korunur. Referans profil + gerçekçi Acro yolunda açısal hızın doğrudan yumuşatılması yerine rate kontrolü, sınırlı dört rotor tahsisi ve Euler rijit gövde denklemi kullanılır. Angle modu ve generic gövdelerin uçuş kontrolü bu adımda değişmez.

Gövde koordinatları x sağ, y yukarı, z arka; rotor kuvvetleri +y. Roll z, pitch x, yaw y eksenindedir. Model gövde köşelerinde X rotorları kullanır; r×F ve karşı dönüş torkları toplanır. Temel denklem Jω̇ = τ − ω×Jω; diyagonal J ve RK4 entegrasyonu. Yön quaternion ile güncellenir.

Rate hedefi, merkez hassasiyeti ile son rate arasında tek/monoton kübik eğriyle üretilir; Betaflight firmware/Actual rates diye etiketlenmez. Model PID'i, filtreli ölçüm türevi, sınırlı integral ve doygunlukta integral dondurma kullanır. Motor tahsisinde tork talepleri ölçeklenir; sınırları korumak için collective gerektiğinde kaydırılır (airmode benzeri). Tahsis edilen kuvvetler ters tezgâh eğrisiyle komuta çevrilir; dört ayrı motor gecikmesi sonrası gerçek kuvvet/akım tekrar kaynaktan örneklenir. Pil bu dört akımın toplamından azalır.

Dingil mesafesi, yaklaşık J hesabı / elle girilmiş J, motor gecikmesi, yaw tork/itki oranı, merkez rate ve PID katsayıları varsayım olarak gösterilir ve normalleştirilerek saklanır. Otomatik J: toplam kütlenin %25'i rotor konumlarında, %75'i 120×40×160 mm merkez kutudadır. Bu dağılım ölçülmedi. Manuel J pozitif ve üçgen eşitsizliği sağlayan fiziksel principal değerler olmalıdır; geçersiz giriş hesaplanan J'ye döner. Eski ayarlara güvenli varsayılan uygulanır.

Yeni motor durumu disarm/boş pilde hedef sıfıra iner. Arm/kamera/mod geçişleri motor dizilerini tutarlı başlatır; Angle yoluna dönüş eski motor dizisini sürüklemez. Frame adımı 50 ms üstü kesilir; kontrol/motor/açısal dinamik en fazla 1/240 s alt adımlarla ilerler. Kullanıcıya kısaca geçerli fizik yolu ve dört motor komutu görünür. Ölçülen itki, fizik denklemi ve ölçülmeyen parametrelerin ayrımı korunur; tam donanım doğrulaması iddia edilmez.

Kabul: tork/atalet birimleri, torksuz korunum, mixer eksenleri ve doygunluk, integral sınırı, motor gecikmesi, hover, yön işaretleri, pil/akım toplamı, frame-adımı duyarlılığı, disarm/boş pil/mod geçişi. Tüm test/derleme, tarayıcı ve bir bağımsız inceleme sonrası Azure yedekli yayın; fiziksel test kullanıcıya bırakılır.
