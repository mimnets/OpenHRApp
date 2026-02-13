# Blog Feature — PocketBase Collection Setup Guide

## 1. Create the `blog_posts` Collection

Go to your PocketBase Admin UI (e.g., `https://your-pb-url/_/`) and create a new collection:

**Collection name:** `blog_posts`
**Type:** Base collection

### Fields

| Field Name     | Type     | Required | Details                                         |
|----------------|----------|----------|-------------------------------------------------|
| `title`        | Text     | Yes      | Max length: 500                                 |
| `slug`         | Text     | Yes      | Unique, Max length: 500                         |
| `content`      | Editor   | No       | Or use "Text" type with long max length          |
| `excerpt`      | Text     | No       | Max length: 1000                                |
| `cover_image`  | File     | No       | Allow mime types: image/jpeg, image/png, image/webp, image/gif. Max size: 5MB |
| `status`       | Select   | Yes      | Values: `DRAFT`, `PUBLISHED`. Default: `DRAFT`  |
| `author_name`  | Text     | No       | Max length: 200                                 |
| `published_at` | DateTime | No       | Set when post is published                      |

### Making `slug` Unique

In the `slug` field settings, check the **Unique** checkbox to prevent duplicate slugs.

## 2. API Rules (Permissions)

Configure API rules on the `blog_posts` collection:

| Rule            | Value                                                         |
|-----------------|---------------------------------------------------------------|
| **List rule**   | `@request.auth.role = "SUPER_ADMIN"`                         |
| **View rule**   | `@request.auth.role = "SUPER_ADMIN"`                         |
| **Create rule** | `@request.auth.role = "SUPER_ADMIN"`                         |
| **Update rule** | `@request.auth.role = "SUPER_ADMIN"`                         |
| **Delete rule** | `@request.auth.role = "SUPER_ADMIN"`                         |

**Why no public read rule?** Public read access is handled through custom PocketBase hook endpoints (`GET /api/openhr/blog/posts` and `GET /api/openhr/blog/posts/:slug`) defined in `Others/pb_hooks/main.pb.js`. These endpoints don't require authentication and only return published posts. The SDK collection rules above restrict direct collection access to Super Admin only.

## 3. Deploy the Updated Hooks

After creating the collection, deploy the updated `Others/pb_hooks/main.pb.js` to your PocketBase server's `pb_hooks/` directory:

```bash
cp Others/pb_hooks/main.pb.js /path/to/pocketbase/pb_hooks/main.pb.js
```

Then restart PocketBase for the hooks to take effect.

## 4. Verification Checklist

1. **Collection exists:** Go to PB Admin → Collections → `blog_posts` should appear
2. **Fields correct:** Verify all 8 fields are created with correct types
3. **Slug is unique:** Try creating two posts with the same slug — should fail
4. **API rules set:** Only SUPER_ADMIN can access via SDK
5. **Hooks deployed:** Test `GET /api/openhr/blog/posts` — should return `{ success: true, posts: [] }`
6. **Super Admin can create:** Log in as SUPER_ADMIN → Blog tab → Create a post
7. **Public can read:** Without auth, navigate to `#/blog` — published posts should appear

## 5. Collection Schema (JSON Import)

If you prefer importing the schema, you can use PocketBase's Import Collections feature with the following JSON:

```json
[
  {
    "name": "blog_posts",
    "type": "base",
    "schema": [
      {
        "name": "title",
        "type": "text",
        "required": true,
        "options": {
          "max": 500
        }
      },
      {
        "name": "slug",
        "type": "text",
        "required": true,
        "unique": true,
        "options": {
          "max": 500
        }
      },
      {
        "name": "content",
        "type": "editor",
        "required": false,
        "options": {}
      },
      {
        "name": "excerpt",
        "type": "text",
        "required": false,
        "options": {
          "max": 1000
        }
      },
      {
        "name": "cover_image",
        "type": "file",
        "required": false,
        "options": {
          "maxSelect": 1,
          "maxSize": 5242880,
          "mimeTypes": [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif"
          ]
        }
      },
      {
        "name": "status",
        "type": "select",
        "required": true,
        "options": {
          "values": ["DRAFT", "PUBLISHED"],
          "maxSelect": 1
        }
      },
      {
        "name": "author_name",
        "type": "text",
        "required": false,
        "options": {
          "max": 200
        }
      },
      {
        "name": "published_at",
        "type": "date",
        "required": false,
        "options": {}
      }
    ],
    "listRule": "@request.auth.role = \"SUPER_ADMIN\"",
    "viewRule": "@request.auth.role = \"SUPER_ADMIN\"",
    "createRule": "@request.auth.role = \"SUPER_ADMIN\"",
    "updateRule": "@request.auth.role = \"SUPER_ADMIN\"",
    "deleteRule": "@request.auth.role = \"SUPER_ADMIN\""
  }
]
```
