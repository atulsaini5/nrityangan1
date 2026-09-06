import { readFile } from "node:fs/promises";
import ts from "typescript";
import { PGlite } from "@electric-sql/pglite";

const transpile = (source) =>
  ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
const moduleUrl = (source) =>
  `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const modelSource = await readFile(
  new URL("../../lib/blogModel.ts", import.meta.url),
  "utf8",
);
const modelUrl = moduleUrl(transpile(modelSource));
export const model = await import(modelUrl);
const handlerSource = await readFile(
  new URL("../../supabase/functions/blog/handler.ts", import.meta.url),
  "utf8",
);
const handlerModule = await import(
  moduleUrl(
    transpile(handlerSource).replace("../../../lib/blogModel.ts", modelUrl),
  )
);
export const { createBlogHandler, decodeWebP } = handlerModule;

// A local Postgres database plus a small SDK adapter. Never connects to a Supabase project.
export async function createRuntime() {
  const db = new PGlite();
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role bypassrls;
    create schema storage;
    create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
    alter table storage.objects enable row level security;
    grant usage on schema storage, public to anon, authenticated, service_role;
    grant all on storage.objects to anon, authenticated, service_role;
    create policy legacy_broad_policy on storage.objects for all to anon, authenticated using (true) with check (true);
  `);
  const migration = await readFile(
    new URL(
      "../../supabase/migrations/20260906170455_create_kathak_blog.sql",
      import.meta.url,
    ),
    "utf8",
  );
  await db.exec(migration);
  const objects = new Map();
  const failures = { thumbnail: false };
  class Query {
    constructor() {
      this.filters = [];
      this.orders = [];
      this.fields = "*";
      this.values = null;
      this.mode = "select";
      this.offset = 0;
    }
    select(fields) {
      this.fields = fields;
      return this;
    }
    eq(field, value) {
      this.filters.push([field, value]);
      return this;
    }
    order(field, options) {
      this.orders.push(`${field} ${options.ascending ? "asc" : "desc"}`);
      return this;
    }
    range(start, end) {
      this.offset = start;
      this.count = end - start + 1;
      return this;
    }
    limit(count) {
      this.count = count;
      return this;
    }
    update(values) {
      this.mode = "update";
      this.values = values;
      return this;
    }
    insert(values) {
      this.mode = "insert";
      this.values = values;
      return this;
    }
    maybeSingle() {
      this.single = true;
      return this;
    }
    async run() {
      const params = [];
      const bind = (value) => {
        params.push(value);
        return `$${params.length}`;
      };
      let sql;
      if (this.mode === "select") sql = `select ${this.fields} from blog_posts`;
      else if (this.mode === "insert")
        sql = `insert into blog_posts (${Object.keys(this.values).join(",")}) values (${Object.values(this.values).map(bind).join(",")})`;
      else
        sql = `update blog_posts set ${Object.entries(this.values)
          .map(([key, value]) => `${key} = ${bind(value)}`)
          .join(",")}`;
      if (this.filters.length)
        sql += ` where ${this.filters.map(([field, value]) => `${field} = ${bind(value)}`).join(" and ")}`;
      if (this.mode === "select") {
        if (this.orders.length) sql += ` order by ${this.orders.join(",")}`;
        if (this.count !== undefined)
          sql += ` limit ${this.count} offset ${this.offset}`;
      } else sql += ` returning ${this.fields}`;
      try {
        const result = await db.query(sql, params);
        const rows = JSON.parse(JSON.stringify(result.rows));
        return { data: this.single ? rows[0] || null : rows, error: null };
      } catch (error) {
        return { data: null, error: { code: error.code } };
      }
    }
    then(resolve, reject) {
      return this.run().then(resolve, reject);
    }
  }
  const client = {
    from(table) {
      if (table !== "blog_posts") throw new Error("Unexpected table");
      return new Query();
    },
    storage: {
      from(bucket) {
        if (bucket !== "blog-images")
          throw new Error("Blog upload escaped its bucket");
        return {
          async upload(path, bytes, settings) {
            if (failures.thumbnail && path.endsWith("thumbnail.webp"))
              return { error: new Error("simulated storage failure") };
            if (objects.has(path))
              return { error: new Error("Already exists") };
            objects.set(path, { bytes, settings });
            return { data: { path }, error: null };
          },
          async remove(paths) {
            for (const path of paths) objects.delete(path);
            return { error: null };
          },
          async list(folder) {
            return {
              data: [...objects.keys()]
                .filter((path) => path.startsWith(`${folder}/`))
                .map((path) => ({
                  id: crypto.randomUUID(),
                  name: path.split("/")[1],
                })),
              error: null,
            };
          },
        };
      },
    },
  };
  const handler = createBlogHandler({
    client: () => client,
    adminKey: () => "local-blog-preview",
    allowedOrigins: ["http://127.0.0.1:4173", "http://localhost:4173"],
  });
  const call = (body, key = "local-blog-preview") =>
    handler(
      new Request("http://127.0.0.1:4188/functions/v1/blog", {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-key": key },
        body: JSON.stringify(body),
      }),
    );
  return { db, objects, failures, handler, call };
}
