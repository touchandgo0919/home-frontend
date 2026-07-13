const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

const getPath = (context) => {
  const path = context.params.path;
  return Array.isArray(path) ? path.join("/") : path || "";
};

const requireDb = (env) => {
  if (!env.DB) {
    throw Object.assign(new Error("D1 binding DB is not configured."), { status: 503 });
  }
  return env.DB;
};

const requireAdmin = (request, env) => {
  const expected = env.ADMIN_TOKEN;
  const header = request.headers.get("authorization") || "";
  const actual = header.replace(/^Bearer\s+/i, "").trim();

  if (!expected || actual !== expected) {
    throw Object.assign(new Error("Unauthorized"), { status: 401 });
  }
};

const readJson = async (request) => {
  try {
    return await request.json();
  } catch {
    throw Object.assign(new Error("Invalid JSON body."), { status: 400 });
  }
};

const requireText = (value, field) => {
  const text = String(value || "").trim();
  if (!text) {
    throw Object.assign(new Error(`${field} is required.`), { status: 400 });
  }
  return text;
};

const requireUrl = (value) => {
  const url = requireText(value, "url");
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("Only http and https URLs are supported.");
    }
  } catch {
    throw Object.assign(new Error("A valid URL is required."), { status: 400 });
  }
  return url;
};

const toId = (value) => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw Object.assign(new Error("A valid id is required."), { status: 400 });
  }
  return id;
};

async function getNav(db) {
  const { results: categories } = await db
    .prepare("SELECT id, name AS category, icon, sort_order FROM categories ORDER BY sort_order, id")
    .all();
  const { results: bookmarks } = await db
    .prepare("SELECT id, category_id, title, url, sort_order FROM bookmarks ORDER BY category_id, sort_order, id")
    .all();

  return categories.map((category) => ({
    id: category.id,
    category: category.category,
    icon: category.icon,
    sort_order: category.sort_order,
    links: bookmarks
      .filter((bookmark) => bookmark.category_id === category.id)
      .map((bookmark) => ({
        id: bookmark.id,
        category_id: bookmark.category_id,
        title: bookmark.title,
        url: bookmark.url,
        sort_order: bookmark.sort_order,
      })),
  }));
}

async function createCategory(db, body) {
  const name = requireText(body.name || body.category, "name");
  const icon = requireText(body.icon || "book", "icon");
  const sortOrder = Number.isInteger(body.sort_order) ? body.sort_order : Date.now();
  const result = await db
    .prepare("INSERT INTO categories (name, icon, sort_order) VALUES (?, ?, ?)")
    .bind(name, icon, sortOrder)
    .run();
  return { id: result.meta.last_row_id };
}

async function updateCategory(db, id, body) {
  const name = requireText(body.name || body.category, "name");
  const icon = requireText(body.icon || "book", "icon");
  await db
    .prepare("UPDATE categories SET name = ?, icon = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .bind(name, icon, id)
    .run();
  return { id };
}

async function createBookmark(db, body) {
  const categoryId = toId(body.category_id);
  const title = requireText(body.title, "title");
  const url = requireUrl(body.url);
  const sortOrder = Number.isInteger(body.sort_order) ? body.sort_order : Date.now();
  const result = await db
    .prepare("INSERT INTO bookmarks (category_id, title, url, sort_order) VALUES (?, ?, ?, ?)")
    .bind(categoryId, title, url, sortOrder)
    .run();
  return { id: result.meta.last_row_id };
}

async function updateBookmark(db, id, body) {
  const categoryId = toId(body.category_id);
  const title = requireText(body.title, "title");
  const url = requireUrl(body.url);
  await db
    .prepare("UPDATE bookmarks SET category_id = ?, title = ?, url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .bind(categoryId, title, url, id)
    .run();
  return { id };
}

async function reorder(db, table, ids, categoryId) {
  if (!Array.isArray(ids) || ids.some((id) => !Number.isInteger(Number(id)))) {
    throw Object.assign(new Error("ids must be an array of numeric ids."), { status: 400 });
  }

  const statements = ids.map((id, index) => {
    if (table === "bookmarks") {
      return db
        .prepare("UPDATE bookmarks SET sort_order = ?, category_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .bind(index, categoryId, Number(id));
    }

    return db
      .prepare("UPDATE categories SET sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .bind(index, Number(id));
  });

  if (statements.length) {
    await db.batch(statements);
  }

  return { ok: true };
}

export async function onRequest(context) {
  const { request, env } = context;
  const method = request.method.toUpperCase();
  const path = getPath(context).replace(/^\/+|\/+$/g, "");
  const parts = path.split("/").filter(Boolean);

  try {
    const db = requireDb(env);

    if (method === "GET" && path === "nav") {
      return json({ data: await getNav(db) });
    }

    if (path === "health") {
      return json({ ok: true });
    }

    requireAdmin(request, env);

    if (method === "POST" && path === "categories") {
      return json(await createCategory(db, await readJson(request)), 201);
    }

    if (method === "PUT" && parts[0] === "categories" && parts[1]) {
      return json(await updateCategory(db, toId(parts[1]), await readJson(request)));
    }

    if (method === "DELETE" && parts[0] === "categories" && parts[1]) {
      await db.prepare("DELETE FROM categories WHERE id = ?").bind(toId(parts[1])).run();
      return json({ ok: true });
    }

    if (method === "POST" && path === "bookmarks") {
      return json(await createBookmark(db, await readJson(request)), 201);
    }

    if (method === "PUT" && parts[0] === "bookmarks" && parts[1]) {
      return json(await updateBookmark(db, toId(parts[1]), await readJson(request)));
    }

    if (method === "DELETE" && parts[0] === "bookmarks" && parts[1]) {
      await db.prepare("DELETE FROM bookmarks WHERE id = ?").bind(toId(parts[1])).run();
      return json({ ok: true });
    }

    if (method === "POST" && path === "reorder/categories") {
      const body = await readJson(request);
      return json(await reorder(db, "categories", body.ids));
    }

    if (method === "POST" && path === "reorder/bookmarks") {
      const body = await readJson(request);
      return json(await reorder(db, "bookmarks", body.ids, toId(body.category_id)));
    }

    return json({ error: "Not found" }, 404);
  } catch (error) {
    return json({ error: error.message || "Unexpected error" }, error.status || 500);
  }
}
