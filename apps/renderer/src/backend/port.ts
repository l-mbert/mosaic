import {
  ClientHello,
  PROTOCOL_VERSION,
  UtilityHandshakeResponse,
} from "@mosaic/contracts/handshake";
import { Schema } from "effect";

const BACKEND_PORT_MESSAGE = "MosaicBackendPort";
const BOOTSTRAP_TIMEOUT_MS = 10_000;

const receivedPort = new Promise<MessagePort>((resolve) => {
  const onMessage = (event: MessageEvent) => {
    if (event.data !== BACKEND_PORT_MESSAGE || event.ports.length !== 1) {
      return;
    }

    window.removeEventListener("message", onMessage);
    resolve(event.ports[0]);
  };

  window.addEventListener("message", onMessage);
});

const withTimeout = <Value>(promise: Promise<Value>, message: string) =>
  new Promise<Value>((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error(message)), BOOTSTRAP_TIMEOUT_MS);

    void promise.then(
      (value) => {
        window.clearTimeout(timeout);
        resolve(value);
      },
      (error: unknown) => {
        window.clearTimeout(timeout);
        reject(error);
      },
    );
  });

const receiveHandshake = (port: MessagePort) =>
  new Promise<unknown>((resolve) => {
    port.addEventListener("message", (event) => resolve(event.data), {
      once: true,
    });
  });

export async function connectBackendPort(): Promise<MessagePort> {
  const port = await withTimeout(receivedPort, "Electron did not provide the Mosaic backend port.");
  const handshake = receiveHandshake(port);

  port.start();
  port.postMessage(
    ClientHello.make({
      protocolVersion: PROTOCOL_VERSION,
    }),
  );

  const response = await Schema.decodeUnknownPromise(UtilityHandshakeResponse)(
    await withTimeout(handshake, "The Mosaic utility process did not complete its handshake."),
  );

  if (response._tag === "MosaicIncompatibleProtocol") {
    port.close();
    throw new Error(
      `Mosaic protocol mismatch: renderer=${response.receivedVersion}, utility=${response.expectedVersion}.`,
    );
  }

  return port;
}
