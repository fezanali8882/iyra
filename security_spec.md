# Security Specification for Iyra Chat

## 1. Data Invariants
- A `Message` must belong to a valid `userId` (the authenticated user).
- A user can only access their own messages.
- Timestamps must be server-generated.
- Message text must be provided and have a reasonable length limit.

## 2. The "Dirty Dozen" Payloads (to be blocked)
1. **Unauthorized Read**: User B trying to list messages of User A.
2. **Identity Spoofing**: User A trying to create a message with `userId = UserB`.
3. **Ghost Field Injection**: Adding an `isAdmin: true` field to a message or profile.
4. **ID Poisoning**: Using a 2KB string as a `messageId`.
5. **Future Dating**: Sending a future timestamp from the client.
6. **Large Payload**: Sending a 2MB text message (denial of wallet).
7. **Type Mismatch**: Sending a number instead of a string for message text.
8. **Unauthorized Update**: User A trying to edit User B's profile.
9. **Role Escalation**: User A trying to set themselves as an admin in their profile.
10. **Blanket Query**: Authenticated user trying to query ALL messages across all users.
11. **Malicious ID Char**: Using non-alphanumeric chars in document IDs.
12. **Null Values**: Sending null for required fields like `sender`.

## 3. Test Runner (Draft Logic)
- `test('unauthorized_read', () => { ... })` -> EXPECT PERMISSION_DENIED
- `test('identity_spoof', () => { ... })` -> EXPECT PERMISSION_DENIED
- ... and so on.
