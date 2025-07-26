async function startServerCleanly() {
  const listener = Deno.listen({ port: 23487 });
  console.log("Server started");

  const acceptLoop = (async () => {
    try {
      while (true) {
        const conn = await listener.accept();
        console.log("Connection established:", conn.remoteAddr);
        conn.close(); // For demo, immediately close
      }
    } catch (err) {
      if (err instanceof Deno.errors.BadResource) {
        console.log("Listener was closed");
      } else {
        console.error("Accept error:", err);
      }
    }
  })();

  // Simulate some delay (like server running for a bit)
//   await new Promise((resolve) => setTimeout(resolve, 100));

  listener.close();
  console.log("Server closed");

  await acceptLoop;
}

// Run twice, safely
await startServerCleanly();
await startServerCleanly();