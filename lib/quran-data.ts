export type Surah = {
  number: number
  name: string
  englishName: string
  englishNameTranslation: string
  ayahs: number
  type: 'مكية' | 'مدنية'
  page: number
  juz: number
}

export const SURAHS: Surah[] = [
  { number: 1, name: 'الفاتحة', englishName: 'Al-Fatiha', englishNameTranslation: 'The Opening', ayahs: 7, type: 'مكية', page: 1, juz: 1 },
  { number: 2, name: 'البقرة', englishName: 'Al-Baqarah', englishNameTranslation: 'The Cow', ayahs: 286, type: 'مدنية', page: 2, juz: 1 },
  { number: 3, name: 'آل عمران', englishName: 'Aal-Imran', englishNameTranslation: 'The Family of Imran', ayahs: 200, type: 'مدنية', page: 50, juz: 3 },
  { number: 4, name: 'النساء', englishName: 'An-Nisa', englishNameTranslation: 'The Women', ayahs: 176, type: 'مدنية', page: 77, juz: 4 },
  { number: 5, name: 'المائدة', englishName: 'Al-Maidah', englishNameTranslation: 'The Table Spread', ayahs: 120, type: 'مدنية', page: 106, juz: 6 },
  { number: 6, name: 'الأنعام', englishName: 'Al-Anam', englishNameTranslation: 'The Cattle', ayahs: 165, type: 'مكية', page: 128, juz: 7 },
  { number: 7, name: 'الأعراف', englishName: 'Al-Araf', englishNameTranslation: 'The Heights', ayahs: 206, type: 'مكية', page: 151, juz: 8 },
  { number: 8, name: 'الأنفال', englishName: 'Al-Anfal', englishNameTranslation: 'The Spoils of War', ayahs: 75, type: 'مدنية', page: 177, juz: 9 },
  { number: 9, name: 'التوبة', englishName: 'At-Tawbah', englishNameTranslation: 'The Repentance', ayahs: 129, type: 'مدنية', page: 187, juz: 10 },
  { number: 10, name: 'يونس', englishName: 'Yunus', englishNameTranslation: 'Jonah', ayahs: 109, type: 'مكية', page: 208, juz: 11 },
  { number: 11, name: 'هود', englishName: 'Hud', englishNameTranslation: 'Hud', ayahs: 123, type: 'مكية', page: 221, juz: 11 },
  { number: 12, name: 'يوسف', englishName: 'Yusuf', englishNameTranslation: 'Joseph', ayahs: 111, type: 'مكية', page: 235, juz: 12 },
  { number: 13, name: 'الرعد', englishName: 'Ar-Rad', englishNameTranslation: 'The Thunder', ayahs: 43, type: 'مدنية', page: 249, juz: 13 },
  { number: 14, name: 'إبراهيم', englishName: 'Ibrahim', englishNameTranslation: 'Abraham', ayahs: 52, type: 'مكية', page: 255, juz: 13 },
  { number: 15, name: 'الحجر', englishName: 'Al-Hijr', englishNameTranslation: 'The Rocky Tract', ayahs: 99, type: 'مكية', page: 262, juz: 14 },
  { number: 16, name: 'النحل', englishName: 'An-Nahl', englishNameTranslation: 'The Bee', ayahs: 128, type: 'مكية', page: 267, juz: 14 },
  { number: 17, name: 'الإسراء', englishName: 'Al-Isra', englishNameTranslation: 'The Night Journey', ayahs: 111, type: 'مكية', page: 282, juz: 15 },
  { number: 18, name: 'الكهف', englishName: 'Al-Kahf', englishNameTranslation: 'The Cave', ayahs: 110, type: 'مكية', page: 293, juz: 15 },
  { number: 19, name: 'مريم', englishName: 'Maryam', englishNameTranslation: 'Mary', ayahs: 98, type: 'مكية', page: 305, juz: 16 },
  { number: 20, name: 'طه', englishName: 'Taha', englishNameTranslation: 'Ta-Ha', ayahs: 135, type: 'مكية', page: 312, juz: 16 },
  { number: 21, name: 'الأنبياء', englishName: 'Al-Anbiya', englishNameTranslation: 'The Prophets', ayahs: 112, type: 'مكية', page: 322, juz: 17 },
  { number: 22, name: 'الحج', englishName: 'Al-Hajj', englishNameTranslation: 'The Pilgrimage', ayahs: 78, type: 'مدنية', page: 332, juz: 17 },
  { number: 23, name: 'المؤمنون', englishName: 'Al-Muminun', englishNameTranslation: 'The Believers', ayahs: 118, type: 'مكية', page: 342, juz: 18 },
  { number: 24, name: 'النور', englishName: 'An-Nur', englishNameTranslation: 'The Light', ayahs: 64, type: 'مدنية', page: 350, juz: 18 },
  { number: 25, name: 'الفرقان', englishName: 'Al-Furqan', englishNameTranslation: 'The Criterion', ayahs: 77, type: 'مكية', page: 359, juz: 18 },
  { number: 26, name: 'الشعراء', englishName: 'Ash-Shuara', englishNameTranslation: 'The Poets', ayahs: 227, type: 'مكية', page: 367, juz: 19 },
  { number: 27, name: 'النمل', englishName: 'An-Naml', englishNameTranslation: 'The Ant', ayahs: 93, type: 'مكية', page: 377, juz: 19 },
  { number: 28, name: 'القصص', englishName: 'Al-Qasas', englishNameTranslation: 'The Stories', ayahs: 88, type: 'مكية', page: 385, juz: 20 },
  { number: 29, name: 'العنكبوت', englishName: 'Al-Ankabut', englishNameTranslation: 'The Spider', ayahs: 69, type: 'مكية', page: 396, juz: 20 },
  { number: 30, name: 'الروم', englishName: 'Ar-Rum', englishNameTranslation: 'The Romans', ayahs: 60, type: 'مكية', page: 404, juz: 21 },
  { number: 31, name: 'لقمان', englishName: 'Luqman', englishNameTranslation: 'Luqman', ayahs: 34, type: 'مكية', page: 411, juz: 21 },
  { number: 32, name: 'السجدة', englishName: 'As-Sajdah', englishNameTranslation: 'The Prostration', ayahs: 30, type: 'مكية', page: 415, juz: 21 },
  { number: 33, name: 'الأحزاب', englishName: 'Al-Ahzab', englishNameTranslation: 'The Combined Forces', ayahs: 73, type: 'مدنية', page: 418, juz: 21 },
  { number: 34, name: 'سبأ', englishName: 'Saba', englishNameTranslation: 'Sheba', ayahs: 54, type: 'مكية', page: 428, juz: 22 },
  { number: 35, name: 'فاطر', englishName: 'Fatir', englishNameTranslation: 'Originator', ayahs: 45, type: 'مكية', page: 434, juz: 22 },
  { number: 36, name: 'يس', englishName: 'Yasin', englishNameTranslation: 'Ya Sin', ayahs: 83, type: 'مكية', page: 440, juz: 22 },
  { number: 37, name: 'الصافات', englishName: 'As-Saffat', englishNameTranslation: 'Those who set the Ranks', ayahs: 182, type: 'مكية', page: 446, juz: 23 },
  { number: 38, name: 'ص', englishName: 'Sad', englishNameTranslation: 'The Letter Sad', ayahs: 88, type: 'مكية', page: 453, juz: 23 },
  { number: 39, name: 'الزمر', englishName: 'Az-Zumar', englishNameTranslation: 'The Troops', ayahs: 75, type: 'مكية', page: 458, juz: 23 },
  { number: 40, name: 'غافر', englishName: 'Ghafir', englishNameTranslation: 'The Forgiver', ayahs: 85, type: 'مكية', page: 467, juz: 24 },
  { number: 41, name: 'فصلت', englishName: 'Fussilat', englishNameTranslation: 'Explained in Detail', ayahs: 54, type: 'مكية', page: 477, juz: 24 },
  { number: 42, name: 'الشورى', englishName: 'Ash-Shuraa', englishNameTranslation: 'The Consultation', ayahs: 53, type: 'مكية', page: 483, juz: 25 },
  { number: 43, name: 'الزخرف', englishName: 'Az-Zukhruf', englishNameTranslation: 'The Ornaments of Gold', ayahs: 89, type: 'مكية', page: 489, juz: 25 },
  { number: 44, name: 'الدخان', englishName: 'Ad-Dukhan', englishNameTranslation: 'The Smoke', ayahs: 59, type: 'مكية', page: 496, juz: 25 },
  { number: 45, name: 'الجاثية', englishName: 'Al-Jathiyah', englishNameTranslation: 'The Crouching', ayahs: 37, type: 'مكية', page: 499, juz: 25 },
  { number: 46, name: 'الأحقاف', englishName: 'Al-Ahqaf', englishNameTranslation: 'The Wind-Curved Sandhills', ayahs: 35, type: 'مكية', page: 502, juz: 26 },
  { number: 47, name: 'محمد', englishName: 'Muhammad', englishNameTranslation: 'Muhammad', ayahs: 38, type: 'مدنية', page: 507, juz: 26 },
  { number: 48, name: 'الفتح', englishName: 'Al-Fath', englishNameTranslation: 'The Victory', ayahs: 29, type: 'مدنية', page: 511, juz: 26 },
  { number: 49, name: 'الحجرات', englishName: 'Al-Hujurat', englishNameTranslation: 'The Rooms', ayahs: 18, type: 'مدنية', page: 515, juz: 26 },
  { number: 50, name: 'ق', englishName: 'Qaf', englishNameTranslation: 'The Letter Qaf', ayahs: 45, type: 'مكية', page: 518, juz: 26 },
  { number: 51, name: 'الذاريات', englishName: 'Adh-Dhariyat', englishNameTranslation: 'The Winnowing Winds', ayahs: 60, type: 'مكية', page: 520, juz: 26 },
  { number: 52, name: 'الطور', englishName: 'At-Tur', englishNameTranslation: 'The Mount', ayahs: 49, type: 'مكية', page: 523, juz: 27 },
  { number: 53, name: 'النجم', englishName: 'An-Najm', englishNameTranslation: 'The Star', ayahs: 62, type: 'مكية', page: 526, juz: 27 },
  { number: 54, name: 'القمر', englishName: 'Al-Qamar', englishNameTranslation: 'The Moon', ayahs: 55, type: 'مكية', page: 528, juz: 27 },
  { number: 55, name: 'الرحمن', englishName: 'Ar-Rahman', englishNameTranslation: 'The Beneficent', ayahs: 78, type: 'مدنية', page: 531, juz: 27 },
  { number: 56, name: 'الواقعة', englishName: 'Al-Waqiah', englishNameTranslation: 'The Inevitable', ayahs: 96, type: 'مكية', page: 534, juz: 27 },
  { number: 57, name: 'الحديد', englishName: 'Al-Hadid', englishNameTranslation: 'The Iron', ayahs: 29, type: 'مدنية', page: 537, juz: 27 },
  { number: 58, name: 'المجادلة', englishName: 'Al-Mujadila', englishNameTranslation: 'The Pleading Woman', ayahs: 22, type: 'مدنية', page: 542, juz: 28 },
  { number: 59, name: 'الحشر', englishName: 'Al-Hashr', englishNameTranslation: 'The Exile', ayahs: 24, type: 'مدنية', page: 545, juz: 28 },
  { number: 60, name: 'الممتحنة', englishName: 'Al-Mumtahanah', englishNameTranslation: 'She that is to be examined', ayahs: 13, type: 'مدنية', page: 549, juz: 28 },
  { number: 61, name: 'الصف', englishName: 'As-Saf', englishNameTranslation: 'The Ranks', ayahs: 14, type: 'مدنية', page: 551, juz: 28 },
  { number: 62, name: 'الجمعة', englishName: 'Al-Jumuah', englishNameTranslation: 'The Congregation', ayahs: 11, type: 'مدنية', page: 553, juz: 28 },
  { number: 63, name: 'المنافقون', englishName: 'Al-Munafiqun', englishNameTranslation: 'The Hypocrites', ayahs: 11, type: 'مدنية', page: 554, juz: 28 },
  { number: 64, name: 'التغابن', englishName: 'At-Taghabun', englishNameTranslation: 'The Mutual Disillusion', ayahs: 18, type: 'مدنية', page: 556, juz: 28 },
  { number: 65, name: 'الطلاق', englishName: 'At-Talaq', englishNameTranslation: 'The Divorce', ayahs: 12, type: 'مدنية', page: 558, juz: 28 },
  { number: 66, name: 'التحريم', englishName: 'At-Tahrim', englishNameTranslation: 'The Prohibition', ayahs: 12, type: 'مدنية', page: 560, juz: 28 },
  { number: 67, name: 'الملك', englishName: 'Al-Mulk', englishNameTranslation: 'The Sovereignty', ayahs: 30, type: 'مكية', page: 562, juz: 29 },
  { number: 68, name: 'القلم', englishName: 'Al-Qalam', englishNameTranslation: 'The Pen', ayahs: 52, type: 'مكية', page: 564, juz: 29 },
  { number: 69, name: 'الحاقة', englishName: 'Al-Haaqah', englishNameTranslation: 'The Reality', ayahs: 52, type: 'مكية', page: 566, juz: 29 },
  { number: 70, name: 'المعارج', englishName: 'Al-Maarij', englishNameTranslation: 'The Ascending Stairways', ayahs: 44, type: 'مكية', page: 568, juz: 29 },
  { number: 71, name: 'نوح', englishName: 'Nuh', englishNameTranslation: 'Noah', ayahs: 28, type: 'مكية', page: 570, juz: 29 },
  { number: 72, name: 'الجن', englishName: 'Al-Jinn', englishNameTranslation: 'The Jinn', ayahs: 28, type: 'مكية', page: 572, juz: 29 },
  { number: 73, name: 'المزمل', englishName: 'Al-Muzzammil', englishNameTranslation: 'The Enshrouded One', ayahs: 20, type: 'مكية', page: 574, juz: 29 },
  { number: 74, name: 'المدثر', englishName: 'Al-Muddaththir', englishNameTranslation: 'The Cloaked One', ayahs: 56, type: 'مكية', page: 575, juz: 29 },
  { number: 75, name: 'القيامة', englishName: 'Al-Qiyamah', englishNameTranslation: 'The Resurrection', ayahs: 40, type: 'مكية', page: 577, juz: 29 },
  { number: 76, name: 'الإنسان', englishName: 'Al-Insan', englishNameTranslation: 'The Man', ayahs: 31, type: 'مدنية', page: 578, juz: 29 },
  { number: 77, name: 'المرسلات', englishName: 'Al-Mursalat', englishNameTranslation: 'The Emissaries', ayahs: 50, type: 'مكية', page: 580, juz: 29 },
  { number: 78, name: 'النبأ', englishName: 'An-Naba', englishNameTranslation: 'The Tidings', ayahs: 40, type: 'مكية', page: 582, juz: 30 },
  { number: 79, name: 'النازعات', englishName: 'An-Naziat', englishNameTranslation: 'Those who drag forth', ayahs: 46, type: 'مكية', page: 583, juz: 30 },
  { number: 80, name: 'عبس', englishName: 'Abasa', englishNameTranslation: 'He Frowned', ayahs: 42, type: 'مكية', page: 585, juz: 30 },
  { number: 81, name: 'التكوير', englishName: 'At-Takwir', englishNameTranslation: 'The Overthrowing', ayahs: 29, type: 'مكية', page: 586, juz: 30 },
  { number: 82, name: 'الانفطار', englishName: 'Al-Infitar', englishNameTranslation: 'The Cleaving', ayahs: 19, type: 'مكية', page: 587, juz: 30 },
  { number: 83, name: 'المطففين', englishName: 'Al-Mutaffifin', englishNameTranslation: 'The Defrauding', ayahs: 36, type: 'مكية', page: 587, juz: 30 },
  { number: 84, name: 'الانشقاق', englishName: 'Al-Inshiqaq', englishNameTranslation: 'The Sundering', ayahs: 25, type: 'مكية', page: 589, juz: 30 },
  { number: 85, name: 'البروج', englishName: 'Al-Buruj', englishNameTranslation: 'The Mansions of the Stars', ayahs: 22, type: 'مكية', page: 590, juz: 30 },
  { number: 86, name: 'الطارق', englishName: 'At-Tariq', englishNameTranslation: 'The Nightcomer', ayahs: 17, type: 'مكية', page: 591, juz: 30 },
  { number: 87, name: 'الأعلى', englishName: 'Al-Ala', englishNameTranslation: 'The Most High', ayahs: 19, type: 'مكية', page: 591, juz: 30 },
  { number: 88, name: 'الغاشية', englishName: 'Al-Ghashiyah', englishNameTranslation: 'The Overwhelming', ayahs: 26, type: 'مكية', page: 592, juz: 30 },
  { number: 89, name: 'الفجر', englishName: 'Al-Fajr', englishNameTranslation: 'The Dawn', ayahs: 30, type: 'مكية', page: 593, juz: 30 },
  { number: 90, name: 'البلد', englishName: 'Al-Balad', englishNameTranslation: 'The City', ayahs: 20, type: 'مكية', page: 594, juz: 30 },
  { number: 91, name: 'الشمس', englishName: 'Ash-Shams', englishNameTranslation: 'The Sun', ayahs: 15, type: 'مكية', page: 595, juz: 30 },
  { number: 92, name: 'الليل', englishName: 'Al-Layl', englishNameTranslation: 'The Night', ayahs: 21, type: 'مكية', page: 595, juz: 30 },
  { number: 93, name: 'الضحى', englishName: 'Ad-Duhaa', englishNameTranslation: 'The Morning Hours', ayahs: 11, type: 'مكية', page: 596, juz: 30 },
  { number: 94, name: 'الشرح', englishName: 'Ash-Sharh', englishNameTranslation: 'The Relief', ayahs: 8, type: 'مكية', page: 596, juz: 30 },
  { number: 95, name: 'التين', englishName: 'At-Tin', englishNameTranslation: 'The Fig', ayahs: 8, type: 'مكية', page: 597, juz: 30 },
  { number: 96, name: 'العلق', englishName: 'Al-Alaq', englishNameTranslation: 'The Clot', ayahs: 19, type: 'مكية', page: 597, juz: 30 },
  { number: 97, name: 'القدر', englishName: 'Al-Qadr', englishNameTranslation: 'The Power', ayahs: 5, type: 'مكية', page: 598, juz: 30 },
  { number: 98, name: 'البينة', englishName: 'Al-Bayyinah', englishNameTranslation: 'The Clear Proof', ayahs: 8, type: 'مدنية', page: 598, juz: 30 },
  { number: 99, name: 'الزلزلة', englishName: 'Az-Zalzalah', englishNameTranslation: 'The Earthquake', ayahs: 8, type: 'مدنية', page: 599, juz: 30 },
  { number: 100, name: 'العاديات', englishName: 'Al-Adiyat', englishNameTranslation: 'The Courser', ayahs: 11, type: 'مكية', page: 599, juz: 30 },
  { number: 101, name: 'القارعة', englishName: 'Al-Qariah', englishNameTranslation: 'The Calamity', ayahs: 11, type: 'مكية', page: 600, juz: 30 },
  { number: 102, name: 'التكاثر', englishName: 'At-Takathur', englishNameTranslation: 'The Rivalry in world increase', ayahs: 8, type: 'مكية', page: 600, juz: 30 },
  { number: 103, name: 'العصر', englishName: 'Al-Asr', englishNameTranslation: 'The Declining Day', ayahs: 3, type: 'مكية', page: 601, juz: 30 },
  { number: 104, name: 'الهمزة', englishName: 'Al-Humazah', englishNameTranslation: 'The Traducer', ayahs: 9, type: 'مكية', page: 601, juz: 30 },
  { number: 105, name: 'الفيل', englishName: 'Al-Fil', englishNameTranslation: 'The Elephant', ayahs: 5, type: 'مكية', page: 601, juz: 30 },
  { number: 106, name: 'قريش', englishName: 'Quraysh', englishNameTranslation: 'Quraysh', ayahs: 4, type: 'مكية', page: 602, juz: 30 },
  { number: 107, name: 'الماعون', englishName: 'Al-Maun', englishNameTranslation: 'The Small Kindnesses', ayahs: 7, type: 'مكية', page: 602, juz: 30 },
  { number: 108, name: 'الكوثر', englishName: 'Al-Kawthar', englishNameTranslation: 'The Abundance', ayahs: 3, type: 'مكية', page: 602, juz: 30 },
  { number: 109, name: 'الكافرون', englishName: 'Al-Kafirun', englishNameTranslation: 'The Disbelievers', ayahs: 6, type: 'مكية', page: 603, juz: 30 },
  { number: 110, name: 'النصر', englishName: 'An-Nasr', englishNameTranslation: 'The Divine Support', ayahs: 3, type: 'مدنية', page: 603, juz: 30 },
  { number: 111, name: 'المسد', englishName: 'Al-Masad', englishNameTranslation: 'The Palm Fibre', ayahs: 5, type: 'مكية', page: 603, juz: 30 },
  { number: 112, name: 'الإخلاص', englishName: 'Al-Ikhlas', englishNameTranslation: 'The Sincerity', ayahs: 4, type: 'مكية', page: 604, juz: 30 },
  { number: 113, name: 'الفلق', englishName: 'Al-Falaq', englishNameTranslation: 'The Daybreak', ayahs: 5, type: 'مكية', page: 604, juz: 30 },
  { number: 114, name: 'الناس', englishName: 'An-Nas', englishNameTranslation: 'Mankind', ayahs: 6, type: 'مكية', page: 604, juz: 30 },
]

