# 🎵 NoteSlayer

**Enstrümanınla düşmanları yok et!**

NoteSlayer, gerçek bir enstrüman (gitar) kullanarak oynanan bir arena savunma oyunudur. Mikrofon aracılığıyla çaldığın notalar algılanır ve ekrandaki düşmanları yok eder.

---

## 🎮 Nasıl Oynanır?

1. **Gitarını hazırla** ve mikrofonunu aç
2. Ekranın ortasında senin karakterin var — düşmanlar her yönden sana doğru geliyor
3. Her düşmanın üzerinde bir **nota** yazıyor (örn: E2, G3, B3...)
4. O notayı gitarında **çal** → düşman patlar! 💥
5. Düşman sana ulaşırsa can kaybedersin (3 can hakkın var)
6. Her dalga daha zor — daha hızlı düşmanlar, daha çok nota çeşidi

## ✨ Özellikler

- 🎸 **Gerçek zamanlı nota algılama** — YIN algoritması ile pitch detection
- 🎯 **4 düşman tipi** — Normal, Hızlı, Elite, Boss
- 🌊 **Dalga sistemi** — Progresif zorluk artışı
- 🔥 **Combo sistemi** — Arka arkaya öldürmelerde combo ve puan çarpanı
- 🎛️ **Akort modu** — Oyun içi gitar akort ekranı
- 💜 **Neon Cyberpunk tema** — Glow efektler, parçacık patlamaları, screen shake
- 📱 **Mobil uyumlu** — Responsive tasarım
- 🏆 **High Score** — En yüksek skor kaydı (localStorage)

## 🚀 Kurulum & Çalıştırma

```bash
# Projeyi klonla
git clone https://github.com/Nukte/notaSlayer.git
cd notaSlayer

# Herhangi bir HTTP server ile başlat
npx serve . -p 3000

# Tarayıcıda aç
# http://localhost:3000
```

> **Not:** Mikrofon izni gereklidir. Chrome/Edge'de `localhost` üzerinden çalışır.

## 🎼 Desteklenen Notalar

### Kolay Mod (6 nota)
Standart gitar açık telleri:
| Tel | Nota |
|-----|------|
| 6. tel | E2 |
| 5. tel | A2 |
| 4. tel | D3 |
| 3. tel | G3 |
| 2. tel | B3 |
| 1. tel | E4 |

### Normal & Zor Mod
İlk pozisyon notaları dahil 15-20+ nota.

## 🏗️ Teknik Yapı

```
notaSlayer/
├── index.html                 # Ana sayfa
├── css/style.css              # Neon cyberpunk tema
├── js/
│   ├── main.js                # Entry point
│   ├── audio/
│   │   ├── AudioEngine.js     # Mikrofon & ses işleme
│   │   ├── PitchDetector.js   # YIN pitch detection algoritması
│   │   └── NoteMapper.js      # Frekans → nota dönüşümü
│   ├── game/
│   │   ├── Game.js            # Ana oyun döngüsü & state yönetimi
│   │   ├── Player.js          # Oyuncu karakteri
│   │   ├── Enemy.js           # Düşman sınıfı
│   │   ├── EnemyManager.js    # Düşman spawn & yaşam döngüsü
│   │   ├── DifficultyManager.js # Dalga & zorluk sistemi
│   │   └── Particle.js        # Parçacık efektleri
│   ├── ui/
│   │   ├── HUD.js             # Skor, can, dalga gösterimi
│   │   ├── Menu.js            # Ana menü & kalibrasyon
│   │   └── GameOver.js        # Oyun sonu ekranı
│   └── utils/
│       ├── constants.js       # Oyun sabitleri
│       └── helpers.js         # Yardımcı fonksiyonlar
```

### Kullanılan Teknolojiler
- **HTML5 Canvas** — Oyun render
- **Web Audio API** — Mikrofon erişimi & frekans analizi
- **YIN Algoritması** — Monofonik pitch detection
- **Vanilla JavaScript** (ES6 Modules) — Sıfır bağımlılık
- **CSS3** — Glassmorphism, neon glow, animasyonlar

## 🎯 Zorluk Seviyeleri

| | Kolay | Normal | Zor |
|---|---|---|---|
| Nota sayısı | 6 | 15 | 20+ |
| Düşman hızı | Yavaş | Orta | Hızlı |
| Elite düşman | 8. dalga+ | 5. dalga+ | 3. dalga+ |
| Boss | 10. dalga+ | 5. dalga+ | 5. dalga+ |

## 📋 Yol Haritası

- [ ] Akor algılama (çoklu nota)
- [ ] Farklı enstrüman desteği (piano, ukulele)
- [ ] Ses efektleri (opsiyonel, kulaklık ile)
- [ ] Çok oyunculu mod
- [ ] Özel şarkı/nota dizileri ile level tasarımı

## 📄 Lisans

MIT

---

<p align="center">
  <b>🎸 Gitarını al, düşmanları yen! 🎸</b>
</p>
