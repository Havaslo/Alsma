# Managed file storage

Use Amazi managed storage for user uploads and generated files that must survive runtime restarts
and deployments. Store application metadata such as the original name, owner, and returned
`objectId` in the project's PostgreSQL database. Do not store large binary values in PostgreSQL,
the Git workspace, container filesystems, or base64 fields.

Import `createManagedStorage` from `src/lib/storage/managed-storage.ts` and initialize it from
`readConfig().managedStorage`. The project token is backend-only. Never return it to the browser,
write it to logs, or expose it through a `VITE_*` variable.

The upload flow has three steps:

1. The browser sends the file name, media type, and byte size to an authenticated project backend
   endpoint.
2. The backend calls `createUpload` and returns the signed upload descriptor to that browser.
3. The browser appends every `uploadFields` entry to a new `FormData`, appends the complete file
   under the `file` field last, and sends the form with `POST` to `uploadUrl`.

Do not set the upload request's `Content-Type` header manually; the browser must add the form-data
boundary. The signed form accepts exactly the declared file size and media type.

```ts
const form = new FormData();
Object.entries(upload.uploadFields).forEach(([key, value]) => {
  form.append(key, value);
});
form.append("file", file);

const response = await fetch(upload.uploadUrl, {
  body: form,
  method: "POST",
});
if (!response.ok) throw new Error("File upload failed.");
```

After a successful upload, save `upload.objectId` in the application's domain record. The project
backend calls `getDownload(objectId)` after its own authorization check to obtain a short-lived
download URL. Call `deleteObject(objectId)` when the domain record is permanently removed.

Preview and production storage are isolated. Clones and templates start with empty storage, and
source history rollback does not roll stored objects back.
