#!/bin/bash

echo "Sending DUPLICATE webhook (PR #124) to http://localhost:3000/api/webhook..."

curl -v -X POST http://localhost:3000/api/webhook \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: pull_request" \
  -H "X-GitHub-Delivery: test-delivery-id-456" \
  -d '{
    "action": "opened",
    "repository": { "full_name": "owner/repo" },
    "pull_request": {
      "number": 124,
      "title": "Fix duplicate auth bug",
      "body": "This fixes the login failure issue. Very similar to the previous PR.",
      "user": { "login": "another-user" },
      "head": { "sha": "def5678" },
      "state": "open",
      "draft": false,
      "labels": [],
      "created_at": "2023-01-02T00:00:00Z",
      "updated_at": "2023-01-02T00:00:00Z",
      "files": [
        { "sha": "789", "filename": "src/auth.ts", "status": "modified" },
        { "sha": "012", "filename": "src/utils.ts", "status": "modified" }
      ] 
    }
  }'

echo -e "\n\nDone! Check your server logs. You should see a match now."
