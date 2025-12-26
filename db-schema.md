
# تصميم قاعدة البيانات والمنطق الحسابي (Turso / libSQL)

## 1. تصميم الجداول (SQLite Syntax)

```sql
-- جدول الخامات
CREATE TABLE IF NOT EXISTS materials (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    unit TEXT NOT NULL
);

-- جدول أصناف المبيعات
CREATE TABLE IF NOT EXISTS sales_items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
);

-- جدول الوصفات
CREATE TABLE IF NOT EXISTS recipes (
    item_id TEXT,
    material_id TEXT,
    quantity REAL NOT NULL, -- الكمية لكل وحدة
    PRIMARY KEY (item_id, material_id),
    FOREIGN KEY (item_id) REFERENCES sales_items(id) ON DELETE CASCADE,
    FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
);

-- جدول المبيعات
CREATE TABLE IF NOT EXISTS sales (
    id TEXT PRIMARY KEY,
    item_id TEXT,
    quantity_sold INTEGER NOT NULL,
    sale_date TEXT DEFAULT (date('now')),
    FOREIGN KEY (item_id) REFERENCES sales_items(id) ON DELETE CASCADE
);
```

## 2. ملاحظات الأداء عند تعدد الأصناف
* **Batch Operations**: يتم استخدام ميزة `client.batch` في Turso لإرسال عدة استعلامات في اتصال واحد (مثل حفظ وصفة كاملة)، مما يقلل من زمن التأخير (Latency).
* **Indexing**: قاعدة SQLite تنشئ تلقائياً فهارس على المفاتيح الأساسية (Primary Keys)، مما يجعل عمليات الاستعلام سريعة جداً حتى مع آلاف السجلات.
* **Aggregations**: يتم إجراء الحسابات في الواجهة الأمامية حالياً لتقليل الضغط على الخادم، ولكن يمكن نقلها لـ SQL لزيادة الكفاءة في التقارير الضخمة.
