import path from "path";
import * as grpc from "@grpc/grpc-js";
import * as grpcProtoLoader from "@grpc/proto-loader";

import { ProtoGrpcType } from "./proto/random";
import { RandomHandlers } from "./proto/randomPackage/Random";
import { TodoResponse } from "./proto/randomPackage/TodoResponse";
import { ChatRequest } from "./proto/randomPackage/ChatRequest";
import { ChatResponse } from "./proto/randomPackage/ChatResponse";

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
const calObjByUsername = new Map<
  string,
  grpc.ServerDuplexStream<ChatRequest, ChatResponse>
>();

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

    Chat: (call) => {
      call.on("data", (req) => {
        const username = call.metadata.get("username")[0] as string;
        const message = req.message;
        console.log(req);

        for (let [user, usersCall] of calObjByUsername) {
          if (username !== user) {
            usersCall.write({ username, message });
          }
        }

        if (calObjByUsername.get(username) === undefined) {
          calObjByUsername.set(username, call);
        }
      });

      call.on("end", () => {
        const username = call.metadata.get("username")[0] as string;
        calObjByUsername.delete(username);
        console.log(`${username} is ending their chat session`);
        call.write({
          username: "Server",
          message: `See you later ${username}`,
        });

        call.end();
      });
    },
  } as RandomHandlers);

  return server;
};

main();
