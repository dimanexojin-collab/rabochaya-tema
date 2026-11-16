// Строки, которых не должно быть на сайте (PLAN.md: закрытые адреса, фраза про конкурента, спам-блок, чужой сайт).
// Хранятся в base64, чтобы сами закрытые адреса и спам-домены не лежали в публичном репозитории открытым текстом
// (это не защита, а только «не светить» их в поиске по коду). Общие для check-todo.mjs и audit-seo.mjs.
const ENCODED = [
  '0J7QutGA0YPQttC90L4=', '0JpcLlxzP9Cc0LDRgNC60YHQsA==', '0KHQtdCy0LXRgNC+0LTQstC40L3RgdC6', '0YHQv9Cw0YDQug==',
  '0LfQsNC60YDRi9C70YHRjw==', 'c21tc2NvcmU=', 'ZmFzdDJsb2Fk', 'c25hYjM2',
];
export const FORBIDDEN = ENCODED.map((s) => new RegExp(Buffer.from(s, 'base64').toString('utf8'), 'i'));
