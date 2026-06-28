# Padlet Clone

## הרצה עם Docker

### דרישות מוקדמות
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) מותקן ורץ

### שלבים להרצה

1. צור קובץ `.env` בשורש הפרויקט:

```
JWT_SECRET=מחרוזת_ארוכה_ואקראית_לפחות_32_תווים
POSTGRES_PASSWORD=סיסמה_לבסיס_הנתונים
```

2. הרץ:

```bash
docker compose up --build
```

3. פתח בדפדפן: [http://localhost:5173](http://localhost:5173)

---

## משתני סביבה

| משתנה | נדרש | תיאור |
|---|---|---|
| `JWT_SECRET` | כן | מפתח סודי לחתימת טוקני JWT. לפחות 32 תווים אקראיים |
| `POSTGRES_PASSWORD` | כן | סיסמה לבסיס הנתונים PostgreSQL |

### ערכי ברירת מחדל (לא נדרשים ב-.env)

| משתנה | ברירת מחדל | תיאור |
|---|---|---|
| `PORT` | `3001` | פורט השרת |
| `FRONTEND_URL` | `http://localhost:5173` | כתובת הלקוח (ל-CORS) |

---

## ארכיטקטורה

| שירות | פורט | תיאור |
|---|---|---|
| `client` | 5173 | React (Vite) — בנוי לפרודקשן ומוגש כקבצים סטטיים |
| `server` | 3001 | NestJS API + WebSocket |
| `postgres` | 5433 | PostgreSQL 16 |
