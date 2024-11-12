import path from "path";

import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";

import { ProtoGrpcType } from "./proto/random";

const PROTO_FILE = "./proto/random.proto";
const port = 8092;

const packageDefinition = protoLoader.loadSync(
  path.resolve(__dirname, PROTO_FILE)
);

const grpcObj = grpc.loadPackageDefinition(
  packageDefinition
) as unknown as ProtoGrpcType;

const client = new grpcObj.randomPackage.Random(
  `0.0.0.0:${port}`,
  grpc.credentials.createInsecure()
);

const deadline = new Date();

deadline.setSeconds(deadline.getSeconds() + 5);
client.waitForReady(deadline, (err) => {
  if (err) {
    console.log(err);
    return;
  }

  onClientReady();
});

function onClientReady() {
  // client.PingPong({ message: "Ping" }, (err, res) => {
  //   if (err) {
  //     console.log(err);
  //     return;
  //   }

  //   console.log(res);
  // });

  // const stream = client.RandomNumbers({ maxVal: 85 });

  // stream.on("data", (chunk) => {
  //   console.log(chunk);
  // });

  // stream.on("end", () => {
  //   console.log("communication ended");
  // });

  const stream = client.TodoList((err, res) => {
    if (err) {
      console.log(err);
    }

    console.log(res);
  });

  stream.write({ todo: "walk the wife", status: "never" });
  stream.write({ todo: "walk the dog", status: "impossible" });
  stream.write({ todo: "Get a real job", status: "done" });
  stream.write({ todo: "Feed the cats", status: "never" });

  stream.end()
}
