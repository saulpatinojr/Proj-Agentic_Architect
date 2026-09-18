#!/usr/bin/env node
import { randomUUID } from 'node:crypto';
import { Readable, Writable } from 'node:stream';
import * as acp from '@agentclientprotocol/sdk';

const sessions = new Set();
const hangingPrompts = new Map();

function promptText(prompt) {
  return (prompt ?? []).filter((block) => block?.type === 'text').map((block) => block.text).join('\n');
}

async function sendText(client, sessionId, text) {
  await client.notify(acp.methods.client.session.update, {
    sessionId,
    update: {
      sessionUpdate: 'agent_message_chunk',
      content: { type: 'text', text },
    },
  });
}

const app = acp
  .agent({ name: 'code-conductor-fake-acp-agent' })
  .onRequest(acp.methods.agent.initialize, (ctx) => {
    process.stderr.write(`CLIENT_CAPS:${JSON.stringify(ctx.params.clientCapabilities ?? {})}\n`);
    return {
      protocolVersion: acp.PROTOCOL_VERSION,
      agentCapabilities: {},
      authMethods: [],
    };
  })
  .onRequest(acp.methods.agent.session.new, () => {
    const sessionId = `fake-${randomUUID()}`;
    sessions.add(sessionId);
    return { sessionId };
  })
  .onRequest(acp.methods.agent.session.prompt, async (ctx) => {
    if (!sessions.has(ctx.params.sessionId)) throw new Error('unknown fake session');
    const text = promptText(ctx.params.prompt);

    if (text.includes('REQUEST_PERMISSION')) {
      const permission = await ctx.client.request(acp.methods.client.session.requestPermission, {
        sessionId: ctx.params.sessionId,
        toolCall: {
          toolCallId: 'fake-edit-1',
          title: 'Fake edit requiring permission',
          kind: 'edit',
          status: 'pending',
          locations: [{ path: '/fake/workspace/example.txt' }],
        },
        options: [
          { optionId: 'allow', kind: 'allow_once', name: 'Allow once' },
          { optionId: 'reject', kind: 'reject_once', name: 'Reject' },
        ],
      });
      process.stderr.write(`PERMISSION_OUTCOME:${permission.outcome.outcome}\n`);
      await sendText(
        ctx.client,
        ctx.params.sessionId,
        `Permission was ${permission.outcome.outcome}.\nCC_RESULT_JSON:{"status":"completed","changes":[],"tests":[],"evidence":[],"findings":[],"risks":[],"blockers":[],"recommendation":"ready"}\n`,
      );
      return { stopReason: 'end_turn' };
    }

    if (text.includes('HANG')) {
      return await new Promise((resolve) => hangingPrompts.set(ctx.params.sessionId, resolve));
    }

    await sendText(
      ctx.client,
      ctx.params.sessionId,
      'Fake ACP response.\nCC_RESULT_JSON:{"status":"completed","changes":[],"tests":[],"evidence":[],"findings":[],"risks":[],"blockers":[],"recommendation":"ready"}\n',
    );
    return { stopReason: 'end_turn' };
  })
  .onNotification(acp.methods.agent.session.cancel, (ctx) => {
    process.stderr.write(`FAKE_CANCEL_RECEIVED:${ctx.params.sessionId}\n`);
    const resolve = hangingPrompts.get(ctx.params.sessionId);
    if (resolve) {
      hangingPrompts.delete(ctx.params.sessionId);
      resolve({ stopReason: 'cancelled' });
    }
  });

const stream = acp.ndJsonStream(
  Writable.toWeb(process.stdout),
  Readable.toWeb(process.stdin),
);

const connection = app.connect(stream);
await connection.closed;
