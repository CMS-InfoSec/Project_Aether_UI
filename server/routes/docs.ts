import type { Request, Response } from 'express';

const openApi: any = {
  openapi: '3.0.3',
  info: {
    title: 'Aether API',
    version: '1.0.0',
    description: 'OpenAPI schema for Aether demo backend.'
  },
  servers: [{ url: '/api' }],
  paths: {
    '/health/live': { get: { summary: 'Liveness', responses: { '200': { description: 'OK' } } } },
    '/health/ready': { get: { summary: 'Readiness', responses: { '200': { description: 'OK' } } } },
    '/notifications': {
      get: {
        summary: 'List notifications',
        parameters: [
          { in: 'query', name: 'limit', schema: { type: 'integer', minimum: 1, maximum: 100 } },
          { in: 'query', name: 'offset', schema: { type: 'integer', minimum: 0 } },
          { in: 'query', name: 'severity', schema: { type: 'string', enum: ['info','warning','error','success'] } },
          { in: 'query', name: 'category', schema: { type: 'string', enum: ['system','trading','user','security'] } },
          { in: 'query', name: 'unreadOnly', schema: { type: 'boolean' } }
        ],
        responses: { '200': { description: 'Notifications list' } }
      }
    },
    '/notifications/{notificationId}/read': {
      patch: {
        summary: 'Mark notification read/unread',
        parameters: [ { in: 'path', required: true, name: 'notificationId', schema: { type: 'string' } } ],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { read: { type: 'boolean' } }, required: ['read'] } } } },
        responses: { '200': { description: 'Updated' } }
      }
    },
    '/notifications/mark-all-read': { post: { summary: 'Mark all notifications read', responses: { '200': { description: 'OK' } } } },
    '/trades/recent': { get: { summary: 'Recent trades', responses: { '200': { description: 'OK' } } } },
    '/positions/open': { get: { summary: 'Open positions', responses: { '200': { description: 'OK' } } } },
    '/trades/decision': { post: { summary: 'Request trade decision', responses: { '200': { description: 'OK' } } } },
    '/trades/execute': { post: { summary: 'Execute a trade', responses: { '200': { description: 'OK' } } } },
    '/markets/price': { get: { summary: 'Spot price lookup', parameters: [ { in: 'query', name: 'symbol', required: true, schema: { type: 'string' } } ], responses: { '200': { description: 'OK' } } } },
    '/wallet/balances': { get: { summary: 'Wallet balances', responses: { '200': { description: 'OK' } } } },
    '/wallet/hedges': { get: { summary: 'Hedge history', responses: { '200': { description: 'OK' } } } },
    '/system/mode': { get: { summary: 'Get trading mode', responses: { '200': { description: 'OK' } } }, post: { summary: 'Set trading mode', responses: { '200': { description: 'OK' } } } },
    '/system/pause': { post: { summary: 'Pause system', responses: { '200': { description: 'OK' } } } },
    '/system/resume': { post: { summary: 'Resume system', responses: { '200': { description: 'OK' } } } },
    '/models': { get: { summary: 'List models', responses: { '200': { description: 'OK' } } } },
    '/models/explain/{modelId}': { get: { summary: 'Forecast explainability', parameters:[{ in:'path', name:'modelId', required:true, schema:{ type:'string'} }, { in:'query', name:'data', schema:{ type:'array', items:{ type:'number' } } }], responses: { '200': { description: 'OK' } } } },
    '/strategies/explain': { get: { summary: 'Strategies explainability', responses: { '200': { description: 'OK' } } } },
    '/strategies/stress-test': { post: { summary: 'Run strategy stress test', responses: { '200': { description: 'OK' } } } },
    '/mobile/status': { get: { summary: 'Push gateway status', responses: { '200': { description: 'OK' } } } },
    '/mobile/push': { post: { summary: 'Send mobile push', responses: { '202': { description: 'Accepted' } } } },
  }
};

export function handleOpenApiJson(_req: Request, res: Response) {
  res.json(openApi);
}

export function handleSwaggerDocs(_req: Request, res: Response) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Aether API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.ui = SwaggerUIBundle({
      url: '/api/openapi.json',
      dom_id: '#swagger-ui',
      presets: [SwaggerUIBundle.presets.apis],
    });
  </script>
</body>
</html>`;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
}
