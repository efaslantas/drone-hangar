# Model ile tutarlı zemin teması ve atölye ekseni

Kullanıcı gerçekçilik kapsamına devam istedi. Kök neden: görsel gövde metre ölçüsünde, zemin teması ise size*.45 / en az6cm sphere yarıçapında; SOURCEONE yerde yaklaşık8cm boşluk bırakır. Atölyede root.translation ile merkezleme, yaw pivotunu merkezlemez.

Kararım: kaynak/model geometri sınırlarından üretilen yerel contactBounds (tam pervane süpürme XZ zarfı dahil) yalnız kara zemin desteğini belirler. Sekiz köşeli AABB desteği quaternion ve yüzey normaline göre hesaplanır,1mm payla alt geometri yüzeyin üstünde kalır. Hız/sert iniş/su/kıyı kontrolü korunur; duvar/tavan/roof obstacle zarfları eski konservatif sphere kalır. Eski trace/profile/model metadata olmayan yolda eski zemin hesabı korunur. Uçuş kuvvetleri/mixer/PID/RC değişmez. Bu, rijit gövde teker/ayak sürtünme veya tam temas dinamiği değildir.

Görsel metadata makeDrone/setCamPodTilt içinde root-local geometri ve optik lens merkezinden gelir; spec'e kalıcı yazılmaz. Local spawn bu geçici veriyi aktif spec'e aktarır; payload profili aynı geometrik teması taşır. FPV kamera mevcut FOV/tilt yönünü korur, temsili modeldeki lens noktasına bağlanır. Yakın zemin için near plane yüksekliğe göre .003..eski.04/.1m arasında sınırlandırılır; havada eski far-depth aralığına döner. Lens/camera donanımı hâlâ temsili ölçüdür.

Atölyede ayrı yaw-pivot Group merkez0 etrafında döner, alt craft yalnız centre offset taşır. Geometri/prop/dynamics dizileri değişmez. Aynı wrapper disposal sahibidir. Floor1mm-scaled tolerance ile alt sınıra yakın, shader/texture değişmez.

Kabul: tüm10gövde+SOURCEONE gerçek mesh zemin boşluğu~1mm, farklı pitch/roll/yaw ve eğimli/negatif DEM'de hiçbir vertex plane altına geçmez; su/sert iniş ve metadata yokfallback korunur. Spawn/RCstart temas yüksekliği aynıdır, kamera lens anchor/tilt ve düşük near plane tutarlıdır. Manueltilt metadata günceller, worldposition/scale metadata'yı bozmaz. Atölye dönüş merkezinin offset'i yaw boyunca sabit sıfırdır. Test/build/browser/WebGL/WebGPU/mobile/freshreview ve Azure kanıtı gerekir. Ölçülmüş iniş veya gerçek TX15 uçuş eşleşmesi iddia edilmez.
