import path from "path";
import * as grpc from "@grpc/grpc-js";
import * as grpcProtoLoader from "@grpc/proto-loader";

import { ProtoGrpcType } from "./proto/random";
import { RandomHandlers } from "./proto/randomPackage/Random";
import { TodoResponse } from "./proto/randomPackage/TodoResponse";

const port = 8092;
const PROTO_FILE = "./proto/random.proto";

const packageDefinition = grpcProtoLoader.loadSync(
  path.resolve(__dirname, PROTO_FILE)
);

const grpcObj = grpc.loadPackageDefinition(
  packageDefinition
) as unknown as ProtoGrpcType;

const randomPackage = grpcObj.randomPackage;

const main = () => {
  const server = getServer();
  server.bindAsync(
    `0.0.0.0:${port}`,
    grpc.ServerCredentials.createInsecure(),
    (err, port) => {
      if (err) {
        console.log(err);
        throw new Error();
      }

      console.log(`Your server has started on port ${port}`);
    }
  );
};

let todoList: TodoResponse = { todos: [] };
const getServer = () => {
  const server = new grpc.Server();

  // pass in server, and handlers
  server.addService(randomPackage.Random.service, {
    PingPong: (req, res) => {
      console.log(req.request);
      res(null, { message: "Pong" });
    },
    RandomNumbers: (call) => {
      const { maxVal } = call.request;

      let runCount: number;

      const id = setInterval(() => {
        runCount = ++runCount;

        call.write({ num: Math.floor(Math.random() * maxVal) });

        if (runCount >= 10) {
          clearInterval(id);

          call.end();
        }
      }, 500);
    },
    TodoList: (call, callback) => {
      call.on("data", (chunk) => {
        todoList.todos?.push(chunk);
        console.log(chunk);
      });

      call.on("end", () => {
        callback(null, {
          todos: todoList.todos,
        });
      });
    },
  } as RandomHandlers);

  return server;
};

main();
