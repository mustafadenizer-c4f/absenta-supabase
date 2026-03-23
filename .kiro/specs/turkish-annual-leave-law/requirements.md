# Requirements Document

## Introduction

Bu doküman, Absenta izin yönetim uygulamasına 4857 sayılı İş Kanunu'na uygun yıllık izin hesaplama, toplu izin ve izin devri özelliklerinin eklenmesine ilişkin gereksinimleri tanımlar. Mevcut sistemdeki sabit `default_days` tabanlı izin tahsisi, kıdem ve yaşa dayalı dinamik hesaplama ile değiştirilecektir.

## Glossary

- **Entitlement_Calculator**: Çalışanın kıdem süresine ve yaşına göre yıllık izin gün sayısını hesaplayan modül
- **Leave_Balance_Service**: Çalışanın izin bakiyesini (tahsis, kullanım, devir, kalan) yöneten servis katmanı
- **Collective_Leave_Manager**: Toplu izin oluşturma, uygulama ve bakiye mahsuplaştırma işlemlerini yöneten modül
- **Leave_Day_Counter**: İzin süresinden hafta sonu, resmi tatil ve ulusal bayramları hariç tutarak net iş günü hesaplayan modül
- **Seniority**: Çalışanın işe giriş tarihinden (deneme süresi dahil) itibaren geçen toplam hizmet süresi (yıl cinsinden)
- **Carryover**: Bir izin döneminde kullanılmayan izin günlerinin bir sonraki döneme aktarılması
- **Negative_Balance**: Çalışanın izin bakiyesinin sıfırın altına düşmesi durumu (toplu izin uygulamasında oluşabilir)
- **Holiday**: Supabase `holidays` tablosunda tanımlı resmi tatil ve ulusal bayram günleri
- **Leave_Period**: Çalışanın işe giriş yıldönümüne göre hesaplanan bir yıllık izin dönemi

## Requirements

### Requirement 1: Yıllık İzin Hak Kazanma Koşulu

**User Story:** Bir yönetici olarak, çalışanların yıllık izin hakkını ancak 1 yıllık çalışma süresini (deneme süresi dahil) tamamladıktan sonra kazanmasını istiyorum; böylece kanuna uygun izin yönetimi sağlanır.

#### Acceptance Criteria

1. WHEN a leave balance is calculated for an employee, THE Entitlement_Calculator SHALL verify that the employee has completed at least 1 year of service from the hire_date (including probation period)
2. WHILE an employee has less than 1 year of service, THE Leave_Balance_Service SHALL set the annual leave entitlement to 0 days
3. IF an employee with less than 1 year of service attempts to request annual leave, THEN THE Leave_Balance_Service SHALL reject the request with a message indicating the remaining time until eligibility

### Requirement 2: Kıdeme Dayalı İzin Gün Sayısı Hesaplama

**User Story:** Bir çalışan olarak, kıdem süreme göre yasal izin günlerimin otomatik hesaplanmasını istiyorum; böylece hak ettiğim izin süresini doğru şekilde kullanabilirim.

#### Acceptance Criteria

1. WHEN an employee has completed 1 year or more and up to 5 years (inclusive) of service, THE Entitlement_Calculator SHALL allocate 14 working days of annual leave
2. WHEN an employee has completed more than 5 years and less than 15 years of service, THE Entitlement_Calculator SHALL allocate 20 working days of annual leave
3. WHEN an employee has completed 15 years or more of service, THE Entitlement_Calculator SHALL allocate 26 working days of annual leave
4. WHEN an employee's seniority crosses a tier boundary during a leave period, THE Entitlement_Calculator SHALL apply the new tier's entitlement starting from the next leave period

### Requirement 3: Yaşa Dayalı Minimum İzin Hakkı

**User Story:** Bir yönetici olarak, 18 yaş ve altı ile 50 yaş ve üstü çalışanların yasal asgari izin haklarının korunmasını istiyorum; böylece yaş grubuna özel yasal düzenlemelere uyum sağlanır.

#### Acceptance Criteria

1. WHEN an employee is aged 18 or younger at the start of the leave period, THE Entitlement_Calculator SHALL allocate a minimum of 20 working days regardless of seniority tier
2. WHEN an employee is aged 50 or older at the start of the leave period, THE Entitlement_Calculator SHALL allocate a minimum of 20 working days regardless of seniority tier
3. WHEN the seniority-based entitlement exceeds 20 days for an age-eligible employee, THE Entitlement_Calculator SHALL use the seniority-based entitlement (whichever is greater)

