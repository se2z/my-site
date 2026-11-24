# Структура проекта

```
MYAGKO_CLEANING_TEMPLATE/
├─ README.md                  запуск и продакшен
├─ .env.example               шаблон переменных окружения (без значений)
├─ package.json / package-lock.json   зависимости; ставить через npm ci
├─ next.config.ts             заголовки безопасности, исключения трассировки
├─ tsconfig.json, next-env.d.ts
├─ postgres-schema.sql        схема Postgres: таблицы, ограничения, RLS
├─ AGENTS.md                  служебная подсказка Next.js для AI-агентов (генерирует next dev)
├─ src/
│  ├─ app/                    маршруты App Router
│  │  ├─ page.tsx             главная: выбор мебели, расчёт, корзина, заявка
│  │  ├─ admin/               кабинет владельца
│  │  ├─ request/[token]/     приватная страница заявки клиента
│  │  ├─ services/, contacts/, privacy/, credits/   информационные страницы
│  │  ├─ api/[...path]/route.ts   весь HTTP API (конфиг, фото, заявки, кабинет)
│  │  ├─ manifest.ts, robots.ts, sitemap.ts, not-found.tsx, layout.tsx
│  │  └─ globals.css          все стили, светлая и тёмная темы
│  ├─ components/
│  │  ├─ CustomerApp.tsx      клиентский путь
│  │  ├─ OwnerApp.tsx         кабинет: заявки, тарифы, компания, персонажи, игра, доступ
│  │  ├─ Receipt.tsx          приватная квитанция
│  │  ├─ Stage.tsx, Scene.tsx 3D-сцена (react-three-fiber), постер-фолбэк
│  │  ├─ CleaningGame.tsx     мини-игра «стереть пятна»
│  │  ├─ CompanyFooter.tsx, LiquidControl.tsx, ui.tsx
│  ├─ lib/
│  │  ├─ domain.ts            модель данных, тарифы, расчёт, схемы валидации (zod)
│  │  ├─ server.ts            сессии владельца, заявки, лимиты, проверка Origin
│  │  ├─ db.ts                Postgres (pg) или локальная SQLite (node:sqlite)
│  │  └─ client.ts            fetch-обёртка для API
│  └─ fonts/                  Onest, Space Grotesk (OFL)
├─ public/
│  ├─ models/                 финальные GLB-персонажи (6 шт.)
│  ├─ posters/                статичные кадры мебели: WebP для сайта, PNG — исходник для scripts/assets.mjs
│  ├─ icons/                  SVG-иконки интерфейса; sofa-figma.png — макетный рендер
│  ├─ icon.svg, icon-192.png, icon-512.png   иконки PWA
│  ├─ sw.js, offline.html     service worker и офлайн-страница
├─ tests/
│  ├─ domain.test.ts          unit-тесты (npm test)
│  └─ integration.mjs         API-тест против локального сервера
├─ scripts/
│  ├─ assets.mjs              проверка GLB (наличие WelcomeWave) и пересборка WebP-постеров из PNG
│  ├─ quality-models.mjs      оптимизация исходных GLB (meshopt + lossless WebP); исходники Blender в пакет не входят
│  └─ encode-texture.cjs      вспомогательный lossless-кодировщик текстур
├─ licenses/                  тексты лицензий шрифтов и liquid-glass-react
├─ docs/                      эта документация
├─ THIRD_PARTY_NOTICES.md     атрибуции сторонних материалов
├─ MANIFEST.json              состав пакета с размерами и SHA-256
└─ SHA256SUMS.txt             контрольные суммы
```

Создаётся при работе и не входит в пакет: `node_modules/`, `.next/`, `data/` (локальная база и сгенерированные ключи), `proof/` (отчёты скриптов), `.env.local`.

`scripts/quality-models.mjs` читает исходные GLB из `../../design/assets/characters-v4/` — этой папки в пакете нет, финальные модели уже лежат в `public/models`. Скрипт нужен, только если вы будете заново экспортировать модели из своих исходников.
