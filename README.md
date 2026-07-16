# Padlet Clone

## הרצה עם Docker

### דרישות מוקדמות
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) מותקן ורץ

### שלבים להרצה

1. צור קובץ `.env` בשורש הפרויקט:

```
JWT_SECRET=מחרוזת_ארוכה_ואקראית_לפחות_32_תווים
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

### ערכי ברירת מחדל (לא נדרשים ב-.env)

| משתנה | ברירת מחדל | תיאור |
|---|---|---|
| `MONGODB_URI` | `mongodb://localhost:27017/padlet_dev` | כתובת החיבור ל-MongoDB (בתוך Docker: `mongodb://mongo:27017/padlet_dev`) |
| `PORT` | `3001` | פורט השרת |
| `FRONTEND_URL` | `http://localhost:5173` | כתובת הלקוח (ל-CORS) |

---

## ארכיטקטורה

| שירות | פורט | תיאור |
|---|---|---|
| `client` | 5173 | React (Vite) — בנוי לפרודקשן ומוגש כקבצים סטטיים |
| `server` | 3001 | NestJS API + WebSocket |
| `mongo` | 27017 | MongoDB 7 |
