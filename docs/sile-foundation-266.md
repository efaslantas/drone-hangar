# Şile 2.66 — Temel eteği ve bina dibi görünümü

Mevcut temel eteklerine 2 metre ölçekli genel beton taraması ve son fiziksel zemin kotuna bağlı hafif dip kir tonu eklendi. Bina çevresindeki kaldırımla birleşen tek renk yüzeylerin malzeme ayrıntısı arttı. Bu, gerçek Şile temel malzemesinin veya nem durumunun ölçümü değildir.

59 temel eteğinin mevcut 804 köşesi ve bütün önceki fizik kayıtları korunur. Yeni yüzey, basamak, çıkıntı, mesh veya çarpışma sahibi eklenmez. Temel pozisyon SHA256 değeri `60ab3df4e3edbfe78a899f197503a00650655279d4f7f0ab16464b78247e4856`; tam fizik SHA256 değeri `8fcd8220a21cfceefcdba074a93af0709b54adf7d8c8d1a265cdb29326453775` olarak kalır.

Görünüm, platform ve kapı hizalamasından sonra uygulanır. Doku yönü her yuvarlanmış parçadan ayrı hesaplanmaz; özgün bina kenarından taşınır. Gerçek 804 köşeli sahnede aynı duvarın ortak köşelerindeki UV kayması 0 olarak doğrulandı. Dip tonu deniz seviyesine göre sabit çizilmez; son fiziksel araziyi izler. Tarama, düşük kaliteye dönüş, genel yüzey hazırlığı ve worker aktarımı aynı metre ölçeğini korur. Var olan büyük arazi/bina uyuşmazlıkları bu malzeme değişikliğiyle yeniden yorumlanmaz.

Testler pozisyon değişmezliği, metre UV, ters yüzey sarımı, eğimli zemin ve irtifa kaydırması, taranmış doku/düşük kalite, worker aktarımı, gerçek dünya fizik özeti ve kaynak temizliğini kapsar. Güncel test, görüntü, performans ve canlı teslim kanıtı `docs/sile-completion-acceptance.json` içindeki `followups.foundation266` bölümündedir. Önceki 900 saniyelik ölçüm 2.58'e aittir. Yeni kullanıcı uçuş kabulü ve fiziksel TX15 testi yapılmadı.

2.66 teslimi: `v2.66.0-b86bd27a4253`. 687 Node22 / 11 altyapı / 12 rota geçti. 32 görünüm WebGL ve WebGPU üzerinde incelendi. 180,004 saniyelik görünür ölçümde yaklaşık 60 FPS, en düşük yüzde 1 diliminde 49,07 FPS alındı. Çalışan sürümün kaynakları, HTTPS/WSS ve Şile uçuş ekranında DISARM / 0 m AGL doğrulandı.
