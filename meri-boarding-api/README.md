# meri-boarding-api

## 1. Install

```bash
npm install
```

## 2. Configure env

```bash
cp .env.example .env
```

Edit `.env` and set a strong `ADMIN_PASSWORD` and `ADMIN_TOKEN_SECRET`.

## 3. Start local MongoDB on WSL (port 27018)

Create data folder once:

```bash
mkdir -p ~/mongodb-data
```

Start MongoDB:

```bash
mongod --dbpath ~/mongodb-data --bind_ip 127.0.0.1 --port 27018
```

Keep this terminal open while developing.

## 4. Run API

In a second terminal:

```bash
npm run dev
```

On first start, API seeds one active `super_admin` into MongoDB using:

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_NAME`

If there is already an active `super_admin`, seed is skipped.

## 5. Verify

```bash
mongosh --port 27018 --eval "use meri_boarding; db.admins.find({}, {email:1,name:1,role:1,active:1}).pretty()"
```

## API Endpoints

- `GET /health`
- `GET /api/v1/health`
- `GET /api/v1/public/content/header?locale=en`
- `POST /api/v1/public/forms/contact`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/register`
- `GET /api/v1/auth/me`
- `PATCH /api/v1/auth/me`
- `POST /api/v1/auth/me/avatar`
- `GET /api/v1/admin/users` (`super_admin` only)
- `PATCH /api/v1/admin/users/:userId/approval` (`super_admin` only)
- `POST /api/v1/admin/users` (`super_admin` only, can create `moderator`/`user`)
- `GET /api/v1/admin/content/header?locale=en` (`super_admin|moderator`)
- `PUT /api/v1/admin/content/header` (`super_admin|moderator`)
- `GET /api/v1/admin/contact-submissions` (`super_admin|moderator`)
- `PATCH /api/v1/admin/contact-submissions/:submissionId` (`super_admin|moderator`)
- `DELETE /api/v1/admin/contact-submissions/:submissionId` (`super_admin|moderator`)
