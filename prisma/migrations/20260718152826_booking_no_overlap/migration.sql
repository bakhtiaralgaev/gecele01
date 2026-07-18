-- İkiqat rezervasiyanın BAZA SƏVİYYƏSİNDƏ qarşısı alınır.
--
-- Niyə lazımdır: tətbiqdəki yoxlama (bookings/route.ts) "əvvəl oxu, sonra yaz"
-- ardıcıllığıdır. İki nəfər eyni anda ödəsə, hər iki sorğu yoxlamanı KEÇİR,
-- sonra hər ikisi yazır — eyni ev, eyni tarix, iki təsdiqlənmiş rezerv.
-- Postgres-in READ COMMITTED səviyyəsi bunun qarşısını almır. Bu qayda alır:
-- ikinci INSERT/UPDATE 23P01 (exclusion_violation) ilə RƏDD olunur.
--
-- Niyə yalnız `confirmed`: partial index-in WHERE şərti IMMUTABLE olmalıdır,
-- yəni now() işlədilə bilməz. Tətbiq isə pending rezervləri YALNIZ vaxtı
-- bitməyibsə bloklayır. `pending` də əlavə etsək, vaxtı keçmiş rezerv tarixi
-- əbədi tutardı və baza kodla ziddiyyətə düşərdi. `confirmed` isə hər iki
-- tərəfdə eyni qaydadır — pul riski də məhz buradadır.
--
-- Aralıq `[)` yarımaçıqdır: çıxış günü növbəti qonaq üçün sərbəstdir.

-- gist indeksində "listingId WITH =" üçün lazımdır (mətn bərabərliyi)
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Booking"
  ADD CONSTRAINT "Booking_confirmed_no_overlap"
  EXCLUDE USING gist (
    "listingId" WITH =,
    daterange("checkIn"::date, "checkOut"::date, '[)') WITH &&
  )
  WHERE (status = 'confirmed');
