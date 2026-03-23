# Implementation Plan: Turkish Annual Leave Law

## Overview

Bu plan, Absenta uygulamasına 4857 sayılı İş Kanunu'na uygun yıllık izin hesaplama mantığını ekler. Uygulama sırasıyla: TypeScript tipleri, saf hesaplama fonksiyonları, servis katmanı, veritabanı değişiklikleri, Redux entegrasyonu ve UI bileşenleri olarak ilerleyecektir. `fast-check` kütüphanesi property-based testler için kullanılacaktır.

## Tasks

- [x] 1. TypeScript tipleri ve proje yapısını oluştur
  - [x] 1.1 `src/types/index.ts` dosyasına `SeniorityTier`, `EnhancedLeaveBalanceSummary`, `CollectiveLeave` tiplerini ekle ve `User` interface'ine `birth_date?: string` alanını ekle
    - `SeniorityTier = 'ineligible' | 'tier1' | 'tier2' | 'tier3'`
    - `EnhancedLeaveBalanceSummary` extends `LeaveBalanceSummary` with `base_entitlement`, `carried_over`, `negative_from_previous`, `seniority_tier`, `seniority_years`, `age_at_period_start`, `is_age_eligible`
    - `CollectiveLeave` interface with `id`, `company_id`, `start_date`, `end_date`, `total_days`, `scope`, `scope_id`, `created_by`, `created_at`
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 5.1, 8.1_
  - [x] 1.2 `fast-check` paketini dev dependency olarak ekle
    - `npm install --save-dev fast-check`
    - _Requirements: Testing altyapısı_

- [x] 2. EntitlementCalculator modülünü implement et
  - [x] 2.1 `src/utils/entitlementCalculator.ts` dosyasını oluştur
    - `calculateSeniorityYears(hireDate, referenceDate)` — iki tarih arası tam yıl hesaplama
    - `getSeniorityTier(seniorityYears)` — kıdem yılına göre kademe belirleme
    - `getBaseDaysByTier(tier)` — kademeye göre gün sayısı (0, 14, 20, 26)
    - `calculateAge(birthDate, referenceDate)` — yaş hesaplama
    - `isAgeEligibleForMinimum(age)` — ≤18 veya ≥50 kontrolü
    - `calculateEntitlement(input: EntitlementInput)` — tüm mantığı birleştiren ana fonksiyon
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3_
  - [ ]* 2.2 Property test: Ineligible employees receive zero entitlement
    - **Property 1: Ineligible employees receive zero entitlement**
    - **Validates: Requirements 1.1, 1.2**
  - [ ]* 2.3 Property test: Seniority tier maps to correct entitlement days
    - **Property 2: Seniority tier maps to correct entitlement days**
    - **Validates: Requirements 2.1, 2.2, 2.3**
  - [ ]* 2.4 Property test: Tier boundary applies from next period
    - **Property 3: Tier boundary applies from next period**
    - **Validates: Requirements 2.4**
  - [ ]* 2.5 Property test: Age-based minimum is the greater of seniority entitlement and 20 days
    - **Property 4: Age-based minimum is the greater of seniority entitlement and 20 days**
    - **Validates: Requirements 3.1, 3.2, 3.3**

- [x] 3. LeaveDayCounter modülünü implement et
  - [x] 3.1 `src/utils/leaveDayCounter.ts` dosyasını oluştur
    - `expandHolidayRanges(holidays)` — `holiday_date` ile `holiday_end_date` arasındaki tüm tarihleri `Set<string>` olarak döndür
    - `isExcludedDate(date, holidaySet)` — hafta sonu veya tatil kontrolü
    - `countLeaveDays(input: LeaveDayCountInput)` — net iş günü hesaplama
    - Mevcut `calculateBusinessDays` fonksiyonunu kullanarak genişlet, çok günlü tatil desteği ekle
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  - [ ]* 3.2 Property test: Leave day count excludes all weekends and holidays
    - **Property 5: Leave day count excludes all weekends and holidays**
    - **Validates: Requirements 4.1, 4.2**
  - [ ]* 3.3 Property test: Adding holidays does not increase leave day count
    - **Property 6: Adding holidays to a leave range does not increase the leave day count**
    - **Validates: Requirements 4.3**

- [x] 4. Checkpoint — Temel hesaplama modüllerini doğrula
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. BalanceService'i genişlet (carryover, negatif bakiye, kıdem bazlı hesaplama)
  - [x] 5.1 `src/services/balance.ts` dosyasındaki `getBalances` fonksiyonunu güncelle
    - `EntitlementCalculator` kullanarak `base_entitlement` hesapla (yıllık izin tipi için)
    - `birthDate` parametresini fonksiyon imzasına ekle
    - `carried_over` ve `negative_from_previous` alanlarını `leave_balances` tablosundan oku
    - `allocated_days = base_entitlement + carried_over - negative_from_previous` formülünü uygula
    - `EnhancedBalanceSummary` döndür
    - _Requirements: 7.2, 7.3, 8.1, 8.2_
  - [x] 5.2 `calculateCarryover` fonksiyonunu implement et
    - Önceki dönemin `allocated_days`, `used` değerlerini sorgula
    - `carried_over = max(0, previous_allocated - previous_used)`
    - Negatif bakiye varsa `negative_from_previous` olarak kaydet
    - _Requirements: 7.1, 7.2, 6.2_
  - [ ]* 5.3 Property test: Negative balance preserved when collective leave exceeds balance
    - **Property 9: Negative balance is preserved when collective leave exceeds available balance**
    - **Validates: Requirements 6.1**
  - [ ]* 5.4 Property test: Negative balance reduces next period entitlement
    - **Property 10: Negative balance from previous period reduces next period entitlement**
    - **Validates: Requirements 6.2**
  - [ ]* 5.5 Property test: Carryover equals unused days from previous period
    - **Property 11: Carryover equals unused days from previous period**
    - **Validates: Requirements 7.1, 7.2**
  - [ ]* 5.6 Property test: Balance arithmetic consistency
    - **Property 12: Balance arithmetic consistency**
    - **Validates: Requirements 8.1**

