# Security Specification & Invariants

## 1. Data Invariants
1. Every document under `/users/{userId}` and its subcollections (`private`, `customWorkouts`, `customDietItems`, `progressRecords`, `mealLogs`) MUST be owned exclusively by the verified authenticated user (`request.auth.uid == userId` and `request.auth.token.email_verified == true`).
2. PII (`email`) is strictly isolated in `/users/{userId}/private/info` and never exposed in `/users/{userId}` or listable collections.
3. No subcollection record (`customWorkouts`, `customDietItems`, `progressRecords`, `mealLogs`) may exist without a valid parent `/users/{userId}` document (`exists(...)`).
4. Every write enforces strict key allowlisting (`hasAll` + `hasOnly` on create; `affectedKeys().hasOnly(...)` + `isValid[Entity]` on update), immutable `uid` and `createdAt`, and server-enforced `request.time` timestamps.
5. `allow list` queries on subcollections explicitly check `resource.data.uid == request.auth.uid` without calling `get()` or `exists()`.

## 2. Adversarial "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. **Cross-user profile read**: Unauthenticated or different `uid` attempting `get /users/otherUid`.
2. **User collection enumeration**: Attempting `list /users`.
3. **Unverified email write**: Authenticated user with `email_verified: false` creating `/users/{uid}`.
4. **UID spoofing on create**: Setting `uid: "victim_uid"` inside `/users/{attackerUid}/progressRecords/r1`.
5. **Shadow / ghost field injection**: Creating `/users/{uid}` with an extra field `isAdmin: true`.
6. **Client-forged timestamp**: Creating `/users/{uid}/progressRecords/r1` with a past/future `createdAt` instead of `request.time`.
7. **Immutable field mutation**: Updating `createdAt` or `uid` on `/users/{uid}`.
8. **Value poisoning (type/range)**: Setting `weightKg: 9999` or `age: -5` or `name` > 80 chars on `/users/{uid}`.
9. **ID poisoning**: Writing to `/users/{uid}/progressRecords/<1500-char-junk-id>`.
10. **Orphaned subcollection write**: Writing `/users/{uid}/mealLogs/m1` before `/users/{uid}` exists.
11. **Unbounded or poisoned array**: Writing `instructions: []` or `instructions: [123]` to `/users/{uid}/customWorkouts/w1`.
12. **PII enumeration**: Attempting `list /users/{uid}/private` or `get /users/{otherUid}/private/info`.
