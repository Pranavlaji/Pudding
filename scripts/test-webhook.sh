#!/bin/bash

echo "Sending test webhook to http://localhost:3000/..."

curl -v -X POST http://localhost:3000/api/webhook \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: pull_request" \
  -H "X-GitHub-Delivery: test-delivery-id-123" \
  -d '{
    "action": "opened",
    "repository": { "full_name": "owner/repo" },
    "pull_request": {
      "number": 123,
      "title": "Fix duplicate bug in auth",
      "body": "This fixes the same bug as PR #100. It addresses the login failure.",
      "user": { "login": "test-user" },
      "head": { "sha": "abc1234" },
      "state": "open",
      "draft": false,
      "labels": [],
      "created_at": "2023-01-01T00:00:00Z",
      "updated_at": "2023-01-01T00:00:00Z",
      "files": [
        { "sha": "123", "filename": "src/auth.ts", "status": "modified" },
        { "sha": "456", "filename": "src/login.ts", "status": "modified" }
      ] 
    }
  }'

echo -e "\n\nDone! Check your server terminal for analysis logs."