### Requirement 4: İzin Günü Hesaplamasında Tatil Hariç Tutma

**User Story:** Bir çalışan olarak, yıllık izin sürem hesaplanırken hafta sonu tatilleri, resmi tatiller ve ulusal bayramların izin günlerimden düşülmemesini istiyorum; böylece sadece iş günleri izin bakiyemden düşer.

#### Acceptance Criteria

1. THE Leave_Day_Counter SHALL exclude Saturdays and Sundays when counting leave days within an annual leave period
2. THE Leave_Day_Counter SHALL exclude all dates matching records in the holidays table for the employee's company when counting leave days
3. WHEN a holiday falls within an employee's annual leave date range, THE Leave_Day_Counter SHALL skip that date and extend the effective leave end date accordingly
4. THE Leave_Day_Counter SHALL use the same exclusion logic for both leave request creation and leave balance calculation

### Requirement 5: Toplu İzin Uygulaması

**User Story:** Bir yönetici olarak, tüm veya belirli çalışanlara toplu izin uygulayabilmek istiyorum; böylece şirket genelinde planlı tatil dönemlerini yönetebilirim.

#### Acceptance Criteria

1. WHEN an admin creates a collective leave, THE Collective_Leave_Manager SHALL allow selection of target scope (all employees, specific group, specific department, or specific team)
2. WHEN a collective leave is applied, THE Collective_Leave_Manager SHALL deduct the collective leave days from each targeted employee's annual leave balance
3. WHEN a collective leave is applied, THE Collective_Leave_Manager SHALL create individual leave request records with status "approved" for each targeted employee
4. THE Collective_Leave_Manager SHALL calculate collective leave duration using the same holiday-exclusion logic as individual leave requests

### Requirement 6: Toplu İzinde Negatif Bakiye Yönetimi

**User Story:** Bir yönetici olarak, izin bakiyesi yetersiz olan çalışanlara toplu izin uygulandığında negatif bakiye oluşmasını ve bu bakiyenin sonraki yıllarda mahsup edilmesini istiyorum; böylece toplu izin uygulaması bakiye yetersizliğinden engellenmez.

#### Acceptance Criteria

1. WHEN a collective leave causes an employee's balance to go below zero, THE Leave_Balance_Service SHALL allow the negative balance and record the deficit amount
2. WHILE an employee has a negative balance from a previous period, THE Leave_Balance_Service SHALL deduct the negative amount from the next period's entitlement during carryover calculation
3. THE Leave_Balance_Service SHALL display the negative balance clearly in the employee's balance summary with a visual indicator

### Requirement 7: İzin Devri (Carryover)

**User Story:** Bir çalışan olarak, kullanmadığım yıllık izin günlerimin bir sonraki yıla devredilmesini istiyorum; böylece hak ettiğim izinleri kaybetmem.

#### Acceptance Criteria

1. WHEN a new leave period starts for an employee, THE Leave_Balance_Service SHALL calculate the unused leave days from the previous period
2. WHEN unused leave days exist from the previous period, THE Leave_Balance_Service SHALL add the carried-over days to the new period's entitlement
3. THE Leave_Balance_Service SHALL store the carried-over amount separately from the base entitlement in the leave_balances record
4. THE Leave_Balance_Service SHALL display the breakdown of base entitlement and carried-over days in the employee's balance summary

### Requirement 8: İzin Bakiyesi Görüntüleme

**User Story:** Bir çalışan olarak, izin bakiyemin detaylı dökümünü (temel hak, devir, kullanılan, bekleyen, kalan) görmek istiyorum; böylece izin planlamam yapabilirim.

#### Acceptance Criteria

1. THE Leave_Balance_Service SHALL return the following fields for each leave type: base entitlement, carried-over days, total allocated (base + carryover), used days, pending days, and remaining days
2. WHEN an employee views the balance summary, THE Leave_Balance_Service SHALL show the seniority tier and applicable entitlement rule
3. WHEN an employee has a negative balance, THE Leave_Balance_Service SHALL display the negative amount with a distinct warning indicator
