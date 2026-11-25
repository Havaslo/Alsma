import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";
import pino from "pino";
import WebSocket, { WebSocketServer } from "ws";

import type { Database } from "../../lib/database/database.js";
import type { EpteraOffer } from "../booking/eptera.client.js";
import { attachVoiceAgentRealtime } from "./voice-agent.realtime.js";

test(
  "browser voice uses the selected availability provider even when Eptera is disabled",
  { timeout: 5000 },
  async (t) => {
    const providerServer = createServer();
    const providerWs = new WebSocketServer({ server: providerServer });
    const server = createServer();
    const sockets = new Set<WebSocket>();
    t.after(() => {
      for (const socket of sockets) socket.terminate();
      providerWs.close();
      providerServer.close();
      server.close();
    });
    providerServer.listen(0, "127.0.0.1");
    await once(providerServer, "listening");
    const providerPort = (providerServer.address() as AddressInfo).port;
    const model = {
      findFirst: async () => ({
        id: "existing",
        response: "custom",
        condition: "custom",
      }),
      findMany: async () => [],
    };
    const database = {
      client: {
        agentScenario: model,
        agentTransferRule: model,
        agentRule: model,
        knowledgeArticle: model,
        siteContent: model,
      },
    } as unknown as Database;
    const queries: unknown[] = [];
    attachVoiceAgentRealtime(server, {
      apiKey: "test",
      database,
      logger: pino({ enabled: false }),
      openaiBaseUrl: `http://127.0.0.1:${providerPort}`,
      eptera: { enabled: false },
      availability: {
        enabled: true,
        getOffers: async (input) => {
          queries.push(input);
          return [
            { id: "tl:offer", roomType: "Стандарт", price: 31000 },
          ] as EpteraOffer[];
        },
      },
    });
    const result = new Promise<Record<string, unknown>>((resolve) => {
      providerWs.on("connection", (socket) => {
        sockets.add(socket);
        socket.on("message", (data) => {
          const event = JSON.parse(data.toString());
          if (event.type === "session.update")
            socket.send(
              JSON.stringify({
                type: "response.function_call_arguments.done",
                call_id: "search",
                name: "check_availability",
                arguments: JSON.stringify({
                  checkIn: "2026-12-01",
                  checkOut: "2026-12-03",
                  adults: 2,
                  childAges: [7],
                }),
              }),
            );
          if (event.item?.type === "function_call_output")
            resolve(JSON.parse(event.item.output));
        });
        socket.send(JSON.stringify({ type: "session.created" }));
      });
    });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const client = new WebSocket(
      `ws://127.0.0.1:${(server.address() as AddressInfo).port}/api/voice-agent/realtime`,
    );
    sockets.add(client);
    const output = await result;
    assert.equal(output.available, true);
    assert.equal((output.offers as EpteraOffer[])[0]?.id, "tl:offer");
    assert.equal(output.readOnly, true);
    assert.equal(queries.length, 1);
    assert.deepEqual((queries[0] as { childAges: number[] }).childAges, [7]);
  },
);
