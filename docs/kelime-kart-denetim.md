# Kelime kartı denetimi

> **Durum (uygulandı):** Bölüm 1–3'teki kesin hatalar ve bölüm 4'teki 97 öbek örneği `mobil/kaynak/kart-duzeltme.json` + `mobil/kart-duzelt.mjs` ile düzeltildi; bölüm 5'teki çekimli kopyalar `kelime-havuz.mjs › cekimBirlestir` ile kök karta bağlandı (havuz 2331 → 2119; 183 kök kart biçim listesi, 188 kart ek örnek kazandı). Aşağıdaki tablolar düzeltme sonrası yeniden üretilmiştir; kalanlar bilinçli bırakılan durumlardır (düzensiz fiil biçimleri, deyimsel başlıklar).

Havuz: 2119 kart (app/data/kelime-havuz.json → kaynak: app/data/uniteler/*.json `kelimeler`). Otomatik taramalar + 45 kartlık rastgele elle okuma. Kesin hatalar önce, tartışmalı tasarım sorunları sonra.

## 1. Örnek/çeviri alanında test şıkkı kalıntısı (0) — KESİN HATA

Modal Tekrarı ünitesinden çıkarılan kelimelerde örnek cümle yerine test cevabı ve şık harfi kalmış.

| Ünite | Kelime | Anlam | Örnek | Çeviri |
|---|---|---|---|---|

## 2. Örnek cümle kelimeyi içermiyor ya da yanlış kelime vurgulu (8) — KESİN HATA

Düzensiz fiil çekimleri (begin→begun) teknik olarak doğru; gerçek hatalar: **sleepy** (ilgisiz cümle, vurgu yok), **reactant** (vurgu "vinegar" kelimesinde).

| Ünite | Kelime | Anlam | Örnek | Çeviri |
|---|---|---|---|---|
| U1 | **begin** | başlamak (begin - began - begun) | Researchers have **begun** to investigate how climate change affects biodiversity across the globe. | Araştırmacılar, iklim değişikliğinin dünya genelinde biyoçeşitliliği nasıl etkilediğini araştırmaya başlamışlardır. |
| U1 | **come** | gelmek (come - came - come) | Most of the scientific breakthroughs of the last century **came** from years of patient research. | Geçen yüzyılın bilimsel atılımlarının çoğu, yıllarca süren sabırlı araştırmalardan ortaya çıkmıştır. |
| U8 | **lead** | yol açmak, neden olmak; öncülük etmek | His tiredness must have **led** to poor sleep. | Yorgunluğu, geceleri yeterince uyumamış olmasına yol açmış olmalı. |
| U2 | **warning** | uyarı | Despite the warnings, many tourists swam in the dangerous currents. | Uyarılara rağmen birçok turist tehlikeli akıntılarda yüzdü. |
| U6 | **race** | yarış; koşmak (fiil) | When the sun sets, the marathon runners will have been **racing** for hours. | Güneş battığında, maraton koşucuları saatlerdir koşuyor olacaklar. |
| U8 | **break** | kırmak, kırılmak | He was so careless that he could have **broken** the expensive vase. | O kadar dikkatsizdi ki pahalı vazoyu kırabilirdi. |
| U12 | **steal** | çalmak | The police finally discovered who had **stolen** the paintings. | Polis sonunda tabloları kimin çaldığını ortaya çıkardı. |
| U5 | **hike** | uzun yürüyüş yapmak, doğa yürüyüşü yapmak | Tomorrow at noon, we will be **hiking** through the mountain trails. | Yarın öğlen, dağ patikalarında yürüyüş yapıyor olacağız. |

## 3. Dilbilgisi hatalı örnek cümle (0) — KESİN HATA

| Ünite | Kelime | Anlam | Örnek | Çeviri |
|---|---|---|---|---|

Not: Otomatik tarama yalnızca "will be + V3 + nesne" kalıbını yakalar; elle okunan 45 kartta başka dilbilgisi hatası görülmedi.

## 4. Tam cümle olmayan örnekler (0) — TASARIM SORUNU

Edatlar ünitesinden gelen kartların örneği öbek düzeyinde ("the entire city", "by sunset"). Hata değil ama diğer kartlarla tutarsız; Akış ve Öğren'de zayıf görünüyor.

| Ünite | Kelime | Anlam | Örnek | Çeviri |
|---|---|---|---|---|

## 5. Çekimli biçim ayrı kart olmuş (65) — TASARIM SORUNU, kullanıcıya "hatalı kart" gibi görünüyor

Gramer ünitelerinin metinlerinden çıkarılan kelimeler çekimli hâliyle (strategies, accepted, contains, drawing…) ayrı kart olmuş; kökü zaten havuzda. Anlam alanında "(accept'in 3. hali)" gibi 109 dilbilgisi notu var. Öneri: bu kartları kök karta bağlayıp (biçim listesi) havuzdan çıkarmak; örnek cümleleri kök kartta ek örnek olarak tutmak.

| Ünite | Çekimli kart | Kök kart | Çekimli kartın anlamı |
|---|---|---|---|
| U2 | **shipping** | ship (U2) | sevkiyat, kargo |
| U2 | **following** | follow (U1) | ardından, -in akabinde |
| U14 | **planning** | plane (U6) | planlama |
| U6 | **supplies** | supply (U1) | erzak, malzemeler, ikmal maddeleri |
| U2 | **warning** | warn (U8) | uyarı |
| U2 | **regarding** | regard (U1) | ile ilgili, hakkında |
| U3 | **beginning** | begin (U1) | başlangıç, baş |
| U4 | **setting** | set (U1) | (güneş) batmak; ayarlamak; (isim) ortam |
| U8 | **accounts** | account (U8) | oluşturur, oranını teşkil eder (account for) |
| U1 | **others** | other (U1) | diğerleri |
| U1 | **developed** | develop (U1) | gelişmiş (developing: gelişen) |
| U1 | **including** | include (U1) | dahil |
| U1 | **means** | mean (U1) | yol, yöntem, araç |
| U9 | **finding** | find (U1) | bulgu, sonuç |
| U6 | **moved** | move (U1) | taşınmak |
| U6 | **winning** | win (U1) | kazanmak (win'in -ing hali) |
| U9 | **concerned** | concern (U1) | endişeli, kaygılı; ilgili |
| U13 | **experienced** | experience (U1) | deneyimli |
| U2 | **concerning** | concern (U1) | ile ilgili, hakkında |
| U4 | **occurred** | occur (U1) | meydana geldi, gerçekleşti (occur'ın geçmiş hali) |
| U2 | **considering** | consider (U1) | göz önüne alırsak, düşünüldüğünde |
| U6 | **restricted** | restrict (U4) | kısıtlı, yasak (giriş izni olmayan) |
| U1 | **understanding** | understand (U1) | anlama, anlayış |
| U1 | **developing** | develop (U1) | gelişmekte olan |
| U1 | **whereas** | where (U1) | oysa / -e rağmen |
| U1 | **goods** | good (U1) | mal |
| U1 | **interested** | interest (U1) | ilgili, ilgilenen (in) |
| U1 | **nothing** | not (U1) | hiçbir şey |
| U1 | **living** | live (U1) | yaşam, geçim |
| U1 | **leading** | lead (U8) | önde gelen |
| U1 | **feeling** | feel (U1) | his / duygu |
| U1 | **meeting** | meet (U1) | toplantı |
| U2 | **cuts** | cut (U1) | kesintiler, kısıntılar |
| U8 | **dropped** | drop (U1) | attı, düşürdü, bıraktı (drop'un geçmiş hali) |
| U9 | **hiking** | hike (U5) | doğa yürüyüşü, dağ yürüyüşü |
| U8 | **surprised** | surprise (U6) | şaşırmış, hayret etmiş |
| U2 | **excluding** | exclude (U9) | hariç, dışarıda bırakarak |
| U3 | **challenging** | challenge (U1) | zorlu, meydan okuyan |
| U6 | **admitted** | admit (U6) | kabul etmek, itiraf etmek (admit'in 2./3. hali) |
| U6 | **lightning** | light (U1) | şimşek, yıldırım |
| U14 | **promising** | promise (U5) | umut verici |
| U4 | **threatening** | threaten (U4) | tehdit edici, tehlikeli; tehdit eden |
| U1 | **involved** | involve (U1) | karışmış / ilgili (+in) |
| U1 | **interesting** | interest (U1) | ilginç |
| U1 | **building** | build (U1) | bina, inşaat |
| U1 | **expected** | expect (U1) | beklenen, umulan |
| U1 | **meaning** | mean (U1) | anlam |
| U1 | **painting** | paint (U9) | resim / tablo |
| U1 | **employee** | employ (U11) | çalışan |
| U1 | **exposed** | expose (U7) | maruz kalmış |
| U1 | **news** | new (U1) | haber / haberler |
| U1 | **advanced** | advance (U1) | ileri düzeyde |
| U1 | **ageing** | age (U1) | yaşlanma |
| U7 | **approaching** | approach (U1) | yaklaşmak (approach'in -ing hali) |
| U7 | **booked** | book (U1) | rezerve edilmiş, dolu (rezervasyon) |
| U8 | **freezing** | freeze (U11) | buz gibi, donduran, çok soğuk |
| U7 | **traces** | trace (U7) | izler, emareler |
| U7 | **serviced** | service (U1) | bakımını yapmak, servise sokmak (service'in 3. hali / past participle) |
| U9 | **cleansing** | clean (U5) | temizlik, arındırma |
| U4 | **travelled** | travel (U1) | seyahat etti |
| U7 | **neighbouring** | neighbour (U8) | komşu, bitişik, yakın |
| U9 | **regrets** | regret (U2) | pişman olur, üzüntü duyar |
| U7 | **seasoning** | season (U11) | baharat, çeşni, tatlandırıcı |
| U9 | **collaborated** | collaborate (U9) | iş birliği yaptı, ortak çalıştı |
| U9 | **regretted** | regret (U2) | pişman oldu (regret'in geçmiş hali) |

## 6. Kelime başlığı biçimsel pürüzler (1) — KÜÇÜK

Parantez/eğik çizgi içeren başlıklar sözlükte, akışta ve eşleştirmede garip okunuyor ("vital for / to", "deal (with)"); "either ... or" anlamı "ya -- ya --".

| Ünite | Kelime | Anlam | Örnek | Çeviri |
|---|---|---|---|---|
| U1 | **whether ... or** | ister --- ister / -ıp -madığı | Researchers are still investigating **whether** the new vaccine is effective **or** whether its benefits have been exaggerated. | Araştırmacılar, yeni aşının etkili olup olmadığını ya da faydalarının abartılıp abartılmadığını hâlâ araştırıyorlar. |

## 7. Aynı örnek cümle, aynı vurgu, farklı kartlar (4) — 5 ile bağlantılı

| Kartlar | Cümle |
|---|---|
| graduate / graduate from | after graduating from college |
| trace / traces | The suspect might have fled the country. The police can't find any traces. |
| collaborate / collaborated | The organization collaborated with local communities to address environmental issues. |
| overslept / oversleep | I ought to have set an alarm. I overslept and missed my flight. |

## Özet ve öneri

- Kesin hata: 8 kart (bölüm 1–3) — elle düzeltilebilir.
- Tasarım sorunu: 0 öbek örnek (bölüm 4) ve 65 çekimli kopya kart (bölüm 5).
- Rastgele 45 kartlık elle okumada anlam/çeviri hatası bulunmadı; tür etiketleri tutarlı (İsim 835, Fiil 668, Sıfat 343, Zarf 148 + bileşikler).
