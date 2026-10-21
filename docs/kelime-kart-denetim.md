# Kelime kartı denetimi

Havuz: 2331 kart (app/data/kelime-havuz.json → kaynak: app/data/uniteler/*.json `kelimeler`). Otomatik taramalar + 45 kartlık rastgele elle okuma. Kesin hatalar önce, tartışmalı tasarım sorunları sonra.

## 1. Örnek/çeviri alanında test şıkkı kalıntısı (6) — KESİN HATA

Modal Tekrarı ünitesinden çıkarılan kelimelerde örnek cümle yerine test cevabı ve şık harfi kalmış.

| Ünite | Kelime | Anlam | Örnek | Çeviri |
|---|---|---|---|---|
| U8 | **search** | aramak, araştırmak | ought to **search** for | D) aramalıydı / araması gerekirdi |
| U8 | **won** | kazanmak (V3 / past); kazandı | may not have **won** | D) kazanmamış olabilir |
| U8 | **reduced** | azaltmak (V3 / past); azaltılmış | should have **reduced** | A) azaltmalıydı / azaltması gerekirdi |
| U8 | **expanded** | genişletmek (V3 / past); genişlemiş | ought to have **expanded** | D) genişletmiş olması gerekirdi |
| U8 | **depend** | bağlı olmak; güvenmek, dayanmak | can **depend** on | C) -e güvenebilir / -e bağlı olabilir |
| U8 | **suspended** | askıya almak, ertelemek (suspend'in 3. hali / sıfat: askıda) | D) can't have **suspended** | D) askıya almış olamaz |

## 2. Örnek cümle kelimeyi içermiyor ya da yanlış kelime vurgulu (9) — KESİN HATA

Düzensiz fiil çekimleri (begin→begun) teknik olarak doğru; gerçek hatalar: **sleepy** (ilgisiz cümle, vurgu yok), **reactant** (vurgu "vinegar" kelimesinde).

| Ünite | Kelime | Anlam | Örnek | Çeviri |
|---|---|---|---|---|
| U1 | **begin** | başlamak (begin - began - begun) | Researchers have **begun** to investigate how climate change affects biodiversity across the globe. | Araştırmacılar, iklim değişikliğinin dünya genelinde biyoçeşitliliği nasıl etkilediğini araştırmaya başlamışlardır. |
| U1 | **come** | gelmek (come - came - come) | Most of the scientific breakthroughs of the last century **came** from years of patient research. | Geçen yüzyılın bilimsel atılımlarının çoğu, yıllarca süren sabırlı araştırmalardan ortaya çıkmıştır. |
| U8 | **lead** | yol açmak, neden olmak; öncülük etmek | His tiredness must have **led** to poor sleep. | Yorgunluğu, geceleri yeterince uyumamış olmasına yol açmış olmalı. |
| U6 | **race** | yarış; koşmak (fiil) | When the sun sets, the marathon runners will have been **racing** for hours. | Güneş battığında, maraton koşucuları saatlerdir koşuyor olacaklar. |
| U8 | **break** | kırmak, kırılmak | He was so careless that he could have **broken** the expensive vase. | O kadar dikkatsizdi ki pahalı vazoyu kırabilirdi. |
| U12 | **steal** | çalmak | The police finally discovered who had **stolen** the paintings. | Polis sonunda tabloları kimin çaldığını ortaya çıkardı. |
| U5 | **hike** | uzun yürüyüş yapmak, doğa yürüyüşü yapmak | Tomorrow at noon, we will be **hiking** through the mountain trails. | Yarın öğlen, dağ patikalarında yürüyüş yapıyor olacağız. |
| U8 | **sleepy** | uykulu, uykusu gelmiş | Linda made a cup of tea as soon as she woke up. | Linda uyanır uyanmaz bir fincan çay yaptı. |
| U11 | **reactant** | tepken, reaktan (kimyasal tepkimeye giren madde) | If you add **vinegar** to the baking **soda,** the mixture will fizz and create a chemical reaction. | Karbonata sirke eklersen, karışım köpürecek ve bir kimyasal tepkime oluşturacaktır. |

## 3. Dilbilgisi hatalı örnek cümle (1) — KESİN HATA

| Ünite | Kelime | Anlam | Örnek | Çeviri |
|---|---|---|---|---|
| U10 | **built** | inşa etmek (build fiilinin geçmiş/3. hali); inşa edilmiş | Workers will be **built** a new fun park in town. | İşçiler kasabada yeni bir eğlence parkı inşa edecek. (Not: cümle dilbilgisel olarak hatalı; doğrusu 'will build' olmalı.) |

Not: Otomatik tarama yalnızca "will be + V3 + nesne" kalıbını yakalar; elle okunan 45 kartta başka dilbilgisi hatası görülmedi.

## 4. Tam cümle olmayan örnekler (97) — TASARIM SORUNU

Edatlar ünitesinden gelen kartların örneği öbek düzeyinde ("the entire city", "by sunset"). Hata değil ama diğer kartlarla tutarsız; Akış ve Öğren'de zayıf görünüyor.

| Ünite | Kelime | Anlam | Örnek | Çeviri |
|---|---|---|---|---|
| U2 | **shipping** | sevkiyat, kargo | excluding **shipping** | sevkiyat hariç |
| U2 | **resources** | kaynaklar | **resources** like water and air | su ve hava gibi kaynaklar |
| U2 | **gallery** | galeri, sergi salonu | the paintings inside the **gallery** | galerideki resimler |
| U2 | **given** | -i göz önüne alarak, -e bakılırsa | **given** the complexity of the issue | sorunun karmaşıklığı gözönüne alınırsa |
| U2 | **plus** | artı, üstüne, ile birlikte | five **plus** two equals seven | Beş artı iki yedidir. |
| U2 | **annual** | yıllık | an **annual** salary of $40,000 | 40.000 dolarlık yıllık maaş |
| U2 | **airport** | hava alanı | 3 km away **from** the **airport** | hava alanından 3 km uzak |
| U2 | **hill** | tepe, bayır | to roll down the **hill** | tepeden aşağı yuvarlanmak |
| U2 | **budget** | bütçe | the meeting concerning the **budget** cuts | bütçe kesintileri ile ilgili toplantı |
| U2 | **warning** | uyarı | despite the **warnings** | uyarılara rağmen |
| U2 | **entire** | bütün, tüm | the **entire** city | tüm şehir |
| U2 | **regarding** | ile ilgili, hakkında | a complaint **regarding** the noise | gürültü ile ilgili bir şikayet |
| U2 | **effort** | çaba, gayret | notwithstanding his **efforts** | çabalarına rağmen |
| U2 | **campaign** | kampanya | a new **campaign** | yeni bir kampanya |
| U2 | **hire** | işe almak | to **hire** her as a project manager | onu proje yöneticisi olarak işe almak |
| U2 | **theatre** | tiyatro, sinema salonu | the restaurant beside the movie **theatre** | sinemanın yanındaki restoran |
| U2 | **brief** | kısa, özet | a **brief** pause | kısa bir duraklama |
| U2 | **measure** | önlem, tedbir | emergency **measures** | acil önlemler |
| U2 | **duty** | görev, nöbet | off **duty** until next Monday | gelecek pazartesiye kadar izinli |
| U2 | **strategic** | stratejik | **strategic** planning | stratejik planlama |
| U8 | **reduced** | azaltmak (V3 / past); azaltılmış | should have **reduced** | A) azaltmalıydı / azaltması gerekirdi |
| U2 | **hidden** | gizli, saklanmış | a **hidden** treasure | gizli hazine |
| U2 | **immediate** | acil, anlık, hemen | **immediate** response from the emergency services | acil servislerden anlık müdahale |
| U2 | **audience** | izleyici, seyirci, dinleyici kitlesi | before the **audiences** | izleyicilerin önünde |
| U2 | **concerning** | ile ilgili, hakkında | topics **concerning** safety | güvenlik ile ilgili konular |
| U2 | **bond** | bağ, ilişki | a strong **bond** | güçlü bir bağ |
| U2 | **alliance** | ittifak, birlik | an **alliance** between two powerful nations | iki güçlü ulus arasında bir ittifak |
| U2 | **crew** | ekip, mürettebat, kabin personeli | All **crew** members are aboard | Tüm ekip üyeleri uçaktadır. |
| U2 | **recognition** | tanınma, tanıma | beyond **recognition** | tanınmaz halde |
| U2 | **effectively** | etkili bir şekilde | by communicating **effectively** | etkili bir şekilde iletişim kurarak |
| U2 | **narrow** | dar | the **narrow** tunnel | dar tünel |
| U2 | **consultant** | danışman | a **consultant** in the field of environmental science | çevre bilimi alanında bir danışman |
| U2 | **considering** | göz önüne alırsak, düşünüldüğünde | **considering** his age | yaşını göz önüne alırsak |
| U2 | **till** | kadar (zamana kadar) | wait **till** midnight | gece yarısına kadar beklemek |
| U2 | **desert** | çöl | across the **desert** | çölün karşıdan karşıya |
| U2 | **ghost** | hayalet | to move quietly like a **ghost** | bir hayalet gibi sessizce hareket etmek |
| U2 | **armed** | silahlı | an **armed** group | silahlı bir grup |
| U2 | **complaint** | şikayet | a **complaint** regarding the noise | gürültü ile ilgili bir şikayet |
| U2 | **diverse** | çeşitli, farklı | explore **diverse** cultures | çeşitli kültürleri keşfetmek |
| U2 | **roll down** | aşağı yuvarlanmak | to **roll** **down** the hill | tepeden aşağı yuvarlanmak |
| U2 | **climate change** | iklim değişimi | a report about **climate** **change** | iklim değişimi hakkında bir rapor |
| U2 | **leaf** | yaprak | like a **leaf** on the water | suyun üstünde bir yaprak gibi |
| U2 | **versus** | karşı, karşısında | Italian cuisine **versus** French cuisine | İtalyan mutfağına karşı Fransız mutfağı |
| U2 | **communicate** | iletişim kurmak | by **communicating** effectively | etkili bir şekilde iletişim kurarak |
| U2 | **cuts** | kesintiler, kısıntılar | the meeting concerning the budget **cuts** | bütçe kesintileri ile ilgili toplantı |
| U2 | **childhood** | çocukluk | ever since **childhood** | çocukluktan beri |
| U2 | **opposite** | karşısında, karşı tarafında | the bus stop **opposite** the hospital | hastanenin karşısındaki otobüs durağı |
| U2 | **sunset** | gün batımı | by **sunset** | gün batımına kadar |
| U2 | **midnight** | gece yarısı | till **midnight** | gece yarısına kadar |
| U2 | **dispute** | tartışma, anlaşmazlık | a **dispute** over the rules | kurallar üzerine bir tartışma |
| U2 | **tablet** | tablet, hap | to take two **tablets** per day | Günde iki tablet almak. |
| U2 | **complexity** | karmaşıklık | given the **complexity** of the issue | sorunun karmaşıklığı gözönüne alınırsa |
| U8 | **depend** | bağlı olmak; güvenmek, dayanmak | can **depend** on | C) -e güvenebilir / -e bağlı olabilir |
| U2 | **crucial** | çok önemli, hayati | **crucial** to the project's success | projenin başarısı için çok önemli |
| U2 | **float** | yüzmek, süzülmek, salınmak | to **float** gently like a leaf on the water | suyun üstünde bir yaprak gibi nazikçe süzülmek |
| U2 | **tunnel** | tünel | to crawl out of the narrow **tunnel** | dar tünelden çıkmak |
| U2 | **corruption** | yolsuzluk, rüşvet | allegations of **corruption** against the government | hükümete yönelik yolsuzluk iddiaları |
| U2 | **cuisine** | mutfak (yemek kültürü) | Italian **cuisine** versus French cuisine | İtalyan mutfağına karşı Fransız mutfağı |
| U2 | **cancellation** | iptal | **cancellation** without notice of the concert | konser iptaline ilişkin bildirim olmaksızın |
| U2 | **nervous** | gergin, sinirli | feel **nervous** before the audiences | izleyicinin önünde gergin hissetmek |
| U2 | **horizon** | ufuk | the wide **horizon** | geniş ufuk |
| U2 | **beneath** | altında | the subway system **beneath** the city streets | şehir caddelerinin altındaki metro sistemi |
| U2 | **sculpture** | heykel | a famous **sculpture** | ünlü bir heykel |
| U2 | **remarkable** | dikkat çekici, olağanüstü | a **remarkable** feat of engineering | olağanüstü bir mühendislik başarısı |
| U2 | **fence** | çit | over the **fence** | çitin üzerinden |
| U2 | **rug** | halı, kilim, küçük halı | a dog on the **rug** | halının üstünde bir köpek |
| U2 | **necessity** | zorunluluk, ihtiyaç, gereklilik | to take a break out of **necessity** | ihtiyaçtan ara vermek |
| U2 | **gently** | nazikçe, yavaşça | to float **gently** like a leaf | bir yaprak gibi nazikçe yüzmek |
| U2 | **picnic** | piknik | went out **for** a **picnic** | piknik için dışarı çıktı |
| U2 | **feat** | başarı, beceri gerektiren iş | a remarkable **feat** of engineering | olağanüstü bir mühendislik başarısı |
| U2 | **fireplace** | şömine, ocak | beside the **fireplace** | şöminenin yanında |
| U2 | **budget cuts** | bütçe kesintileri | the meeting concerning the **budget** **cuts** | bütçe kesintileri hakkındaki toplantı |
| U2 | **lily** | zambak | all flowers excepting the white **lilies** | Beyaz zambaklar hariç tüm çiçekler. |
| U2 | **playground** | oyun alanı | the **playground** next to the school | okulun bitişiğindeki oyun alanı |
| U2 | **curtain** | perde | the thief behind the **curtains** | perdenin arkasındaki hırsız |
| U2 | **statue** | heykel | the historical **statue** behind the modern building | modern binanın arkasındaki tarihi heykel |
| U2 | **pause** | duraklama, ara | a brief **pause** | kısa bir duraklama |
| U2 | **notwithstanding** | rağmen, karşın | **notwithstanding** the differences | farklılıklara rağmen |
| U2 | **subway** | metro | the **subway** system beneath the city streets | şehir caddelerinin altındaki metro sistemi |
| U2 | **bakery** | fırın, pastane | a **bakery** near the office building | ofis binasının yanında bir fırın |
| U2 | **heal** | iyileşmek, iyileştirmek | to **heal** inside six months | 6 ay içinde iyileşmek |
| U2 | **regret** | pişmanlık, üzüntü | to apologize out of **regret** | pişmanlıktan özür dilemek |
| U2 | **weigh** | ağırlığında olmak, basmak | to **weigh** over 10 kilograms | 10 kilogramdan fazla basmak |
| U2 | **feather** | tüy | a bird with colourful **feathers** | renkli tüylü bir kuş |
| U2 | **underneath** | altında, alt tarafında | treasure **underneath** the old tree | yaşlı ağacın altında |
| U2 | **ruins** | kalıntılar, harabeler, antik kalıntılar | ancient **ruins** beneath the city | şehrin altındaki antik kalıntılar |
| U2 | **thief** | hırsız | the **thief** behind the curtains | perdenin arkasındaki hırsız |
| U2 | **crawl** | emeklemek, sürünerek ilerlemek | to **crawl** out of the narrow tunnel | dar tünelden çıkmak |
| U2 | **apologize** | özür dilemek | to **apologize** out of regret | pişmanlıktan özür dilemek |
| U2 | **cozy** | rahat, samimi, içten | the **cozy** cafe | rahat kafe |
| U2 | **extinction** | nesli tükenme, yok oluş | rare species in jeopardy of **extinction** | nesli tükenme tehlikesindeki nadir türler |
| U2 | **allegation** | iddia, suçlama | **allegations** of corruption against the government | hükümete yönelik yolsuzluk iddiaları |
| U2 | **campsite** | kamp yeri | a **campsite** by the lake | gölün yanında bir kamp yeri |
| U2 | **invader** | işgalci, istilacı | the **invaders** attacked the city | İşgalciler şehre saldırdı. |
| U2 | **precaution** | önlem, tedbir | to take an umbrella as a **precaution** | önlem olarak bir şemsiye (almak) |
| U2 | **excepting** | hariç, dışında | everyone **excepting** Sara | sara hariç herkes |
| U2 | **protestor** | protestocu, eylemci | the **protestors** in front of the government building | hükümet binasının önündeki protestocular |

## 5. Çekimli biçim ayrı kart olmuş (252) — TASARIM SORUNU, kullanıcıya "hatalı kart" gibi görünüyor

Gramer ünitelerinin metinlerinden çıkarılan kelimeler çekimli hâliyle (strategies, accepted, contains, drawing…) ayrı kart olmuş; kökü zaten havuzda. Anlam alanında "(accept'in 3. hali)" gibi 109 dilbilgisi notu var. Öneri: bu kartları kök karta bağlayıp (biçim listesi) havuzdan çıkarmak; örnek cümleleri kök kartta ek örnek olarak tutmak.

| Ünite | Çekimli kart | Kök kart | Çekimli kartın anlamı |
|---|---|---|---|
| U2 | **shipping** | ship (U2) | sevkiyat, kargo |
| U2 | **following** | follow (U1) | ardından, -in akabinde |
| U2 | **resources** | resource (U1) | kaynaklar |
| U6 | **tools** | tool (U1) | araçlar, aletler |
| U11 | **conditions** | condition (U1) | koşullar, şartlar (condition'ın çoğulu) |
| U7 | **provided** | provide (U1) | sağlamak, temin etmek (provide) |
| U14 | **planning** | plane (U6) | planlama |
| U6 | **hosting** | host (U6) | ev sahipliği yapmak, düzenlemek (host) |
| U7 | **received** | receive (U1) | almak, teslim almak (receive) |
| U6 | **contents** | content (U4) | içindekiler, içerik; muhteviyat |
| U6 | **supplies** | supply (U1) | erzak, malzemeler, ikmal maddeleri |
| U2 | **warning** | warn (U8) | uyarı |
| U9 | **considered** | consider (U1) | kabul edilmek, sayılmak; düşünmek |
| U6 | **contains** | contain (U1) | içermek, kapsamak (contain'in 3. tekil hali) |
| U4 | **proposed** | propose (U3) | önerdi, teklif etti |
| U4 | **established** | establish (U1) | kurdu, tesis etti (establish'in geçmiş hali) |
| U2 | **regarding** | regard (U1) | ile ilgili, hakkında |
| U4 | **offered** | offer (U1) | teklif etti, sundu (offer'ın geçmiş hali) |
| U3 | **beginning** | begin (U1) | başlangıç, baş |
| U8 | **accepted** | accept (U1) | kabul etmek (accept'in 3. hali) |
| U4 | **setting** | set (U1) | (güneş) batmak; ayarlamak; (isim) ortam |
| U7 | **applied** | apply (U7) | başvurdu |
| U8 | **allowed** | allow (U1) | izin vermek (allow'un 3. hali) |
| U7 | **regulations** | regulation (U6) | düzenlemeler, kurallar, mevzuat |
| U8 | **accounts** | account (U8) | oluşturur, oranını teşkil eder (account for) |
| U1 | **others** | other (U1) | diğerleri |
| U1 | **developed** | develop (U1) | gelişmiş (developing: gelişen) |
| U1 | **including** | include (U1) | dahil |
| U1 | **means** | mean (U1) | yol, yöntem, araç |
| U9 | **signed** | sign (U1) | imzaladı; kaydoldu (sign up) |
| U4 | **worked** | work (U1) | çalıştı, üzerinde uğraştı |
| U9 | **finding** | find (U1) | bulgu, sonuç |
| U5 | **strategies** | strategy (U5) | stratejiler |
| U6 | **plants** | plant (U1) | diker, eker (plant fiilinin 3. tekil hali) |
| U6 | **moved** | move (U1) | taşınmak |
| U7 | **extended** | extend (U6) | uzatmak, genişletmek (extend) |
| U8 | **returned** | return (U6) | geri döndü, geri geldi |
| U4 | **estimated** | estimate (U4) | tahmin etti, kestirdi |
| U6 | **winning** | win (U1) | kazanmak (win'in -ing hali) |
| U8 | **reduced** | reduce (U1) | azaltmak (V3 / past); azaltılmış |
| U7 | **delivered** | deliver (U7) | teslim etti (deliver'in 3. hali) |
| U6 | **improved** | improve (U1) | iyileştirmek, gelişmek (improve'un 3. hali) |
| U6 | **finished** | finish (U4) | bitirmek, tamamlamak |
| U9 | **concerned** | concern (U1) | endişeli, kaygılı; ilgili |
| U4 | **conducted** | conduct (U1) | yürüttü, gerçekleştirdi (deney/araştırma) |
| U13 | **experienced** | experience (U1) | deneyimli |
| U2 | **concerning** | concern (U1) | ile ilgili, hakkında |
| U4 | **entered** | enter (U1) | girdi (enter'ın geçmiş hali) |
| U7 | **adopted** | adopt (U11) | benimsemek, kabul etmek (adopt'ın 3. hali / past participle) |
| U7 | **treated** | treat (U1) | tedavi etti; davrandı (treat'in geçmiş hâli) |
| U6 | **reached** | reach (U1) | varmak, ulaşmak |
| U4 | **challenges** | challenge (U1) | zorluklar, güçlükler |
| U6 | **watching** | watch (U1) | izlemek, seyretmek |
| U10 | **collected** | collect (U5) | toplanmak; tahsil edilmek |
| U6 | **findings** | finding (U9) | bulgular, araştırma sonuçları |
| U3 | **drawing** | draw (U4) | çizmek (draw fiilinin -ing hali) |
| U9 | **preferences** | preference (U9) | tercihler, yeğlemeler |
| U7 | **recognized** | recognize (U1) | tanıdı, fark etti |
| U4 | **occurred** | occur (U1) | meydana geldi, gerçekleşti (occur'ın geçmiş hali) |
| U10 | **converted** | convert (U2) | dönüştürmek (convert'in geçmiş/V3 hali) |
| U2 | **considering** | consider (U1) | göz önüne alırsak, düşünüldüğünde |
| U6 | **engineers** | engineer (U1) | mühendisler |
| U6 | **scientists** | scientist (U1) | bilim insanları, bilim adamları |
| U3 | **consists** | consist (U4) | -den oluşmak, ibaret olmak |
| U9 | **prohibited** | prohibit (U9) | yasaklanmış, yasak (prohibit'in geçmiş/edilgen hali) |
| U4 | **discovered** | discover (U1) | keşfetti, buldu |
| U9 | **participating** | participate (U5) | katılma, katılmak (participate'in -ing hali) |
| U7 | **checked** | check (U8) | kontrol etmek (check) |
| U6 | **burning** | burn (U10) | yanmak, yanıyor olmak (burn'ün -ing hali) |
| U4 | **confirmed** | confirm (U5) | doğruladı, onayladı |
| U4 | **arrived** | arrive (U1) | vardı, ulaştı (arrive'ın geçmiş hali) |
| U6 | **replaced** | replace (U6) | yerini almak, değiştirmek (replace'in geçmiş/V3 hali) |
| U6 | **reducing** | reduce (U1) | azaltmak, düşürmek (reduce'in -ing hali) |
| U6 | **restricted** | restrict (U4) | kısıtlı, yasak (giriş izni olmayan) |
| U9 | **enables** | enable (U1) | olanak tanır, mümkün kılar |
| U8 | **expanded** | expand (U1) | genişletmek (V3 / past); genişlemiş |
| U6 | **experiments** | experiment (U1) | deneyler |
| U4 | **founded** | found (U4) | kurdu (found = kurmak fiilinin geçmiş hali) |
| U9 | **implementing** | implement (U9) | uygulama, hayata geçirme (implement'in -ing hali) |
| U4 | **ingredients** | ingredient (U4) | malzemeler, içindekiler |
| U4 | **consequences** | consequence (U1) | sonuçlar, neticeler |
| U1 | **understanding** | understand (U1) | anlama, anlayış |
| U1 | **developing** | develop (U1) | gelişmekte olan |
| U1 | **whereas** | where (U1) | oysa / -e rağmen |
| U1 | **goods** | good (U1) | mal |
| U1 | **interested** | interest (U1) | ilgili, ilgilenen (in) |
| U1 | **nothing** | not (U1) | hiçbir şey |
| U1 | **living** | live (U1) | yaşam, geçim |
| U1 | **leading** | lead (U8) | önde gelen |
| U1 | **engineering** | engineer (U1) | mühendislik |
| U1 | **feeling** | feel (U1) | his / duygu |
| U1 | **meeting** | meet (U1) | toplantı |
| U7 | **revealed** | reveal (U1) | açığa çıkardı, ifşa etti |
| U2 | **cuts** | cut (U1) | kesintiler, kısıntılar |
| U7 | **noticed** | notice (U6) | fark etmek, dikkatini çekmek |
| U6 | **gadgets** | gadget (U6) | aygıtlar, küçük teknolojik cihazlar |
| U3 | **preparing** | prepare (U4) | hazırlanma (prepare: hazırlamak/hazırlanmak) |
| U6 | **secured** | secure (U6) | sağlama aldı, sabitledi, güvenceye aldı |
| U7 | **attended** | attend (U6) | katıldı (attend'in geçmişi/3. hali) |
| U8 | **dropped** | drop (U1) | attı, düşürdü, bıraktı (drop'un geçmiş hali) |
| U7 | **demands** | demand (U1) | talepler, istekler (fiil: talep etmek) |
| U3 | **demonstrated** | demonstrate (U3) | gösterdi / kanıtladı (demonstrate'in 3. hali) |
| U7 | **constructed** | construct (U6) | inşa etti, yaptı (construct'ın geçmiş hâli) |
| U9 | **denied** | deny (U9) | inkar etti, reddetti |
| U7 | **qualifications** | qualification (U7) | nitelikler, yeterlilikler, vasıflar |
| U9 | **hiking** | hike (U5) | doğa yürüyüşü, dağ yürüyüşü |
| U9 | **cultures** | culture (U1) | kültürler |
| U6 | **examined** | examine (U4) | muayene etmek, incelemek (examine'in 3. hali) |
| U4 | **painted** | paint (U9) | resmetti, boyadı (paint'in geçmiş hali) |
| U6 | **suffering** | suffer (U4) | acı çekmek, ızdırap çekmek (suffer) |
| U11 | **difficulties** | difficulty (U1) | zorluklar, güçlükler |
| U8 | **surprised** | surprise (U6) | şaşırmış, hayret etmiş |
| U2 | **excluding** | exclude (U9) | hariç, dışarıda bırakarak |
| U7 | **damaged** | damage (U1) | hasar vermek, zarar vermek (damage'in geçmiş hali) |
| U6 | **studying** | study (U1) | ders çalışmak, çalışmak |
| U8 | **equations** | equation (U8) | denklemler |
| U3 | **collecting** | collect (U5) | toplamak, koleksiyon yapmak |
| U3 | **expanding** | expand (U1) | genişlemek (expand fiilinin -ing hali) |
| U9 | **perspectives** | perspective (U9) | bakış açıları (perspective çoğulu) |
| U3 | **challenging** | challenge (U1) | zorlu, meydan okuyan |
| U7 | **theories** | theory (U1) | teoriler, kuramlar (theory'nin çoğulu) |
| U6 | **admitted** | admit (U6) | kabul etmek, itiraf etmek (admit'in 2./3. hali) |
| U9 | **achieving** | achieve (U1) | başarma, elde etme (achieve'in -ing hali) |
| U6 | **graduates** | graduate (U2) | mezun olur |
| U6 | **injured** | injure (U6) | yaraladı, sakatladı (injure'in geçmiş hali) |
| U4 | **missions** | mission (U6) | görevler; (uzay) seferler |
| U6 | **exploring** | explore (U1) | keşfetmek, araştırmak (explore'un -ing hali) |
| U4 | **suffered** | suffer (U4) | acı çekti, maruz kaldı (suffer'ın geçmiş hali) |
| U7 | **crops** | crop (U11) | ekinler, ürünler (tarım) |
| U7 | **farming** | farm (U8) | çiftçilik, tarım |
| U7 | **distinguished** | distinguish (U6) | ayırt etti, birbirinden ayırdı |
| U6 | **lightning** | light (U1) | şimşek, yıldırım |
| U7 | **searched** | search (U8) | aradı, araştırdı |
| U8 | **suspended** | suspend (U8) | askıya almak, ertelemek (suspend'in 3. hali / sıfat: askıda) |
| U7 | **promised** | promise (U5) | söz verdi (promise: söz vermek) |
| U3 | **threatened** | threaten (U4) | tehdit etti / tehlikeye attı (threaten'in 2. hali) |
| U4 | **argued** | argue (U1) | tartıştı, iddia etti |
| U7 | **sustained** | sustain (U6) | (zarar) uğramak, maruz kalmak; sürdürmek |
| U7 | **inherited** | inherit (U7) | miras aldı, devraldı |
| U4 | **enjoying** | enjoy (U1) | keyfini çıkarmak, hoşlanmak (enjoy) |
| U10 | **competing** | compete (U3) | yarışmak, rekabet etmek |
| U7 | **hired** | hire (U2) | işe aldı, kiraladı (hire'ın geçmiş/3. hali) |
| U6 | **abandoned** | abandon (U12) | terk etti, vazgeçti (abandon'ın 3. hali) |
| U6 | **altered** | alter (U5) | değiştirdi, değişikliğe uğrattı (alter'ın 3. hali) |
| U8 | **encountered** | encounter (U11) | karşılaşmak, rastlamak, denk gelmek |
| U6 | **replacing** | replace (U6) | yerine koymak, değiştirmek (replace'in -ing hali) |
| U9 | **acknowledged** | acknowledge (U9) | kabul etmek, itiraf etmek; teslim etmek |
| U8 | **prefers** | prefer (U1) | tercih eder |
| U6 | **declined** | decline (U1) | azaldı, düştü, geriledi; reddetti |
| U5 | **expired** | expire (U5) | süresi doldu, geçerliliği bitti |
| U4 | **graduated** | graduate (U2) | mezun oldu |
| U6 | **examining** | examine (U4) | incelemek, muayene etmek (examine'in -ing hali) |
| U10 | **promoted** | promote (U10) | terfi ettirilmek; tanıtmak |
| U14 | **promising** | promise (U5) | umut verici |
| U4 | **threatening** | threaten (U4) | tehdit edici, tehlikeli; tehdit eden |
| U6 | **arrives** | arrive (U1) | varmak, ulaşmak |
| U1 | **involved** | involve (U1) | karışmış / ilgili (+in) |
| U1 | **interesting** | interest (U1) | ilginç |
| U1 | **building** | build (U1) | bina, inşaat |
| U1 | **expected** | expect (U1) | beklenen, umulan |
| U1 | **meaning** | mean (U1) | anlam |
| U1 | **training** | train (U1) | eğitim / yetiştirme |
| U1 | **painting** | paint (U9) | resim / tablo |
| U1 | **employee** | employ (U11) | çalışan |
| U1 | **exposed** | expose (U7) | maruz kalmış |
| U1 | **news** | new (U1) | haber / haberler |
| U1 | **advanced** | advance (U1) | ileri düzeyde |
| U1 | **ageing** | age (U1) | yaşlanma |
| U7 | **consuming** | consume (U1) | tüketmek (consume) |
| U11 | **attributed** | attribute (U11) | atfetti, -e bağladı, dayandırdı (attribute X to Y: X'i Y'ye atfetmek) |
| U4 | **eliminated** | eliminate (U5) | ortadan kaldırmak, elemek (eliminate) |
| U4 | **struggling** | struggle (U5) | mücadele etme, uğraşma (struggle: mücadele etmek) |
| U4 | **utilizing** | utilize (U8) | kullanma, yararlanma (utilize: kullanmak) |
| U6 | **evolved** | evolve (U4) | geliştirdi, evrimleştirdi, aşama aşama değiştirdi |
| U6 | **exceeding** | exceed (U3) | aşmak, geçmek (exceed'in -ing hali) |
| U4 | **celebrated** | celebrate (U4) | kutladı |
| U7 | **avoided** | avoid (U1) | kaçınmak, sakınmak, önlemek |
| U7 | **approaching** | approach (U1) | yaklaşmak (approach'in -ing hali) |
| U8 | **accelerated** | accelerate (U8) | hızlandırmak, hızlanmak (accelerate'in 3. hali) |
| U7 | **helmets** | helmet (U7) | kasklar, miğferler (helmet) |
| U7 | **prevented** | prevent (U1) | önlemek, engellemek |
| U4 | **exceeded** | exceed (U3) | aşmak, geçmek (exceed) |
| U7 | **succeeded** | succeed (U7) | başardı; yerine geçti (succeed'in geçmiş hâli) |
| U7 | **booked** | book (U1) | rezerve edilmiş, dolu (rezervasyon) |
| U7 | **obstacles** | obstacle (U9) | engeller, mâniler (obstacle: engel) |
| U6 | **explored** | explore (U1) | keşfetti, araştırdı, inceledi |
| U3 | **preserving** | preserve (U11) | korumak / muhafaza etmek (preserve'in -ing hali) |
| U4 | **invented** | invent (U3) | icat etti (invent'in geçmiş hali) |
| U8 | **freezing** | freeze (U11) | buz gibi, donduran, çok soğuk |
| U7 | **traces** | trace (U7) | izler, emareler |
| U9 | **intends** | intend (U9) | amaçlar, niyetindedir |
| U7 | **serviced** | service (U1) | bakımını yapmak, servise sokmak (service'in 3. hali / past participle) |
| U9 | **arguing** | argue (U1) | tartışma, tartışmak (argue'nin -ing hali) |
| U6 | **struggles** | struggle (U5) | zorlanır, uğraşır (struggle'ın geniş zaman hali) |
| U8 | **enforced** | enforce (U6) | uygulamak, yürürlüğe koymak (enforce'un 3. hali) |
| U9 | **cleansing** | clean (U5) | temizlik, arındırma |
| U8 | **triggered** | trigger (U3) | tetikledi, harekete geçirdi (trigger'ın V2/V3 hali) |
| U6 | **destroying** | destroy (U1) | yıkmak, yok etmek |
| U9 | **neglected** | neglect (U8) | ihmal etti, savsakladı (neglect'in geçmiş hali) |
| U4 | **collapsed** | collapse (U7) | yığıldı, çöktü, yıkıldı (collapse'in geçmiş hali) |
| U9 | **mastering** | master (U9) | ustalaşma, hakim olma (master'ın -ing hali) |
| U7 | **feared** | fear (U1) | korktu, endişe etti (fear'in geçmiş hali) |
| U6 | **repaired** | repair (U3) | tamir etmek, onarmak (repair'in geçmiş/V3 hali) |
| U4 | **travelled** | travel (U1) | seyahat etti |
| U10 | **blamed** | blame (U10) | suçladı, kabahati yükledi |
| U10 | **criticized** | criticize (U8) | eleştirilmek |
| U7 | **struggled** | struggle (U5) | zorlandı, mücadele etti |
| U6 | **cured** | cure (U5) | iyileştirdi, tedavi etti, şifa buldu |
| U4 | **climbed** | climb (U7) | tırmandı |
| U9 | **gatherings** | gathering (U9) | toplantılar, bir araya gelmeler (gathering çoğulu) |
| U6 | **altering** | alter (U5) | değiştirmek, tadil etmek (alter'in -ing hali) |
| U7 | **neighbouring** | neighbour (U8) | komşu, bitişik, yakın |
| U10 | **sinking** | sink (U10) | batmak (sink fiilinin -ing hali); batma |
| U7 | **lacked** | lack (U1) | yoksun olmak, eksikti |
| U4 | **restricting** | restrict (U4) | kısıtlama, sınırlama (restrict: kısıtlamak) |
| U4 | **departed** | depart (U5) | ayrıldı, hareket etti (kalkış) |
| U7 | **parasites** | parasite (U9) | parazitler, asalaklar |
| U6 | **navigating** | navigate (U6) | yön bulma, gezinme; (mecazi) idare etme |
| U6 | **stumbled** | stumble (U6) | tökezledi; (upon ile) tesadüfen rastladı |
| U3 | **exposes** | expose (U7) | açığa çıkarmak, maruz bırakmak, ifşa etmek |
| U6 | **allocating** | allocate (U5) | tahsis etme, ayırma (kaynak/bütçe) |
| U9 | **regrets** | regret (U2) | pişman olur, üzüntü duyar |
| U7 | **competed** | compete (U3) | yarıştı, rekabet etti |
| U6 | **practising** | practise (U6) | pratik yapmak, alıştırma yapmak (practise'in -ing hali) |
| U9 | **embarked** | embark (U6) | girişti, başladı (embark'ın geçmiş hali) |
| U3 | **boosted** | boost (U4) | artırdı / yükseltti (boost'un 2. hali) |
| U4 | **resisting** | resist (U3) | karşı koymak, direnmek (resist) |
| U7 | **seasoning** | season (U11) | baharat, çeşni, tatlandırıcı |
| U10 | **disqualified** | disqualify (U10) | diskalifiye edilmek, yarışma dışı bırakılmak (disqualify'ın geçmiş/edilgen hali) |
| U3 | **restricts** | restrict (U4) | kısıtlar, sınırlar |
| U6 | **ailments** | ailment (U6) | rahatsızlıklar, hastalıklar (hafif) |
| U9 | **collaborated** | collaborate (U9) | iş birliği yaptı, ortak çalıştı |
| U6 | **artefacts** | artefact (U10) | (insan eliyle yapılmış) eserler, tarihi/arkeolojik nesneler (artefact çoğulu) |
| U7 | **practised** | practise (U6) | alıştırma yaptı, çalıştı (idman) |
| U4 | **watered** | water (U1) | suladı (water fiilinin geçmiş hali) |
| U8 | **undergoes** | undergo (U6) | (bir süreçten) geçer, maruz kalır |
| U6 | **hindered** | hinder (U7) | engelledi, zorlaştırdı (hinder fiilinin geçmiş hali) |
| U7 | **rained** | rain (U7) | yağmur yağmak (rain'in V2/V3 hali) |
| U7 | **eruptions** | eruption (U7) | patlamalar, püskürmeler (volkan) |
| U7 | **apologized** | apologize (U2) | özür diledi |
| U6 | **unearthed** | unearth (U6) | (toprağı kazıp) ortaya çıkarmak, gün yüzüne çıkarmak (unearth fiilinin geçmiş hali) |
| U9 | **regretted** | regret (U2) | pişman oldu (regret'in geçmiş hali) |
| U9 | **boasted** | boast (U9) | övündü, böbürlendi |
| U7 | **chewed** | chew (U7) | çiğnedi, kemirdi |
| U6 | **revolutionized** | revolutionize (U6) | köklü biçimde değiştirmek, devrim yaratmak (revolutionize) |
| U6 | **captivated** | captivate (U6) | büyüledi, hayran bıraktı |
| U4 | **marathons** | marathon (U5) | maratonlar |
| U6 | **hindering** | hinder (U7) | engellemek, ket vurmak (hinder'in -ing hali) |
| U4 | **rehearsed** | rehearse (U4) | prova yaptı |
| U4 | **roamed** | roam (U4) | dolaştı (roam fiilinin geçmiş hâli) |
| U9 | **postpones** | postpone (U8) | erteler (postpone'un geniş zaman hali) |
| U11 | **rusts** | rust (U11) | paslanır (rust fiilinin 3. tekil hali) |

## 6. Kelime başlığı biçimsel pürüzler (7) — KÜÇÜK

Parantez/eğik çizgi içeren başlıklar sözlükte, akışta ve eşleştirmede garip okunuyor ("vital for / to", "deal (with)"); "either ... or" anlamı "ya -- ya --".

| Ünite | Kelime | Anlam | Örnek | Çeviri |
|---|---|---|---|---|
| U4 | **deal (with)** | ele almak, ilgilenmek, baş etmek | The group **dealt** with a plan during the meeting; everyone contributed their ideas. | Grup toplantı sırasında bir planı ele aldı; herkes fikirlerini paylaştı. |
| U1 | **either ... or** | ya -- ya -- | Governments must **either** invest in renewable energy **or** face the severe consequences of climate change. | Hükümetler ya yenilenebilir enerjiye yatırım yapmalı ya da iklim değişikliğinin ciddi sonuçlarıyla karşı karşıya kalmalıdır. |
| U1 | **whether ... or** | ister --- ister / -ıp -madığı | Researchers are still investigating **whether** the new vaccine is effective **or** whether its benefits have been exaggerated. | Araştırmacılar, yeni aşının etkili olup olmadığını ya da faydalarının abartılıp abartılmadığını hâlâ araştırıyorlar. |
| U1 | **vital for / to** | ... için çok önemli/hayati | Access to clean water is **vital** for the survival of every living organism on the planet. | Temiz suya erişim, gezegendeki her canlı organizmanın hayatta kalması için hayati önem taşır. |
| U1 | **crucial for / to** | ...için çok önemli, hayati | Access to quality education is **crucial** **for** the long-term development of any society. | Kaliteli eğitime erişim, herhangi bir toplumun uzun vadeli kalkınması için çok önemlidir. |
| U1 | **available for / to** | ... için ulaşılabilir / kullanıma hazır | The new scholarship program is **available** to all students who demonstrate outstanding academic achievement. | Yeni burs programı, olağanüstü akademik başarı gösteren tüm öğrenciler için ulaşılabilir durumdadır. |
| U1 | **significant for / to** | ... için önemli / kayda değer | These findings are particularly **significant** for researchers who aim to develop sustainable energy solutions. | Bu bulgular, sürdürülebilir enerji çözümleri geliştirmeyi amaçlayan araştırmacılar için özellikle önemlidir. |

## 7. Aynı örnek cümle, aynı vurgu, farklı kartlar (45) — 5 ile bağlantılı

| Kartlar | Cümle |
|---|---|
| hosting / host | Throughout next month, the city will be hosting a series of international cultural festivals. |
| secure / secured | Before the storm hit, we secured all the windows and doors. |
| master / mastering | After years of practice, she succeeded in mastering the art of painting. |
| strategy / strategies | Don't disturb us between 2 and 4 pm. We will be discussing the firm's marketing strategies. |
| graduate / graduate from | after graduating from college |
| finish / finished | As soon as he had finished his breakfast, he went for a morning jog. |
| delivered / deliver | The package could have been delivered to the wrong address. It's not in our mailbox. |
| rain / rained | The grass is dry. It can't have rained last night. |
| confirm / confirmed | The organizers have confirmed the schedule; the festival will take place in July. |
| replace / replaced | By 2050, renewable energy sources will have replaced fossil fuels as the primary global energy supply. |
| perspective / perspectives | The opportunity to travel abroad opened up new perspectives for the students. |
| implement / implementing | The company should discuss implementing new workplace policies. |
| preferences / preference | Shopping for clothes can take a lot of time, depending on one's preferences. |
| consists / consist | The committee consists of members from various departments. |
| prohibited / prohibit | Smoking in public spaces is strictly prohibited by law. |
| ingredients / ingredient | The cake tasted amazing because the baker had used high-quality ingredients. |
| examine / examining | Doctors are examining the patient carefully, and they will diagnose his illness accurately. |
| equation / equations | Frank was able to solve complicated math equations without using pen and paper. |
| gadgets / gadget | By next year, engineers will have been designing advanced gadgets for years. |
| trace / traces | The suspect might have fled the country. The police can't find any traces. |
| denied / deny | The athlete denied having taken any performance-enhancing drugs. |
| qualifications / qualification | He could have applied for the scholarship. His qualifications were perfect. |
| gathering / gatherings | Cooking for family gatherings has always been my passion. |
| injured / injure | Ever since he injured his knee, his performance on the field has declined. |
| blame / blamed | She blamed herself for not having noticed the mistake. |
| sink / sinking | Day by day, New Zealand is sinking into the Pacific Ocean. |
| succeed / succeeded | Without the support of the staff, we couldn't have succeeded in the experiment. |
| inherited / inherit | He might have inherited a fortune. He quit his job unexpectedly. |
| acknowledge / acknowledged | The employee acknowledged having made a mistake. |
| intend / intends | The chef intends to create a new signature dish for the restaurant's menu. |
| expired / expire | She was going to travel abroad, but her passport expired. |
| restrict / restricts | The government restricts access to sensitive areas for security reasons. |
| rust / rusts | If iron is exposed to water and oxygen, it rusts. |
| collaborate / collaborated | The organization collaborated with local communities to address environmental issues. |
| fled / flee | The suspect might have fled the country. The police can't find any traces. |
| chew / chewed | The dog chewed your shoes. You ought to have put them away. |
| practise / practising | The musician had been practising the challenging concerto for months before his performance. |
| stumbled / stumble | They stumbled upon a hidden chamber while they were exploring the ancient ruins. |
| boast / boasted | He boasted about having won the game. |
| eruption / eruptions | Huge volcanic eruptions could have killed tens of thousands of dinosaurs. |
| roam / roamed | The dinosaurs roamed the earth millions of years ago. |
| disqualified / disqualify | You don't want to risk being disqualified before or during the parade. |
| unearthed / unearth | The archeological team has unearthed an ancient civilization's artefacts. |
| revolutionize / revolutionized | In 1492, Leonardo da Vinci revolutionized art and science with his innovative ideas. |
| overslept / oversleep | I ought to have set an alarm. I overslept and missed my flight. |

## Özet ve öneri

- Kesin hata: 16 kart (bölüm 1–3) — elle düzeltilebilir.
- Tasarım sorunu: 97 öbek örnek (bölüm 4) ve 252 çekimli kopya kart (bölüm 5).
- Rastgele 45 kartlık elle okumada anlam/çeviri hatası bulunmadı; tür etiketleri tutarlı (İsim 835, Fiil 668, Sıfat 343, Zarf 148 + bileşikler).
