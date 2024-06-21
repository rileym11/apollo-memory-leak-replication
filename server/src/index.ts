import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import express from "express";
import http from "http";
import cors from "cors";
import { PubSub, withFilter } from "graphql-subscriptions";
import { WebSocketServer } from "ws";
import { useServer } from "graphql-ws/lib/use/ws";
import { makeExecutableSchema } from "@graphql-tools/schema";

const pubsub = new PubSub();

interface MyContext {
  token?: String;
}

const comments = [{ id: 1, name: "Comment 1" }];

const post = {
  id: 1,
  name: "A post",
  comments,
};

const typeDefs = `#graphql
    type Post {
        id: Int!
        name: String!
        comments: [Comment!]!
    }
    type Comment {
        id: Int!
        name: String!
    }
    type Query {
        getPost(id: Int!): Post
    }
    type Mutation {
        createComment: Comment
    }
    type Subscription {
        newComment(postId: Int!): Comment
    }

`;

const resolvers = {
  Query: {
    getPost: () => post,
  },
  Mutation: {
    createComment: () => {
      const newId = comments.length + 1;
      const newComment = {
        id: newId,
        name: `Comment ${newId}`,
      };

      comments.push(newComment);
      pubsub.publish("COMMENT_ADDED", newComment);

      return newComment;
    },
  },
  Subscription: {
    newComment: {
      resolve: (payload: (typeof comments)[0]) => payload,
      subscribe: withFilter(
        () => {
          return pubsub.asyncIterator("COMMENT_ADDED");
        },
        (payload, variables) => {
          if (!variables?.postId || !payload) {
            return false;
          }
          return post.id === variables.postId;
        }
      ),
    },
  },
};

(async function () {
  const schema = makeExecutableSchema({ typeDefs, resolvers });

  const app = express();
  const httpServer = http.createServer(app);
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: "/subscriptions",
  });
  const wsServerCleanup = useServer({ schema }, wsServer);
  const server = new ApolloServer<MyContext>({
    schema,
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await wsServerCleanup.dispose();
            },
          };
        },
      },
    ],
  });

  await server.start();

  app.use(
    "/",
    cors<cors.CorsRequest>(),
    express.json(),
    expressMiddleware(server)
  );

  await new Promise<void>((resolve) =>
    httpServer.listen({ port: 4000 }, resolve)
  );
  console.log(`🚀 Server ready at http://localhost:4000/`);
})();
