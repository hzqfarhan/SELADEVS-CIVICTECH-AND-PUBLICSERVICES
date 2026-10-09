import type { Locale } from "./types";
export const fareCopy = {
  loading: ["Loading journey networks…", "Memuatkan rangkaian perjalanan…"],
  dateError: [
    "Enter unique day numbers within this month, matching operating days.",
    "Masukkan nombor hari unik dalam bulan ini yang sepadan dengan hari operasi.",
  ],
  pay: ["Pay per trip", "Bayar setiap perjalanan"],
  withPass: [
    "With pass + uncovered fares",
    "Dengan pas + tambang tidak diliputi",
  ],
  title: ["Fare & transport budget", "Tambang & bajet pengangkutan"],
  profile: ["Passenger profile", "Profil penumpang"],
  citizenship: ["Citizenship", "Kewarganegaraan"],
  unknown: ["Not specified", "Belum ditetapkan"],
  malaysian: ["Malaysian", "Warganegara Malaysia"],
  foreigner: ["Non-Malaysian", "Bukan warganegara Malaysia"],
  adult: ["Adult", "Dewasa"],
  uniformed_student: ["Uniformed school student", "Pelajar sekolah beruniform"],
  senior_over_60: ["Senior, older than 60", "Warga emas melebihi 60 tahun"],
  oku: ["OKU", "OKU"],
  university_student: ["University / college student", "Pelajar IPT"],
  category: ["Passenger category", "Kategori penumpang"],
  half: [
    "I meet the published half-fare conditions",
    "Saya memenuhi syarat tambang separuh harga",
  ],
  card: ["I hold a BAS.MY concession card", "Saya memiliki Kad Konsesi BAS.MY"],
  active: [
    "My card is active and covers this service (self-declared)",
    "Kad saya aktif dan meliputi perkhidmatan ini (pengakuan sendiri)",
  ],
  disclaimer: [
    "Estimate only. Actual fares follow the operator's official fare table.",
    "Anggaran sahaja. Tambang sebenar mengikut jadual tambang rasmi pengendali.",
  ],
  source: ["Official fare information", "Maklumat tambang rasmi"],
  total: ["Estimated journey fare", "Anggaran tambang perjalanan"],
  known: [
    "Known fares · some legs unavailable",
    "Tambang diketahui · sebahagian perjalanan tiada data",
  ],
  unavailable: ["Fare data not available yet", "Data tambang belum tersedia"],
  distance: [
    "Fare estimate unavailable because reliable route distance is missing.",
    "Anggaran tambang tiada kerana jarak laluan yang sah tidak tersedia.",
  ],
  add: ["Add to monthly budget", "Tambah ke bajet bulanan"],
  saved: ["Added to Saved → Budget", "Ditambah ke Disimpan → Bajet"],
  budget: ["Monthly budget", "Bajet bulanan"],
  limit: ["Monthly limit (RM)", "Had bulanan (RM)"],
  month: ["Budget month", "Bulan bajet"],
  trips: ["Journeys per operating day", "Perjalanan setiap hari operasi"],
  days: ["Operating days this month", "Hari operasi bulan ini"],
  one_way: ["One way", "Sehala"],
  return: [
    "Return · both directions resolved separately",
    "Pergi balik · arah dikira berasingan",
  ],
  remove: ["Remove trip", "Padam perjalanan"],
  enabled: ["Include this trip", "Sertakan perjalanan ini"],
  empty: [
    "Plan a journey and add it here to compare your recurring travel costs.",
    "Rancang perjalanan dan tambah di sini untuk mengira kos perjalanan berulang.",
  ],
  incomplete: [
    "Partial estimate · unknown fares are not zero",
    "Anggaran separa · tambang tidak diketahui bukan sifar",
  ],
  update_trip: [
    "Route or stop changed. Re-plan this journey.",
    "Laluan atau hentian berubah. Rancang semula perjalanan.",
  ],
  invalid_days: [
    "Operating days exceed this month’s length.",
    "Hari operasi melebihi panjang bulan ini.",
  ],
  under: ["Under budget", "Di bawah bajet"],
  over: ["Over budget", "Melebihi bajet"],
  at: ["At budget", "Mencapai had bajet"],
  unconfigured: ["Set a monthly limit", "Tetapkan had bulanan"],
  projected: [
    "Projected spending · not recorded transactions",
    "Unjuran perbelanjaan · bukan transaksi sebenar",
  ],
  pass: ["Kad 30 Hari · RM30 / 30 days", "Kad 30 Hari · RM30 / 30 hari"],
  passUnavailable: [
    "Pass comparison unavailable: city coverage and travel dates must be confirmed. A 30-day pass is not automatically a calendar-month pass.",
    "Perbandingan pas belum tersedia: liputan bandar dan tarikh perjalanan perlu disahkan. Pas 30 hari tidak semestinya meliputi satu bulan kalendar.",
  ],
  storage: [
    "Changes are available this session only; device storage is unavailable.",
    "Perubahan untuk sesi ini sahaja; storan peranti tidak tersedia.",
  ],
  local: [
    "Saved on this device. No identity documents required.",
    "Disimpan pada peranti ini. Tiada dokumen identiti diperlukan.",
  ],
  estimate: ["Estimate", "Anggaran"],
  missing_pattern: [
    "Trip distance not available",
    "Jarak perjalanan tidak tersedia",
  ],
  rules: ["Distance rule", "Peraturan jarak"],
  concession: [
    "Confirmed concession selection",
    "Pilihan konsesi disahkan pengguna",
  ],
  route_override: ["Route fare table", "Jadual tambang laluan"],
  unsupported_operator: [
    "Fare data not available yet",
    "Data tambang belum tersedia",
  ],
  unverified_city: [
    "Fare rules not verified for this city",
    "Peraturan tambang bandar ini belum disahkan",
  ],
  invalid_configuration: [
    "Fare configuration unavailable or expired",
    "Konfigurasi tambang tiada atau tamat tempoh",
  ],
  unresolved_override: [
    "Route fare table requires verification",
    "Jadual tambang laluan perlu disahkan",
  ],
  demo_distance: [
    "Demo routes are not used for fare estimates",
    "Laluan demo tidak digunakan untuk anggaran tambang",
  ],
  invalid_distance: ["Route distance is invalid", "Jarak laluan tidak sah"],
  missing_distance: [
    "Reliable route distance unavailable",
    "Jarak laluan sah tidak tersedia",
  ],
  reset: ["Reset budget", "Tetapkan semula bajet"],
  balance: ["Remaining / over budget (RM)", "Baki / lebihan bajet (RM)"],
  dates: [
    "Travel dates (day numbers, comma-separated)",
    "Tarikh perjalanan (nombor hari dipisahkan koma)",
  ],
  activation: ["Pass activation day", "Hari pengaktifan pas"],
  saving: ["Potential saving", "Potensi penjimatan"],
  breakEven: ["Break-even journeys", "Perjalanan pulang modal"],
  never: [
    "Not reached in selected trips",
    "Tidak tercapai dalam perjalanan dipilih",
  ],
} as const;
export type FareCopyKey = keyof typeof fareCopy;
export const ft = (locale: Locale, key: FareCopyKey) =>
  fareCopy[key][locale === "ms" ? 1 : 0];