export const RECITERS = [
  { id: 'ar.alafasy', name: 'مشاري العفاسي' },
  { id: 'ar.abdurrahmaansudais', name: 'عبد الرحمن السديس' },
  { id: 'ar.husary', name: 'محمود خليل الحصري' },
  { id: 'ar.minshawi', name: 'محمد صديق المنشاوي' },
  { id: 'ar.shaatree', name: 'أبو بكر الشاطري' },
]

export const GAME_AYAHS = [
  { surah: 1, name: 'الفاتحة', ayahs: [
    { n: 1, t: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ' },
    { n: 2, t: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ' },
    { n: 3, t: 'الرَّحْمَٰنِ الرَّحِيمِ' },
    { n: 4, t: 'مَالِكِ يَوْمِ الدِّينِ' },
    { n: 5, t: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ' },
    { n: 6, t: 'اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ' },
    { n: 7, t: 'صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ' },
  ]},
  { surah: 112, name: 'الإخلاص', ayahs: [
    { n: 1, t: 'قُلْ هُوَ اللَّهُ أَحَدٌ' },
    { n: 2, t: 'اللَّهُ الصَّمَدُ' },
    { n: 3, t: 'لَمْ يَلِدْ وَلَمْ يُولَدْ' },
    { n: 4, t: 'وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ' },
  ]},
  { surah: 113, name: 'الفلق', ayahs: [
    { n: 1, t: 'قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ' },
    { n: 2, t: 'مِن شَرِّ مَا خَلَقَ' },
    { n: 3, t: 'وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ' },
    { n: 4, t: 'وَمِن شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ' },
    { n: 5, t: 'وَمِن شَرِّ حَاسِدٍ إِذَا حَسَدَ' },
  ]},
  { surah: 114, name: 'الناس', ayahs: [
    { n: 1, t: 'قُلْ أَعُوذُ بِرَبِّ النَّاسِ' },
    { n: 2, t: 'مَلِكِ النَّاسِ' },
    { n: 3, t: 'إِلَٰهِ النَّاسِ' },
    { n: 4, t: 'مِن شَرِّ الْوَسْوَاسِ الْخَنَّاسِ' },
    { n: 5, t: 'الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ' },
    { n: 6, t: 'مِنَ الْجِنَّةِ وَالنَّاسِ' },
  ]},
  { surah: 108, name: 'الكوثر', ayahs: [
    { n: 1, t: 'إِنَّا أَعْطَيْنَاكَ الْكَوْثَرَ' },
    { n: 2, t: 'فَصَلِّ لِرَبِّكَ وَانْحَرْ' },
    { n: 3, t: 'إِنَّ شَانِئَكَ هُوَ الْأَبْتَرُ' },
  ]},
  { surah: 110, name: 'النصر', ayahs: [
    { n: 1, t: 'إِذَا جَاءَ نَصْرُ اللَّهِ وَالْفَتْحُ' },
    { n: 2, t: 'وَرَأَيْتَ النَّاسَ يَدْخُلُونَ فِي دِينِ اللَّهِ أَفْوَاجًا' },
    { n: 3, t: 'فَسَبِّحْ بِحَمْدِ رَبِّكَ وَاسْتَغْفِرْهُ إِنَّهُ كَانَ تَوَّابًا' },
  ]},
  { surah: 103, name: 'العصر', ayahs: [
    { n: 1, t: 'وَالْعَصْرِ' },
    { n: 2, t: 'إِنَّ الْإِنسَانَ لَفِي خُسْرٍ' },
    { n: 3, t: 'إِلَّا الَّذِينَ آمَنُوا وَعَمِلُوا الصَّالِحَاتِ وَتَوَاصَوْا بِالْحَقِّ وَتَوَاصَوْا بِالصَّبْرِ' },
  ]},
  { surah: 97, name: 'القدر', ayahs: [
    { n: 1, t: 'إِنَّا أَنزَلْنَاهُ فِي لَيْلَةِ الْقَدْرِ' },
    { n: 2, t: 'وَمَا أَدْرَاكَ مَا لَيْلَةُ الْقَدْرِ' },
    { n: 3, t: 'لَيْلَةُ الْقَدْرِ خَيْرٌ مِّنْ أَلْفِ شَهْرٍ' },
    { n: 4, t: 'تَنَزَّلُ الْمَلَائِكَةُ وَالرُّوحُ فِيهَا بِإِذْنِ رَبِّهِم مِّن كُلِّ أَمْرٍ' },
    { n: 5, t: 'سَلَامٌ هِيَ حَتَّىٰ مَطْلَعِ الْفَجْرِ' },
  ]},
]

export function getAudioUrl(reciterId: string, globalAyahNum: number): string {
  return `https://cdn.islamic.network/quran/audio/128/${reciterId}/${String(globalAyahNum).padStart(6, '0')}.mp3`
}

export function getSurahByNumber(n: number): Surah | undefined {
  return SURAHS.find(s => s.number === n)
}

export function searchSurahs(q: string): Surah[] {
  if (!q.trim()) return SURAHS
  const lq = q.toLowerCase()
  return SURAHS.filter(s =>
    s.name.includes(q) || s.englishName.toLowerCase().includes(lq) || String(s.number).includes(q)
  )
}
