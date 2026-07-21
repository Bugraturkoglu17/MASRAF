# Admin rehberi

Admin panelinde organizasyon kullanıcıları, aktiflik ve temel USER/MANAGER/ADMIN rolü yönetilir. Kendi ADMIN rolünüzü kaldıramaz, kendinizi pasif yapamaz ve son aktif ADMIN'i düşüremezsiniz. Rol değişikliği hedef kullanıcının refresh oturumlarını iptal eder.

Kullanıcı/Yönetici görünümü gerçek rolü değiştirmeden aynı sekmede açılır. Production PWA tanılama rotası yayınlanmaz; sürüm `/api/v1/app/version` ile kontrol edilir.

`Denetim Kayıtları` ekranı organizasyon kapsamındaki kritik işlem izlerini sayfalı olarak gösterir. Masraf kararları, bildirim ve audit kayıtları aynı veritabanı transaction'ında yazılır; audit yazılamazsa kritik işlem tamamlanmış sayılmaz.

Kullanıcı oluşturma/düzenleme, kategori, ayrıntılı permission override ve sistem ayarı arayüzleri mevcut sürümde eksiktir; [known-limitations.md](known-limitations.md) nedeniyle nihai kabul engelidir.