- [x] 6. CollectiveLeaveService'i implement et
  - [x] 6.1 `src/services/collectiveLeave.ts` dosyasını oluştur
    - `createCollectiveLeave(input)` — hedef kapsamdaki çalışanları sorgula, `LeaveDayCounter` ile iş günü hesapla, her çalışan için `status='approved'` izin kaydı oluştur, bakiye güncelle, `collective_leaves` tablosuna kaydet
    - `getCollectiveLeaves(companyId)` — şirketin toplu izin geçmişini listele
    - Negatif bakiye oluşan çalışanları `negativeBalanceEmployees` olarak döndür
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 6.1_
  - [ ]* 6.2 Property test: Collective leave deducts correct days
    - **Property 7: Collective leave deducts correct days from each targeted employee**
    - **Validates: Requirements 5.2**
  - [ ]* 6.3 Property test: Collective leave creates one approved record per employee
    - **Property 8: Collective leave creates one approved record per targeted employee**
    - **Validates: Requirements 5.3**

- [x] 7. Checkpoint — Servis katmanını doğrula
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Veritabanı migration SQL'lerini oluştur
  - [x] 8.1 `supabase/migrations/` altında migration dosyası oluştur
    - `ALTER TABLE public.users ADD COLUMN birth_date DATE;`
    - `ALTER TABLE public.leave_balances ADD COLUMN base_entitlement INTEGER NOT NULL DEFAULT 0, ADD COLUMN negative_from_previous NUMERIC NOT NULL DEFAULT 0, ADD COLUMN seniority_tier TEXT CHECK (seniority_tier IN ('ineligible', 'tier1', 'tier2', 'tier3'));`
    - `CREATE TABLE public.collective_leaves (...)` — design'daki şemaya uygun
    - _Requirements: 3.1, 5.1, 6.1, 7.3_

- [x] 9. Redux leaveSlice'ı güncelle ve entegre et
  - [x] 9.1 `src/store/slices/leaveSlice.ts` dosyasını güncelle
    - `fetchLeaveBalances` thunk'ına `birthDate` parametresini ekle
    - `LeaveState` interface'ine `EnhancedLeaveBalanceSummary[]` tipini uygula
    - Toplu izin için yeni thunk'lar ekle: `createCollectiveLeaveThunk`, `fetchCollectiveLeaves`
    - _Requirements: 8.1, 5.1_

- [x] 10. UI — Geliştirilmiş bakiye gösterim bileşeni
  - [x] 10.1 Mevcut bakiye gösterim bileşenlerini güncelle
    - `base_entitlement`, `carried_over`, `negative_from_previous` alanlarını göster
    - `seniority_tier` bilgisini Chip olarak göster
    - Negatif bakiye durumunda kırmızı uyarı göstergesi ekle
    - `is_age_eligible` durumunda bilgi ikonu ekle
    - _Requirements: 8.1, 8.2, 8.3, 6.3, 7.4_

- [x] 11. UI — Toplu izin admin sayfası
  - [x] 11.1 `src/components/admin/CollectiveLeave/index.tsx` bileşenini oluştur
    - Toplu izin oluşturma formu: tarih aralığı, kapsam seçimi (şirket/grup/departman/takım), kapsam ID seçimi
    - `LeaveDayCounter` ile hesaplanan iş günü sayısını göster
    - Geçmiş toplu izinlerin listesi (tablo)
    - Negatif bakiyeye düşen çalışanları uyarı olarak göster
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 6.1, 6.3_
  - [x] 11.2 Admin routing ve sidebar'a toplu izin sayfasını ekle
    - `App.tsx`'e `/admin/collective-leave` route'u ekle
    - Layout sidebar'a "Toplu İzin" menü öğesi ekle
    - _Requirements: 5.1_

- [x] 12. İzin talebi formunda 1 yıl kıdem kontrolü
  - [x] 12.1 `src/components/staff/LeaveRequest/index.tsx` dosyasını güncelle
    - Yıllık izin tipi seçildiğinde `EntitlementCalculator` ile kıdem kontrolü yap
    - 1 yıldan az kıdemi olan çalışanlara uyarı mesajı göster ve formu devre dışı bırak
    - Hak kazanma tarihini hesapla ve mesajda göster
    - _Requirements: 1.1, 1.2, 1.3_

- [x] 13. Final checkpoint — Tüm testleri çalıştır ve entegrasyonu doğrula
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- `*` ile işaretli görevler opsiyoneldir ve hızlı MVP için atlanabilir
- Her görev ilgili gereksinimlere referans verir
- Checkpoint'ler artımlı doğrulama sağlar
- Property testleri evrensel doğruluk özelliklerini doğrular
- Unit testler belirli örnekleri ve edge case'leri doğrular
- Tüm hesaplama fonksiyonları saf (pure) olarak tasarlanmıştır, Supabase bağımlılığı yoktur
