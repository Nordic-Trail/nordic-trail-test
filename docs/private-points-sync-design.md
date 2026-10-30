# NORDIC TRAIL — bezpieczna synchronizacja prywatnych punktów (projekt)

Status: projekt techniczny; NIE wdrożono do Supabase ani produkcji.

## Źródło prawdy
- Supabase `map_points` jest źródłem prawdy dla punktów przypisanych do konta.
- `localStorage.nordicTrailPoints` to istniejące punkty lokalne bez identyfikatora serwera; NIE wolno ich automatycznie przesyłać ani usuwać.
- Punkty `draft/private` są prywatne. Wyłącznie świadoma akcja użytkownika uruchamia `draft -> pending`.

## Zasady implementacji offline
1. Cache prywatnych punktów musi być oddzielony dla każdego `auth.uid()`; nie przechowywać danych konta w dotychczasowym współdzielonym kluczu localStorage.
2. Po wylogowaniu natychmiast usunąć z pamięci i mapy dane konta. Trwały cache offline zawierający lokalizacje wymaga decyzji o ochronie danych na urządzeniu (preferowane IndexedDB i szyfrowanie z kluczem niewpisanym na stałe w kod).
3. Operacje offline mają trwałe losowe `client_operation_id` i `client_point_id` (UUID), żeby ponowienie żądania nie tworzyło duplikatów.
4. Serwer musi wymuszać unikalność `(user_id, client_point_id)` i atomową idempotencję operacji. Nie polegać wyłącznie na sprawdzaniu duplikatów w JavaScript.
5. Synchronizacja tylko po potwierdzeniu aktywnej sesji i zgodności `auth.uid()` z właścicielem kolejki.
6. Aktualizacje muszą mieć kontrolę wersji (`updated_at` lub licznik wersji); konflikt rozstrzyga użytkownik, nie automatyczne nadpisanie.
7. `pending`, `approved`, `rejected` nie mogą być nadpisane operacjami edycji szkicu. Przesłanie do moderacji wyłącznie osobnym RPC.
8. Po błędzie sieci zachować operację w kolejce i pokazać stan „Oczekuje na synchronizację”; po potwierdzeniu serwera oznaczyć jako zsynchronizowaną.
9. Nie synchronizować automatycznie historycznych lokalnych punktów: zaoferować podgląd i ręczny import z wykrywaniem podobnych współrzędnych/opisów.
10. Testy: dwa urządzenia, dwie sesje, wylogowanie w trakcie pobierania, offline->online, wielokrotne ponowienie żądania, konflikt edycji, odrzucony punkt, niedostępny Supabase, błędy RLS.

## Wymagane przed wdrożeniem
- Migracja schematu: `draft/private`, RPC tworzenia/edycji/zgłoszenia, serwerowa idempotencja i RLS.
- Audyt RPC moderacyjnych i `point_reports` pod kątem dostępu do punktów prywatnych.
- Automatyczne testy składni JS, integracyjne oraz testy RLS jako zwykły użytkownik i moderator.
- Przegląd zachowania istniejących punktów w localStorage i plan bezstratnej migracji.

## Aktualny stan
Gałąź GitHub zawiera wstępny zapis szkiców na konto, ich odczyt i wyświetlanie. Synchronizacja offline, bezpieczny cache konta i migracja Supabase NIE są jeszcze zaimplementowane.
